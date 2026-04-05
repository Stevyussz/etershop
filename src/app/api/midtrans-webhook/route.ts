/**
 * @file src/app/api/midtrans-webhook/route.ts
 * @description Webhook handler for Midtrans payment status notifications.
 *
 * This is the critical bridge between payment confirmation and product delivery.
 *
 * Security:
 * - Every webhook is verified with SHA-512(order_id + status_code + gross_amount + serverKey).
 * - Requests with invalid signatures are rejected with 403.
 *
 * Delivery Flow (on successful payment):
 * 1. Verify Midtrans signature.
 * 2. Idempotency check — skip if already SUCCESS or FAILED.
 * 3. Mark transaction as PAID.
 * 4. Call Digiflazz API to execute the topup (with 3x retry).
 * 5. Handle all 3 Digiflazz status: "Sukses" → SUCCESS, "Gagal" → FAILED, "Pending" → PAID (await webhook).
 * 6. Store the SN / error message.
 *
 * Digiflazz Status Reference:
 * - "Sukses"  → Topup delivered, save SN, mark SUCCESS.
 * - "Gagal"   → Topup failed (wrong ID, product issue), mark FAILED.
 * - "Pending" → Digiflazz is still processing (common for some operators).
 *               Leave as PAID — Digiflazz will notify us again via their own callback OR
 *               admin must check manually. Do NOT mark as SUCCESS prematurely.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { executeDigiflazzTopup } from "@/lib/digiflazz";
import { triggerAutoRefund } from "@/lib/midtrans-refund";

// Health check — prevents 405 when the URL is opened in a browser or pinged by monitoring tools
export async function GET() {
  return NextResponse.json({
    status: "Active",
    message: "EterShop Midtrans Webhook is alive. Listening for POST payment notifications.",
  }, { status: 200 });
}

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

    // ── Security: Verify Midtrans Signature ──────────────────────
    // SHA-512(order_id + status_code + gross_amount + serverKey)
    const expectedSignature = crypto
      .createHash("sha512")
      .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
      .digest("hex");

    if (signature_key !== expectedSignature) {
      console.warn(`[Webhook] ⚠️  INVALID SIGNATURE for order ${orderId} — possible spoofing.`);
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    // ── Idempotency Check ─────────────────────────────────────────
    const transaction = await prisma.topupTransaction.findUnique({
      where: { orderId: order_id },
    });

    if (!transaction) {
      console.warn(`[Webhook] Unknown orderId: ${orderId}`);
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    // Already fully resolved — don't re-process (prevents double topup)
    if (transaction.status === "SUCCESS" || transaction.status === "FAILED") {
      console.log(`[Webhook] Order ${orderId} already resolved (${transaction.status}). Skipping.`);
      return NextResponse.json({ message: "Already processed" }, { status: 200 });
    }

    // ── Handle Payment Outcomes ───────────────────────────────────

    if (transaction_status === "settlement" || transaction_status === "capture") {
      // ── PAYMENT CONFIRMED → Execute Delivery ──────────────────

      // Step 1: Mark PAID immediately so we track that money was received,
      // even if the Digiflazz call below fails unexpectedly.
      await prisma.topupTransaction.update({
        where: { orderId: order_id },
        data: { status: "PAID" },
      });
      console.log(`[Webhook] ✅ Order ${orderId} — PAID. Starting Digiflazz topup...`);

      // Step 2: Build the Digiflazz customer number.
      // - Mobile Legends / Magic Chess / Arena of Valor: gameId + zoneId (concatenated, no separator)
      // - All other games: gameId only
      const customerNo = transaction.zoneId
        ? `${transaction.gameId}${transaction.zoneId}`
        : transaction.gameId;

      // Step 3: Call Digiflazz with retry logic
      let finalStatus: "SUCCESS" | "FAILED" | "PAID" = "FAILED";
      let digiflazzNote = "No response from Digiflazz";

      try {
        const result = await executeDigiflazzTopup(
          transaction.sku,
          customerNo,
          transaction.orderId
        );

        const resultData = result?.data;
        const digiStatus = resultData?.status;

        if (digiStatus === "Sukses") {
          // Delivered — save the SN as proof of delivery
          finalStatus = "SUCCESS";
          digiflazzNote = resultData?.sn
            ? `SN: ${resultData.sn}`
            : resultData?.message || "Topup berhasil";
          console.log(`[Webhook] ✅ Order ${orderId} → SUCCESS. SN: ${resultData?.sn}`);

          // Increment voucher usedCount if one was applied to this transaction
          if (transaction.voucherId) {
            try {
              await prisma.voucher.update({
                where: { id: transaction.voucherId },
                data: { usedCount: { increment: 1 } },
              });
              console.log(`[Webhook] 🎟️  Voucher ${transaction.voucherId} usedCount incremented.`);
            } catch (vErr) {
              // Non-fatal — log but don't block the delivery confirmation
              console.error(`[Webhook] Failed to increment voucher count:`, vErr);
            }
          }

        } else if (digiStatus === "Pending") {
          // Digiflazz still processing — leave as PAID (NOT success yet)
          // We keep the status as PAID and save the note.
          // Digiflazz will push another callback when it resolves.
          finalStatus = "PAID";
          digiflazzNote = resultData?.message || "Sedang diproses oleh Digiflazz";
          console.log(`[Webhook] ⏳ Order ${orderId} → PENDING at Digiflazz. Waiting for resolution.`);

        } else {
          // "Gagal" or any unexpected status
          finalStatus = "FAILED";
          digiflazzNote = resultData?.message || `Topup gagal (status: ${digiStatus})`;
          console.warn(`[Webhook] ❌ Order ${orderId} → FAILED. Reason: ${digiflazzNote}`);
        }

      } catch (digiErr: any) {
        // Network error even after retries — mark FAILED, admin must refund manually
        finalStatus = "FAILED";
        digiflazzNote = `Digiflazz unreachable after retries: ${digiErr?.message}`;
        console.error(`[Webhook] ❌ Order ${orderId} Digiflazz error:`, digiErr?.message);
      }

      // Step 4: Persist the final status and SN
      await prisma.topupTransaction.update({
        where: { orderId: order_id },
        data: { status: finalStatus, digiflazzNote },
      });

      // Step 5: Auto-Refund if topup FAILED and customer already paid
      // We fire-and-forget since the refund is tracked separately in refundStatus
      if (finalStatus === "FAILED") {
        const transactionPrice = transaction.price;
        console.log(`[Webhook] 💸 Triggering auto-refund for failed order ${orderId}. Amount: Rp ${transactionPrice}`);
        // Non-blocking: don't await so we return 200 to Midtrans immediately
        triggerAutoRefund(orderId, transactionPrice).catch((err) =>
          console.error(`[Webhook] Auto-refund error for ${orderId}:`, err)
        );
      }

      console.log(`[Webhook] ✅ Fulfillment completed for order ${orderId}. Final Status: ${finalStatus}.`);
      return NextResponse.json({ message: `Topup ${finalStatus}` }, { status: 200 });

    } else if (["cancel", "expire", "deny"].includes(transaction_status)) {
      // ── PAYMENT CANCELLED/EXPIRED ──────────────────────────────
      await prisma.topupTransaction.update({
        where: { orderId: order_id },
        data: {
          status: "FAILED",
          digiflazzNote: `Pembayaran ${transaction_status} oleh Midtrans`,
        },
      });
      console.log(`[Webhook] 🚫 Order ${orderId} payment ${transaction_status} → FAILED.`);
      return NextResponse.json({ message: "Payment canceled" }, { status: 200 });

    } else {
      // Other statuses like "pending" from Midtrans — acknowledgement only
      console.log(`[Webhook] ℹ️  Order ${orderId} status: ${transaction_status}. No action taken.`);
      return NextResponse.json({ message: "Acknowledged" }, { status: 200 });
    }

  } catch (error) {
    console.error(`[Webhook] 🔥 CRITICAL ERROR for order ${orderId}:`, error);
    // Always return 200 to prevent Midtrans from retrying aggressively
    return NextResponse.json({ error: "Internal error" }, { status: 200 });
  }
}
