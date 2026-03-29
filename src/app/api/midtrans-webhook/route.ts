/**
 * @file src/app/api/midtrans-webhook/route.ts
 * @description Webhook handler for Midtrans payment status notifications.
 *
 * This is the critical bridge between payment confirmation and product delivery.
 *
 * Security: Every incoming webhook is verified using Midtrans's SHA-512 signature
 * scheme. Requests with invalid signatures are rejected immediately.
 *
 * Delivery Flow (on successful payment):
 * 1. Verify Midtrans signature.
 * 2. Find the pending transaction in our database.
 * 3. Mark it as PAID.
 * 4. Call Digiflazz API to execute the topup.
 * 5. Update the transaction status to SUCCESS or FAILED based on Digiflazz response.
 * 6. Store the Digiflazz SN (Serial Number) for admin visibility.
 *
 * Idempotency: If a webhook arrives for an already-processed transaction,
 * we return 200 OK without re-processing to avoid double-delivery.
 *
 * Reference: https://docs.midtrans.com/docs/post-notification-http
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { executeDigiflazzTopup } from "@/lib/digiflazz";

export async function POST(req: NextRequest) {
  let orderId = "UNKNOWN";

  try {
    const payload = await req.json();
    const serverKey = process.env.MIDTRANS_SERVER_KEY || "";

    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
    } = payload;

    orderId = order_id ?? "UNKNOWN";

    // ── Security: Verify Midtrans Signature ──────────────
    // Midtrans signs each notification with SHA-512(order_id + status_code + gross_amount + serverKey).
    // Any mismatch means the request did not come from Midtrans.
    const expectedSignature = crypto
      .createHash("sha512")
      .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
      .digest("hex");

    if (signature_key !== expectedSignature) {
      console.warn(`[Webhook] Invalid signature for order ${orderId}. Possible spoofing attempt.`);
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    // ── Idempotency Check ─────────────────────────────────
    const transaction = await prisma.topupTransaction.findUnique({
      where: { orderId: order_id },
    });

    if (!transaction) {
      console.warn(`[Webhook] Received notification for unknown orderId: ${orderId}`);
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    // Prevent duplicate processing — if already fully resolved, acknowledge and stop.
    if (transaction.status === "SUCCESS" || transaction.status === "FAILED") {
      console.log(`[Webhook] Order ${orderId} already processed (status: ${transaction.status}). Skipping.`);
      return NextResponse.json({ message: "Already processed" }, { status: 200 });
    }

    // ── Handle Payment Outcomes ───────────────────────────

    if (transaction_status === "settlement" || transaction_status === "capture") {
      // ── Payment Confirmed → Execute Product Delivery ──

      // Step 1: Mark as PAID so we know payment was received even if delivery fails
      await prisma.topupTransaction.update({
        where: { orderId: order_id },
        data: { status: "PAID" },
      });
      console.log(`[Webhook] Order ${orderId} marked as PAID. Initiating Digiflazz topup.`);

      // Step 2: Build the customer number for Digiflazz
      // For Mobile Legends and similar games: customerNo = gameId + zoneId (no separator)
      // For most other games: customerNo = gameId alone
      const customerNo = transaction.zoneId
        ? `${transaction.gameId}${transaction.zoneId}`
        : transaction.gameId;

      // Step 3: Execute the Digiflazz topup (has built-in retry logic)
      const digiflazzResult = await executeDigiflazzTopup(
        transaction.sku,
        customerNo,
        transaction.orderId
      );

      const resultData = digiflazzResult?.data;
      const finalStatus = resultData?.status === "Gagal" ? "FAILED" : "SUCCESS";
      // SN (Serial Number) is the proof of delivery from Digiflazz
      const digiflazzNote = resultData?.sn || resultData?.message || "No details provided";

      await prisma.topupTransaction.update({
        where: { orderId: order_id },
        data: { status: finalStatus, digiflazzNote },
      });

      console.log(`[Webhook] Order ${orderId} delivery result: ${finalStatus}. SN/Note: ${digiflazzNote}`);

      return NextResponse.json({ message: `Topup ${finalStatus}` }, { status: 200 });

    } else if (["cancel", "expire", "deny"].includes(transaction_status)) {
      // ── Payment Cancelled/Expired → Mark as Failed ────
      await prisma.topupTransaction.update({
        where: { orderId: order_id },
        data: {
          status: "FAILED",
          digiflazzNote: `Payment ${transaction_status} by Midtrans`,
        },
      });
      console.log(`[Webhook] Order ${orderId} payment ${transaction_status}. Marked as FAILED.`);
      return NextResponse.json({ message: "Payment failed/canceled" }, { status: 200 });

    } else {
      // ── Other statuses (e.g., "pending") → No action needed ──
      console.log(`[Webhook] Order ${orderId} has unhandled status: ${transaction_status}. No action taken.`);
      return NextResponse.json({ message: "Status acknowledged, no action taken" }, { status: 200 });
    }
  } catch (error) {
    // This should NOT happen in normal operation. If it does, it's a code bug.
    console.error(`[Webhook] CRITICAL ERROR for order ${orderId}:`, error);
    // Return 200 to prevent Midtrans from retrying the webhook excessively
    return NextResponse.json({ error: "Internal processing error" }, { status: 200 });
  }
}
