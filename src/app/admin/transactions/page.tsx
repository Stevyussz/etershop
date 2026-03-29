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
  // Fetch all transactions and compute stats in parallel
  const [transactions, stats] = await Promise.all([
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

  // Compute summary stats from the groupBy result
  const successStat = stats.find((s) => s.status === "SUCCESS");
  const pendingStat = stats.find((s) => s.status === "PENDING");
  const failedStat = stats.find((s) => s.status === "FAILED");
  const paidStat = stats.find((s) => s.status === "PAID");

  const summaryStats = {
    totalRevenue: successStat?._sum?.price ?? 0,
    successCount: successStat?._count?.id ?? 0,
    pendingCount: (pendingStat?._count?.id ?? 0) + (paidStat?._count?.id ?? 0),
    failedCount: failedStat?._count?.id ?? 0,
    totalCount: transactions.length,
    revenueFormatted: formatRupiah(successStat?._sum?.price ?? 0),
  };

  return (
    <TransactionsClient
      transactions={transactions as any}
      stats={summaryStats}
    />
  );
}
