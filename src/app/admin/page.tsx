/**
 * @file src/app/admin/page.tsx
 * @description Admin Dashboard Overview Page (Server Component).
 *
 * Renders:
 * - Real-time financial KPI cards
 * - Digiflazz live balance + connection status
 * - 7-day revenue mini chart (pure SVG, no extra dependencies)
 * - Top selling products by revenue
 * - Recent transactions table
 *
 * All data fetched in parallel with Promise.all for maximum performance.
 */

import prisma from "@/lib/prisma";
import { getDigiflazzBalance } from "@/lib/digiflazz";
import { formatRupiah } from "@/lib/utils";
import MiniBarChart from "./MiniBarChart";

export const dynamic = "force-dynamic"; // Always render at request time (hits DB + Digiflazz API)
import {
  DollarSign, TrendingUp, CheckCircle2, Clock,
  Wallet, Receipt, RefreshCcw, Package, AlertTriangle, BarChart2
} from "lucide-react";

// ─────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────

export default async function AdminOverview() {
  // Build date range for last 7 days
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [statsSuccess, statsAll, totalOrders, pendingOrders, activeProducts, recentOrders, digiflazzBalance, last7DaysTx, topProducts] =
    await Promise.all([
      // Revenue from successful transactions
      prisma.topupTransaction.aggregate({
        _sum: { price: true, cost: true },
        where: { status: "SUCCESS" },
      }),
      // Count of all statuses
      prisma.topupTransaction.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      prisma.topupTransaction.count({ where: { status: "SUCCESS" } }),
      prisma.topupTransaction.count({ where: { status: { in: ["PENDING", "PAID"] } } }),
      prisma.topupProduct.count({ where: { isActive: true } }),
      // Last 6 transactions for the table
      prisma.topupTransaction.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
      getDigiflazzBalance(),
      // Last 7 days of successful transactions for the chart
      prisma.topupTransaction.findMany({
        where: { status: "SUCCESS", createdAt: { gte: sevenDaysAgo } },
        select: { price: true, createdAt: true },
      }),
      // Top 5 products by revenue
      prisma.topupTransaction.groupBy({
        by: ["productName"],
        where: { status: "SUCCESS" },
        _sum: { price: true },
        _count: { id: true },
        orderBy: { _sum: { price: "desc" } },
        take: 5,
      }),
    ]);

  const totalRevenue = statsSuccess._sum?.price ?? 0;
  const totalCost = statsSuccess._sum?.cost ?? 0;
  const netProfit = totalRevenue - totalCost;
  const failedCount = statsAll.find((s) => s.status === "FAILED")?._count?.id ?? 0;
  const isDigiflazzOnline = digiflazzBalance !== null;

  // Build 7-day chart data
  const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sevenDaysAgo);
    d.setDate(sevenDaysAgo.getDate() + i);
    const dayRevenue = last7DaysTx
      .filter((t) => {
        const td = new Date(t.createdAt);
        return td.toDateString() === d.toDateString();
      })
      .reduce((sum, t) => sum + t.price, 0);
    return { label: DAYS[d.getDay()], value: dayRevenue };
  });

  return (
    <div className="space-y-8">
      {/* ── Top bar: Title + Digiflazz Status ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-white">Ikhtisar</h2>
          <p className="text-slate-500 font-medium">Monitoring performa EterShop secara real-time.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {isDigiflazzOnline && (
            <div className="bg-[#111823] border border-white/5 rounded-2xl p-4 flex items-center gap-4 shadow-xl">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-0.5">Saldo Digiflazz</p>
                <p className="text-lg font-black text-white">{formatRupiah(digiflazzBalance!)}</p>
              </div>
            </div>
          )}
          <div className="bg-[#111823] border border-white/5 rounded-2xl px-4 py-3 flex items-center gap-2.5 shadow-lg">
            <div className={`w-2.5 h-2.5 rounded-full ${isDigiflazzOnline ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-rose-500"}`} />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              {isDigiflazzOnline ? "Digiflazz Online" : "Digiflazz Offline"}
            </span>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Pendapatan", value: formatRupiah(totalRevenue), icon: DollarSign, color: "blue", sub: "Omzet kotor sukses" },
          { label: "Estimasi Laba Bersih", value: formatRupiah(netProfit), icon: TrendingUp, color: "emerald", sub: "Pendapatan − Modal" },
          { label: "Order Berhasil", value: totalOrders.toLocaleString("id-ID"), icon: CheckCircle2, color: "blue", sub: "Transaksi riil" },
          { label: "Perlu Perhatian", value: (pendingOrders + failedCount).toLocaleString("id-ID"), icon: AlertTriangle, color: "yellow", sub: `${pendingOrders} pending, ${failedCount} gagal` },
        ].map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label} className={`bg-[#111823] border border-white/5 rounded-2xl p-5 shadow-xl relative overflow-hidden group`}>
            <div className={`absolute top-3 right-3 w-9 h-9 rounded-xl bg-${color}-500/10 flex items-center justify-center`}>
              <Icon className={`w-5 h-5 text-${color}-400`} />
            </div>
            <p className="text-slate-400 text-xs font-bold mb-1 pr-10">{label}</p>
            <h3 className="text-xl font-black text-white leading-tight">{value}</h3>
            <p className="text-[10px] text-slate-600 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Chart + Top Products ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* 7-Day Revenue Chart */}
        <div className="lg:col-span-3 bg-[#111823] border border-white/5 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-emerald-400" /> Pendapatan 7 Hari
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Hanya dari transaksi yang berhasil.</p>
            </div>
            <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              +{formatRupiah(chartData.reduce((s, d) => s + d.value, 0))}
            </span>
          </div>
          <MiniBarChart data={chartData} />
        </div>

        {/* Top Products */}
        <div className="lg:col-span-2 bg-[#111823] border border-white/5 rounded-3xl p-6 shadow-xl">
          <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-blue-400" /> Produk Terlaris
          </h3>
          {topProducts.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">Belum ada data penjualan.</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={p.productName} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-white/5 text-slate-400 text-xs font-black flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-bold truncate leading-tight">{p.productName}</p>
                    <p className="text-xs text-slate-500">{p._count.id}× terjual</p>
                  </div>
                  <span className="text-emerald-400 font-bold text-xs shrink-0">
                    {formatRupiah(p._sum?.price ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Transactions ── */}
      <div className="bg-[#111823] border border-white/5 rounded-3xl p-6 md:p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-500" /> Transaksi Terbaru
          </h3>
          <a
            href="/admin/transactions"
            className="text-blue-400 hover:text-white text-sm font-bold px-3 py-1.5 bg-blue-500/10 rounded-lg transition-colors border border-blue-500/20 hover:border-blue-500/50"
          >
            Lihat Semua →
          </a>
        </div>

        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-white/5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-3">Order ID</th>
                <th className="py-3 px-3">Item</th>
                <th className="py-3 px-3 text-right">Harga</th>
                <th className="py-3 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-white/[0.03]">
              {recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-white/[0.03] transition-colors group">
                  <td className="py-3.5 px-3 text-slate-400 font-mono text-xs">{order.orderId}</td>
                  <td className="py-3.5 px-3">
                    <span className="text-white font-bold block leading-tight group-hover:text-blue-400 transition-colors text-sm">
                      {order.productName}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {order.gameId}{order.zoneId ? ` (${order.zoneId})` : ""}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-right font-bold text-white">
                    {formatRupiah(order.price)}
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    {order.status === "SUCCESS" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-md">
                        <CheckCircle2 className="w-3 h-3" /> Sukses
                      </span>
                    ) : order.status === "PENDING" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-1 rounded-md">
                        <Clock className="w-3 h-3" /> Pending
                      </span>
                    ) : order.status === "PAID" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-md">
                        <RefreshCcw className="w-3 h-3 animate-spin" /> Proses
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-md">
                        <AlertTriangle className="w-3 h-3" /> Gagal
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-500">
                    Belum ada transaksi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
