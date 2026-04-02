/**
 * @file src/app/api/check-payment-status/route.ts
 * @description Active payment status checker — the critical fallback for when
 * the Midtrans webhook has not yet arrived (latency, retry delays, etc.).
 *
 * This endpoint is polled by:
 * 1. The CheckoutClient overlay (after onSuccess fires from Snap) — to wait
 *    until the DB is no longer PENDING before redirecting to success page.
 * 2. The StatusPoller on the success page — to actively detect when the
 *    webhook has updated the transaction status.
 *
 * Logic:
 * 1. Read the current status from DB.
 * 2. If already resolved (SUCCESS/FAILED), return immediately.
 * 3. If still PENDING or PAID, call the Midtrans "get transaction status" API.
 * 4. If Midtrans confirms settlement/capture but DB is still PENDING,
 *    trigger fulfillment immediately (acts as a self-healing webhook).
 * 5. Return the latest DB status.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { executeDigiflazzTopup } from "@/lib/digiflazz";

// Never cache this route — it must always read live data from the DB
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("order_id");

  if (!orderId) {
    return NextResponse.json({ error: "Missing order_id" }, { status: 400 });
  }

  try {
    // ── Step 1: Read current state from DB ───────────────────────────────
    const transaction = await prisma.topupTransaction.findUnique({
      where: { orderId },
      select: {
        orderId: true,
        status: true,
        sku: true,
        gameId: true,
        zoneId: true,
        voucherId: true,
        digiflazzNote: true,
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    // ── Step 2: Already resolved or processing — return fast ───────────────────────────
    if (transaction.status === "SUCCESS" || transaction.status === "FAILED" || transaction.status === "PAID") {
      return NextResponse.json({ status: transaction.status, note: transaction.digiflazzNote });
    }

    // ── Step 3: Still PENDING/PAID → Ask Midtrans directly ──────────────
    const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
    const isProd = process.env.MIDTRANS_IS_PRODUCTION === "true";
    const midtransBaseUrl = isProd
      ? `https://api.midtrans.com/v2/${orderId}/status`
      : `https://api.sandbox.midtrans.com/v2/${orderId}/status`;

    const authString = Buffer.from(`${serverKey}:`).toString("base64");

    let midtransStatus: string | null = null;
    let midtransStatusCode: string | null = null;
    let midtransGrossAmount: string | null = null;

    try {
      const midtransRes = await fetch(midtransBaseUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Basic ${authString}`,
        },
      });

      if (midtransRes.ok) {
        const midtransData = await midtransRes.json() as any;
        midtransStatus = midtransData.transaction_status;
        midtransStatusCode = midtransData.status_code;
        midtransGrossAmount = midtransData.gross_amount;

        console.log(`[CheckPaymentStatus] Midtrans reports order ${orderId} as: ${midtransStatus}`);
      }
    } catch (midtransErr: any) {
      console.warn(`[CheckPaymentStatus] Could not reach Midtrans for ${orderId}:`, midtransErr?.message);
      // Fall through — return current DB status
    }

    // ── Step 4: Self-healing if Midtrans says paid but DB still PENDING ──
    // This handles the case where the webhook was delayed or missed entirely.
    if (
      (midtransStatus === "settlement" || midtransStatus === "capture") &&
      transaction.status === "PENDING"
    ) {
      console.log(`[CheckPaymentStatus] 🔧 Self-healing: Midtrans confirmed ${orderId} but DB is PENDING. Triggering fulfillment...`);

      // ── ATOMIC LOCK: Only proceed if we are the one who changes PENDING → PAID ──
      // This prevents a race condition if the Midtrans webhook arrives at the same time.
      // updateMany with a conditional WHERE clause is atomic — only one call wins.
      const lockResult = await prisma.topupTransaction.updateMany({
        where: { orderId, status: "PENDING" }, // ← Only update if STILL PENDING
        data: { status: "PAID" },
      });

      if (lockResult.count === 0) {
        // Another process (the webhook) already claimed this transaction — skip
        console.log(`[CheckPaymentStatus] ⏭️  Lock missed for ${orderId} — webhook already processing. Skipping.`);
        const latest = await prisma.topupTransaction.findUnique({ where: { orderId }, select: { status: true, digiflazzNote: true } });
        return NextResponse.json({ status: latest?.status ?? "PAID", note: latest?.digiflazzNote ?? null });
      }

      // We won the lock — safe to call Digiflazz
      const customerNo = transaction.zoneId
        ? `${transaction.gameId}${transaction.zoneId}`
        : transaction.gameId;

      let finalStatus: "SUCCESS" | "FAILED" | "PAID" = "PAID";
      let digiflazzNote = "Self-healed — no webhook received";

      try {
        const result = await executeDigiflazzTopup(transaction.sku, customerNo, orderId);
        const resultData = result?.data;
        const digiStatus = resultData?.status;

        if (digiStatus === "Sukses") {
          finalStatus = "SUCCESS";
          digiflazzNote = resultData?.sn ? `SN: ${resultData.sn}` : resultData?.message || "Topup berhasil";
          console.log(`[CheckPaymentStatus] ✅ Self-healed ${orderId} → SUCCESS`);

          if (transaction.voucherId) {
            await prisma.voucher.update({
              where: { id: transaction.voucherId },
              data: { usedCount: { increment: 1 } },
            }).catch((e: Error) => console.error(`[CheckPaymentStatus] Voucher increment failed:`, e));
          }
        } else if (digiStatus === "Pending") {
          finalStatus = "PAID";
          digiflazzNote = resultData?.message || "Sedang diproses oleh Digiflazz";
          console.log(`[CheckPaymentStatus] ⏳ Self-healed ${orderId} → PAID (Digiflazz Pending)`);
        } else {
          finalStatus = "FAILED";
          digiflazzNote = resultData?.message || "Topup gagal";
        }
      } catch (digiErr: any) {
        finalStatus = "FAILED";
        digiflazzNote = `Digiflazz unreachable: ${digiErr?.message}`;
        console.error(`[CheckPaymentStatus] Digiflazz error for ${orderId}:`, digiErr?.message);
      }

      await prisma.topupTransaction.update({
        where: { orderId },
        data: { status: finalStatus, digiflazzNote },
      });

      return NextResponse.json({ status: finalStatus, note: digiflazzNote, selfHealed: true });
    }

    // ── Step 5: Return current DB status ─────────────────────────────────
    // Refresh from DB to get the latest status after any updates above
    const refreshed = await prisma.topupTransaction.findUnique({
      where: { orderId },
      select: { status: true, digiflazzNote: true },
    });

    return NextResponse.json({
      status: refreshed?.status ?? transaction.status,
      note: refreshed?.digiflazzNote ?? null,
      midtransStatus: midtransStatus ?? "unknown",
    });

  } catch (error) {
    console.error(`[CheckPaymentStatus] Error for order ${orderId}:`, error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
