/**
 * @file src/app/admin/transactions/page.tsx
 * @description Admin Transactions Page — server component wrapper.
 *
 * Fetches all transactions with stats, then delegates interactive filtering
 * to the client component (TransactionsClient) for instant UX without
 * full page reloads.
 */

import prisma from "@/lib/prisma";
import TransactionsClient from "./TransactionsClient";
import { formatRupiah } from "@/lib/utils";

export const dynamic = "force-dynamic"; // Always fresh data

export default async function AdminTransactionsPage() {
  let transactions: any[] = [];
  let summaryStats = {
    totalRevenue: 0,
    successCount: 0,
    pendingCount: 0,
    failedCount: 0,
    totalCount: 0,
    revenueFormatted: formatRupiah(0),
  };

  try {
    const [txs, stats] = await Promise.all([
      prisma.topupTransaction.findMany({
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
      prisma.topupTransaction.groupBy({
        by: ["status"],
        _count: { id: true },
        _sum: { price: true },
      }),
    ]);
    transactions = txs;
    const successStat = stats.find((s) => s.status === "SUCCESS");
    const pendingStat = stats.find((s) => s.status === "PENDING");
    const failedStat = stats.find((s) => s.status === "FAILED");
    const paidStat = stats.find((s) => s.status === "PAID");
    summaryStats = {
      totalRevenue: successStat?._sum?.price ?? 0,
      successCount: successStat?._count?.id ?? 0,
      pendingCount: (pendingStat?._count?.id ?? 0) + (paidStat?._count?.id ?? 0),
      failedCount: failedStat?._count?.id ?? 0,
      totalCount: txs.length,
      revenueFormatted: formatRupiah(successStat?._sum?.price ?? 0),
    };
  } catch {
    // DB unavailable
  }

  return (
    <TransactionsClient
      transactions={transactions as any}
      stats={summaryStats}
    />
  );
}
