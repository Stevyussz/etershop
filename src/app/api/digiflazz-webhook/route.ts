/**
 * @file src/app/api/digiflazz-webhook/route.ts
 * @description Webhook handler for asynchronous Digiflazz topup status updates.
 *
 * This handler is extremely critical for transactions that take a long time to
 * process at Digiflazz (e.g. MLBB Server high load, or Telco slow responses).
 * Without this, transactions that start as "Pending" will be stuck as "PAID"
 * forever in our system, even after Digiflazz successfully delivers the item.
 *
 * Flow:
 * 1. Verify Digiflazz signature: MD5(username + apikey + ref_id).
 * 2. Verify Headers (`x-digiflazz-event` === "update").
 * 3. Find transaction locally.
 * 4. Apply status (Sukses -> SUCCESS, Gagal -> FAILED).
 * 5. Safely increment `usedCount` on vouchers if transaction succeeds here.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { triggerAutoRefund } from "@/lib/midtrans-refund";

export async function GET() {
  return NextResponse.json({ 
    status: "Active", 
    message: "EterShop Digiflazz Webhook is alive and well. Listening for POST callbacks." 
  }, { status: 200 });
}

export async function POST(req: NextRequest) {
  try {
    // We MUST read the raw text for HMAC SHA1 signature verification
    const rawBodyText = await req.text();
    let rawBody;
    try {
      rawBody = JSON.parse(rawBodyText);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const headersList = req.headers;
    
    // 1. Initial Webhook Validation
    const eventType = headersList.get("x-digiflazz-event");
    if (eventType !== "update" && eventType !== "create") {
      // Ignored non-update events
      return NextResponse.json({ message: "Ignored event" }, { status: 200 });
    }

    // 2. Security: Verify Digiflazz Signature
    const webhookSecret = process.env.DIGIFLAZZ_WEBHOOK_SECRET;
    const headerSignature = headersList.get("x-hub-signature");

    if (webhookSecret && headerSignature) {
      // Official method: HMAC SHA1 of the entire raw payload
      const expectedHmac = crypto.createHmac("sha1", webhookSecret).update(rawBodyText).digest("hex");
      const expectedHeader = `sha1=${expectedHmac}`;

      if (headerSignature !== expectedHeader) {
        console.warn(`[DigiflazzWebhook] ⚠️ INVALID HMAC SIGNATURE for webhook. Expected ${expectedHeader}, got ${headerSignature}`);
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    } else {
      // Security fallback: If no webhook secret is configured, we cannot verify the HMAC signature.
      // However, to ensure frictionless setup, we will ALLOW the webhook payload, BUT we will mark a flag
      // to forcefully verify its truthfulness via the Digiflazz Check Status API later in the code.
      console.warn(`[DigiflazzWebhook] DIGIFLAZZ_WEBHOOK_SECRET is not set! Using active-verification fallback.`);
      // We do not reject it! We proceed to extract orderId and verify it securely.
    }

    // Extract payload data
    const payload = rawBody.data || rawBody;
    if (!payload || !payload.ref_id || !payload.status) {
      console.warn("[DigiflazzWebhook] Invalid payload format received or ping event");
      return NextResponse.json({ message: "Ping or Invalid format" }, { status: 200 });
    }

    const { ref_id, status, sn, message } = payload;
    const orderId = ref_id;

    // 3. Find Transaction Local Record
    const transaction = await prisma.topupTransaction.findUnique({
      where: { orderId },
    });

    if (!transaction) {
      console.warn(`[DigiflazzWebhook] Unknown orderId: ${orderId}`);
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    // Idempotency: Ignore if transaction is already resolved
    if (transaction.status === "SUCCESS" || transaction.status === "FAILED") {
      console.log(`[DigiflazzWebhook] Order ${orderId} already resolved (${transaction.status}). Skipping.`);
      return NextResponse.json({ message: "Already resolved" }, { status: 200 });
    }

    // --- ACTIVE VERIFICATION FOR UNTRUSTED WEBHOOKS ---
    let finalStatus: "SUCCESS" | "FAILED" | "PAID" = "PAID";
    let digiflazzNote = "Webhook Payload Processed";
    
    // Webhook variable re-assignment to allow active verification to override it
    let verifiedStatus = status; 
    let verifiedSn = sn;
    let verifiedMessage = message;

    if (!webhookSecret || !headerSignature) {
       console.log(`[DigiflazzWebhook] 🔍 Actively verifying untrusted webhook for ${orderId}...`);
       try {
         const { checkDigiflazzTransactionStatus } = await import("@/lib/digiflazz");
         const customerNo = transaction.zoneId ? `${transaction.gameId}${transaction.zoneId}` : transaction.gameId;
         const digiRes = await checkDigiflazzTransactionStatus(orderId, transaction.sku, customerNo);
         
         verifiedStatus = digiRes?.data?.status || "Pending";
         verifiedSn = digiRes?.data?.sn;
         verifiedMessage = digiRes?.data?.message;
         
         if (verifiedStatus !== "Sukses" && verifiedStatus !== "Gagal") {
             console.warn(`[DigiflazzWebhook] ⚠️ Verification failed! Digiflazz says order ${orderId} is still Pending.`);
             return NextResponse.json({ error: "Verification mismatch" }, { status: 400 });
         }
         console.log(`[DigiflazzWebhook] ✅ Active verification successful. Real status: ${verifiedStatus}`);
       } catch (err: any) {
         console.error(`[DigiflazzWebhook] ❌ Active verification error:`, err.message);
         // Do not process the webhook if we cannot verify it securely! Return 200 so it doesn't retry forever.
         return NextResponse.json({ error: "Verification service unavailable" }, { status: 200 });
       }
    }

    if (verifiedStatus === "Sukses") {
      finalStatus = "SUCCESS";
      digiflazzNote = verifiedSn ? `SN: ${verifiedSn}` : verifiedMessage || "Topup berhasil (Via Callback)";
      console.log(`[DigiflazzWebhook] ✅ Order ${orderId} → SUCCESS. SN: ${verifiedSn}`);

      // 5. [CRITICAL] VOUCHER INCREMENT
      // If the topup succeeds via callback, we MUST increment the voucher usage limit!
      if (transaction.voucherId) {
        try {
          await prisma.voucher.update({
            where: { id: transaction.voucherId },
            data: { usedCount: { increment: 1 } },
          });
          console.log(`[DigiflazzWebhook] 🎟️  Voucher ${transaction.voucherId} usedCount incremented via Callback.`);
        } catch (vErr) {
          console.error(`[DigiflazzWebhook] Failed to increment voucher count on order ${orderId}:`, vErr);
        }
      }

    } else if (verifiedStatus === "Gagal") {
      finalStatus = "FAILED";
      digiflazzNote = verifiedMessage || `Topup gagal (Digiflazz Callback)`;
      console.warn(`[DigiflazzWebhook] ❌ Order ${orderId} → FAILED. Reason: ${digiflazzNote}`);
    } else {
      // Still Pending or other intermediate states
      console.log(`[DigiflazzWebhook] ⏳ Order ${orderId} status unchanged: ${verifiedStatus}`);
      return NextResponse.json({ message: "Acknowledged - No Action" }, { status: 200 });
    }

    // 6. DB Persistence
    await prisma.topupTransaction.update({
      where: { orderId },
      data: { status: finalStatus, digiflazzNote },
    });

    // 7. Auto-Refund if topup FAILED via async callback
    // Only triggered when Digiflazz finally confirms failure after a "Pending" period.
    // The customer already paid Midtrans at this point, so refund is necessary.
    if (finalStatus === "FAILED") {
      const txForRefund = await prisma.topupTransaction.findUnique({
        where: { orderId },
        select: { price: true },
      });
      if (txForRefund) {
        console.log(`[DigiflazzWebhook] 💸 Triggering auto-refund for async-failed order ${orderId}. Amount: Rp ${txForRefund.price}`);
        // Non-blocking: return 200 to Digiflazz immediately, refund happens async
        triggerAutoRefund(orderId, txForRefund.price).catch((err) =>
          console.error(`[DigiflazzWebhook] Auto-refund error for ${orderId}:`, err)
        );
      }
    }

    return NextResponse.json({ message: `Transaction updated to ${finalStatus}` }, { status: 200 });

  } catch (error) {
    console.error(`[DigiflazzWebhook] 🔥 CRITICAL ERROR:`, error);
    // Respond with 200 to prevent Digiflazz from hammering retries maliciously
    return NextResponse.json({ error: "Internal error" }, { status: 200 });
  }
}
