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
      // Fallback/Legacy method (Not recommended, Digiflazz payload might not contain sign)
      console.warn(`[DigiflazzWebhook] DIGIFLAZZ_WEBHOOK_SECRET is not set. Falling back to legacy MD5 payload signature.`);
      const payloadSign = rawBody.data?.sign || rawBody.sign;
      if (!payloadSign) {
         // Without a secret and without a payload sign, we cannot securely verify. 
         // But since we have a self-healing mechanism, we can reject it to force self-healing,
         // or we can just accept it (dangerous). Let's reject it to ensure security.
         console.warn(`[DigiflazzWebhook] Payload missing 'sign' and no webhook secret configured. Rejecting.`);
         return NextResponse.json({ error: "Missing signature" }, { status: 403 });
      }

      const username = process.env.DIGIFLAZZ_USERNAME || "";
      const apiKey = process.env.DIGIFLAZZ_API_KEY || "";
      const refId = rawBody.data?.ref_id || rawBody.ref_id || "";

      const sigVariant1 = crypto.createHash("md5").update(username + apiKey + refId).digest("hex");
      const sigVariant2 = crypto.createHash("md5").update(username + apiKey + "cs").digest("hex");

      if (payloadSign !== sigVariant1 && payloadSign !== sigVariant2) {
        console.warn(`[DigiflazzWebhook] ⚠️ INVALID MD5 SIGNATURE (received: ${payloadSign}).`);
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
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

    // 4. Update Status based on webhook payload
    let finalStatus: "SUCCESS" | "FAILED" | "PAID" = "PAID";
    let digiflazzNote = "Webhook Payload Processed";

    if (status === "Sukses") {
      finalStatus = "SUCCESS";
      digiflazzNote = sn ? `SN: ${sn}` : message || "Topup berhasil (Via Callback)";
      console.log(`[DigiflazzWebhook] ✅ Order ${orderId} → SUCCESS. SN: ${sn}`);

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

    } else if (status === "Gagal") {
      finalStatus = "FAILED";
      digiflazzNote = message || `Topup gagal (Digiflazz Callback)`;
      console.warn(`[DigiflazzWebhook] ❌ Order ${orderId} → FAILED. Reason: ${digiflazzNote}`);
    } else {
      // Still Pending or other intermediate states
      console.log(`[DigiflazzWebhook] ⏳ Order ${orderId} status unchanged: ${status}`);
      return NextResponse.json({ message: "Acknowledged - No Action" }, { status: 200 });
    }

    // 6. DB Persistence
    await prisma.topupTransaction.update({
      where: { orderId },
      data: { status: finalStatus, digiflazzNote },
    });

    return NextResponse.json({ message: `Transaction updated to ${finalStatus}` }, { status: 200 });

  } catch (error) {
    console.error(`[DigiflazzWebhook] 🔥 CRITICAL ERROR:`, error);
    // Respond with 200 to prevent Digiflazz from hammering retries maliciously
    return NextResponse.json({ error: "Internal error" }, { status: 200 });
  }
}
