/**
 * @file src/app/api/admin/rescue-stuck/route.ts
 * @description Admin endpoint to auto-rescue transactions stuck in PAID state.
 *
 * A transaction can be stuck in PAID when:
 * - Digiflazz returned "Pending" on the first attempt and their callback never arrived.
 * - The Digiflazz webhook failed silently (signature mismatch, network issue).
 *
 * This endpoint:
 * 1. Finds all transactions with status = PAID older than 2 minutes.
 * 2. Calls Digiflazz's transaction status API for each one.
 * 3. Updates the DB based on the latest Digiflazz response.
 *
 * Can be called:
 * - Manually from admin dashboard
 * - Via a cron job (if available on your hosting)
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkDigiflazzTransactionStatus } from "@/lib/digiflazz";

// Simple admin guard — only allow requests with the admin secret
function isAuthorized(req: NextRequest): boolean {
  const token = req.headers.get("x-admin-secret") || req.nextUrl.searchParams.get("secret");
  const adminSecret = process.env.ADMIN_SECRET || process.env.MIDTRANS_SERVER_KEY || "";
  return token === adminSecret;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    // Find all transactions stuck in PAID state for more than 2 minutes
    const stuckTransactions = await prisma.topupTransaction.findMany({
      where: {
        status: "PAID",
        updatedAt: { lt: twoMinutesAgo },
      },
      select: {
        orderId: true,
        sku: true,
        gameId: true,
        zoneId: true,
        voucherId: true,
      },
    });

    if (stuckTransactions.length === 0) {
      return NextResponse.json({ message: "No stuck transactions found.", rescued: 0 });
    }

    console.log(`[RescueStuck] Found ${stuckTransactions.length} stuck transaction(s). Starting rescue...`);

    const results: { orderId: string; from: string; to: string; note?: string }[] = [];

    for (const tx of stuckTransactions) {
      try {
        const customerNo = tx.zoneId ? `${tx.gameId}${tx.zoneId}` : tx.gameId;

        const result = await checkDigiflazzTransactionStatus(tx.orderId, tx.sku, customerNo);
        const data = result?.data;
        const digiStatus = data?.status;

        let newStatus: "SUCCESS" | "FAILED" | "PAID" = "PAID";
        let note = "";

        if (digiStatus === "Sukses") {
          newStatus = "SUCCESS";
          note = data?.sn ? `SN: ${data.sn}` : data?.message || "Topup berhasil (Rescue)";

          // Increment voucher usage if applicable
          if (tx.voucherId) {
            await prisma.voucher.update({
              where: { id: tx.voucherId },
              data: { usedCount: { increment: 1 } },
            }).catch((e: Error) => console.error(`[RescueStuck] Voucher increment failed for ${tx.orderId}:`, e));
          }
        } else if (digiStatus === "Gagal") {
          newStatus = "FAILED";
          note = data?.message || "Topup gagal (Rescue)";
        } else {
          // Still Pending at Digiflazz — keep as PAID, update timestamp
          newStatus = "PAID";
          note = data?.message || "Masih diproses Digiflazz";
        }

        await prisma.topupTransaction.update({
          where: { orderId: tx.orderId },
          data: { status: newStatus, digiflazzNote: note },
        });

        console.log(`[RescueStuck] ✅ ${tx.orderId}: PAID → ${newStatus} (${note})`);
        results.push({ orderId: tx.orderId, from: "PAID", to: newStatus, note });

      } catch (txErr: any) {
        console.error(`[RescueStuck] Failed for ${tx.orderId}:`, txErr?.message);
        results.push({ orderId: tx.orderId, from: "PAID", to: "PAID", note: `Error: ${txErr?.message}` });
      }
    }

    return NextResponse.json({
      message: `Rescue complete. Processed ${results.length} transaction(s).`,
      rescued: results.filter(r => r.to !== "PAID").length,
      results,
    });

  } catch (error: any) {
    console.error("[RescueStuck] Critical error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// Also allow GET for easy browser/admin testing
export async function GET(req: NextRequest) {
  return POST(req);
}
