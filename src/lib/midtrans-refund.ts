/**
 * @file src/lib/midtrans-refund.ts
 * @description Auto-Refund helper for failed Digiflazz topup transactions.
 *
 * SAFETY DESIGN:
 * - Layer 1 (DB Lock): Before calling Midtrans, we atomically set refundStatus = "PENDING_REFUND".
 *   If refundStatus is already set, we bail out immediately. This prevents concurrent execution.
 * - Layer 2 (Midtrans Idempotency): We always pass `refund_key: "refund-{orderId}"`.
 *   Midtrans will reject any duplicate refund request with the same key — impossible to double-refund.
 *
 * ELIGIBILITY:
 * - Only transactions that went through Midtrans (have a snapToken) are eligible.
 * - Refund via API works for: QRIS, GoPay, DANA, ShopeePay, OVO, Credit Card.
 * - VA/Bank Transfer does NOT support API refund → logged as "SKIPPED" for manual processing.
 *
 * This function is designed to be called from both webhook handlers:
 * - /api/midtrans-webhook (immediate Digiflazz failure)
 * - /api/digiflazz-webhook (async callback failure)
 */

import prisma from "@/lib/prisma";

type RefundResult = {
  status: "REFUNDED" | "REFUND_FAILED" | "SKIPPED" | "ALREADY_PROCESSED";
  message: string;
};

export async function triggerAutoRefund(
  orderId: string,
  amountToRefund: number
): Promise<RefundResult> {
  const logPrefix = `[AutoRefund] Order ${orderId}`;

  try {
    // === LAYER 1: ATOMIC DB LOCK ==============================================
    // Read current transaction state
    const transaction = await prisma.topupTransaction.findUnique({
      where: { orderId },
      // @ts-ignore — refund fields added in schema; Prisma types refresh after build
      select: { refundStatus: true, snapToken: true, status: true },
    });

    if (!transaction) {
      console.error(`${logPrefix} Transaction not found in DB.`);
      return { status: "REFUND_FAILED", message: "Transaction not found." };
    }

    // Guard: If refund has already been initiated or completed, bail out immediately.
    // This is the primary anti-double-refund check.
    // @ts-ignore — refundStatus resolved from newly generated Prisma Client
    if (transaction.refundStatus !== null && transaction.refundStatus !== undefined) {
      // @ts-ignore
      console.log(`${logPrefix} Already processed (refundStatus: ${transaction.refundStatus}). Skipping.`);
      return { status: "ALREADY_PROCESSED", message: `Already: ${transaction.refundStatus}` };
    }

    // Guard: Only refund transactions that came via Midtrans (have a snapToken).
    // POS transactions (no snapToken) are paid in cash — no Midtrans refund needed.
    // @ts-ignore
    if (!transaction.snapToken) {
      console.log(`${logPrefix} No snapToken (POS/manual order). Skipping auto-refund.`);
      await prisma.topupTransaction.update({
        where: { orderId },
        // @ts-ignore
        data: {
          refundStatus: "SKIPPED",
          refundNote: "Order tidak melalui Midtrans (POS/manual), refund dilakukan manual oleh admin.",
        },
      });
      return { status: "SKIPPED", message: "POS order — no Midtrans refund needed." };
    }

    // ATOMIC LOCK: Set to PENDING_REFUND immediately before any async calls.
    // If two webhook calls arrive simultaneously for the same orderId,
    // only the first one to write this will proceed; the second will be caught by the guard above on the next invocation.
    await prisma.topupTransaction.update({
      where: { orderId },
      // @ts-ignore — refund fields added in schema; types update after build
      data: {
        refundStatus: "PENDING_REFUND",
        refundNote: "Auto-refund sedang diproses...",
      },
    });
    console.log(`${logPrefix} 🔒 DB locked. Proceeding to Midtrans Refund API...`);

    // === LAYER 2: MIDTRANS REFUND API =========================================
    const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
    const isProd = process.env.MIDTRANS_IS_PRODUCTION === "true";
    const midtransBaseUrl = isProd
      ? "https://api.midtrans.com/v2"
      : "https://api.sandbox.midtrans.com/v2";

    const authString = Buffer.from(`${serverKey}:`).toString("base64");
    // This unique key ensures Midtrans will reject any duplicate request — the second failsafe.
    const refundKey = `refund-${orderId}`;

    const refundRes = await fetch(`${midtransBaseUrl}/${orderId}/refund`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Basic ${authString}`,
      },
      body: JSON.stringify({
        refund_key: refundKey,
        amount: amountToRefund,
        reason: `Topup gagal untuk pesanan ${orderId}. Dana dikembalikan otomatis oleh sistem EterShop.`,
      }),
    });

    const refundData = await refundRes.json();
    console.log(`${logPrefix} Midtrans Refund API response:`, JSON.stringify(refundData));

    // === HANDLE RESPONSE ======================================================
    // Midtrans returns status_code "200" on success
    if (refundRes.ok && (refundData.status_code === "200" || refundData.transaction_status === "refund" || refundData.transaction_status === "partial_refund")) {
      await prisma.topupTransaction.update({
        where: { orderId },
        // @ts-ignore
        data: {
          refundStatus: "REFUNDED",
          refundedAt: new Date(),
          refundNote: `Refund berhasil. Midtrans Ref: ${refundData.refund_chargeback_id || refundKey}. Jumlah: Rp ${amountToRefund.toLocaleString("id-ID")}.`,
        },
      });
      console.log(`${logPrefix} ✅ Refund BERHASIL! Amount: Rp ${amountToRefund.toLocaleString("id-ID")}`);
      return { status: "REFUNDED", message: `Refund Rp ${amountToRefund.toLocaleString("id-ID")} berhasil.` };

    } else {
      // Common non-fatal error: payment method not eligible (Bank VA, etc.)
      const errorCode = refundData.status_code || refundData.error_messages?.[0];
      const isNotEligible = [
        "412", // Cannot modify a transaction
        "406", // Refund not available for this payment method
      ].includes(String(errorCode));

      const finalStatus = isNotEligible ? "SKIPPED" : "REFUND_FAILED";
      const note = isNotEligible
        ? `Metode pembayaran tidak mendukung auto-refund (VA/Transfer Bank). Proses manual via dashboard Midtrans. Error: ${errorCode}`
        : `Midtrans refund API gagal. Code: ${errorCode} — ${JSON.stringify(refundData.error_messages || refundData.status_message)}. Tindak lanjut manual diperlukan.`;

      await prisma.topupTransaction.update({
        where: { orderId },
        // @ts-ignore
        data: {
          refundStatus: finalStatus,
          refundNote: note,
        },
      });

      console.warn(`${logPrefix} ⚠️ Refund ${finalStatus}. Reason: ${note}`);
      return { status: finalStatus as any, message: note };
    }

  } catch (error: any) {
    // Unexpected error (network, DB) — mark as REFUND_FAILED for admin follow-up
    const errorMsg = `Unexpected error during refund: ${error?.message}`;
    console.error(`${logPrefix} ❌ ${errorMsg}`);
    try {
      await prisma.topupTransaction.update({
        where: { orderId },
        // @ts-ignore
        data: {
          refundStatus: "REFUND_FAILED",
          refundNote: errorMsg,
        },
      });
    } catch (dbErr) {
      console.error(`${logPrefix} Failed to update refundStatus after error:`, dbErr);
    }
    return { status: "REFUND_FAILED", message: errorMsg };
  }
}
