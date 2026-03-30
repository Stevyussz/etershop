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

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const headersList = req.headers;
    
    // 1. Initial Webhook Validation
    const eventType = headersList.get("x-digiflazz-event");
    if (eventType !== "update") {
      // Ignored non-update events
      return NextResponse.json({ message: "Ignored event" }, { status: 200 });
    }

    // Example payload shape based on Digiflazz docs:
    // {
    //   "data": {
    //     "ref_id": "TRX-1234",
    //     "status": "Sukses",
    //     "sn": "12345/SN",
    //     "message": "Topup sukses",
    //     "sign": "md5hash"
    //   }
    // }
    const payload = rawBody.data;
    if (!payload || !payload.ref_id || !payload.status) {
      return NextResponse.json({ error: "Invalid payload format" }, { status: 400 });
    }

    const { ref_id, status, sn, message, sign: signature_key } = payload;
    const orderId = ref_id;

    // 2. Security: Verify Digiflazz Signature
    const username = process.env.DIGIFLAZZ_USERNAME || "";
    const apiKey = process.env.DIGIFLAZZ_API_KEY || "";
    
    const expectedSignature = crypto
      .createHash("md5")
      .update(username + apiKey + orderId)
      .digest("hex");

    // Strictly compare signatures
    if (signature_key !== expectedSignature) {
      console.warn(`[DigiflazzWebhook] ⚠️  INVALID SIGNATURE for order ${orderId} — dropping payload.`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

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
