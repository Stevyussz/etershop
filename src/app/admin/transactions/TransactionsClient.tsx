/**
 * @file src/app/admin/transactions/TransactionsClient.tsx
 * @description Interactive client component for the Admin Transactions page.
 *
 * Features:
 * - Real-time search by Order ID, Game ID, or Product Name
 * - Status filter tabs (All, Success, Pending, Failed)
 * - Stats summary bar
 * - Export to CSV (real implementation)
 * - Hover-reveal for SN/Catatan column
 */

"use client";

import { useState, useMemo, useTransition } from "react";
import {
  Receipt, Search, FileDown, CheckCircle2, Clock,
  RefreshCcw, AlertTriangle, TrendingUp, X, DollarSign, Loader2, Wrench
} from "lucide-react";
import { formatRupiah, formatDate } from "@/lib/utils";
import { manualProcessOrder, failOrder } from "../actions";

type TransactionStatus = "ALL" | "SUCCESS" | "PENDING" | "PAID" | "FAILED";

interface Transaction {
  id: string;
  orderId: string;
  gameId: string;
  zoneId: string | null;
  productName: string;
  price: number;
  cost: number | null;
  status: string;
  digiflazzNote: string | null;
  refundStatus: string | null;
  refundNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface SummaryStats {
  totalRevenue: number;
  successCount: number;
  pendingCount: number;
  failedCount: number;
  totalCount: number;
  revenueFormatted: string;
}

interface Props {
  transactions: Transaction[];
  stats: SummaryStats;
}

const STATUS_TABS: { key: TransactionStatus; label: string; color: string }[] = [
  { key: "ALL", label: "Semua", color: "text-white" },
  { key: "SUCCESS", label: "Berhasil", color: "text-emerald-400" },
  { key: "PENDING", label: "Menunggu", color: "text-yellow-400" },
  { key: "PAID", label: "Diproses", color: "text-blue-400" },
  { key: "FAILED", label: "Gagal", color: "text-rose-400" },
];

function RefundBadge({ refundStatus, refundNote }: { refundStatus: string | null; refundNote?: string | null }) {
  if (!refundStatus) return <span className="text-slate-700 text-[10px]">—</span>;
  
  const cfg: Record<string, { cls: string; label: string; icon: string }> = {
    PENDING_REFUND:   { cls: "text-blue-400 bg-blue-500/10 border-blue-500/20",   label: "Proses Refund", icon: "🔵" },
    REFUNDED:         { cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", label: "Refunded ✓",   icon: "✅" },
    REFUND_FAILED:    { cls: "text-rose-400 bg-rose-500/10 border-rose-500/20",    label: "Refund Gagal", icon: "❌" },
    SKIPPED:          { cls: "text-slate-400 bg-slate-500/10 border-slate-500/20", label: "Manual",      icon: "⚠️" },
  };
  const s = cfg[refundStatus] ?? cfg["SKIPPED"];
  return (
    <div className="group/refund relative">
      <span className={`inline-flex items-center gap-1 text-[10px] font-bold border px-2 py-1 rounded-md cursor-help ${s.cls}`}>
        {s.icon} {s.label}
      </span>
      {refundNote && (
        <div className="absolute right-0 bottom-full mb-2 hidden group-hover/refund:block bg-[#0a0f16] border border-white/10 p-3 rounded-xl text-[10px] text-slate-300 z-50 min-w-[240px] max-w-[300px] shadow-2xl leading-relaxed">
          <p className="text-slate-500 font-bold uppercase text-[9px] mb-1">Refund Note</p>
          {refundNote}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    SUCCESS: { cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: <CheckCircle2 className="w-3 h-3" />, label: "Berhasil" },
    PENDING: { cls: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20", icon: <Clock className="w-3 h-3" />, label: "Menunggu" },
    PAID: { cls: "text-blue-400 bg-blue-500/10 border-blue-500/20", icon: <RefreshCcw className="w-3 h-3 animate-spin" />, label: "Diproses" },
    FAILED: { cls: "text-rose-400 bg-rose-500/10 border-rose-500/20", icon: <AlertTriangle className="w-3 h-3" />, label: "Gagal" },
  };
  const s = styles[status] ?? styles["FAILED"];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold border px-3 py-1.5 rounded-lg ${s.cls}`}>
      {s.icon} {s.label}
    </span>
  );
}

/**
 * Exports transactions to a downloadable CSV file.
 * Only exports the filtered (visible) rows.
 */
function exportToCSV(transactions: Transaction[]) {
  const headers = ["Order ID", "Tanggal", "Produk", "Game ID", "Zone ID", "Harga", "Modal", "Status", "SN/Catatan"];
  const rows = transactions.map((t) => [
    t.orderId,
    new Date(t.createdAt).toLocaleString("id-ID"),
    t.productName,
    t.gameId,
    t.zoneId ?? "",
    t.price,
    t.cost ?? 0,
    t.status,
    t.digiflazzNote ?? "",
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" }); // BOM for Excel
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `etershop-transaksi-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function TransactionsClient({ transactions, stats }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TransactionStatus>("ALL");
  const [isPending, startTransition] = useTransition();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleManualProcess = (orderId: string) => {
    if (!confirm(`Proses ulang transaksi ${orderId} secara manual ke Digiflazz? (Pastikan dana dari pelanggan sudah benar-benar masuk)`)) return;
    
    setProcessingId(orderId);
    startTransition(async () => {
      const res = await manualProcessOrder(orderId);
      alert(res.message);
      setProcessingId(null);
    });
  };

  const handleFailOrder = (orderId: string) => {
    if (!confirm(`Apakah Anda yakin ingin membatalkan/menggagalkan transaksi ${orderId}? Status akan berubah menjadi GAGAL.`)) return;
    
    setProcessingId(orderId);
    startTransition(async () => {
      const res = await failOrder(orderId);
      alert(res.message);
      setProcessingId(null);
    });
  };

  /** Apply search + status filter, memoized for performance */
  const filtered = useMemo(() => {
    let result = transactions;

    if (statusFilter !== "ALL") {
      result = result.filter((t) => t.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.orderId.toLowerCase().includes(q) ||
          t.gameId.toLowerCase().includes(q) ||
          t.productName.toLowerCase().includes(q) ||
          (t.zoneId ?? "").toLowerCase().includes(q)
      );
    }

    return result;
  }, [transactions, search, statusFilter]);

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-3xl font-black text-white">Riwayat Transaksi</h2>
          <p className="text-slate-500 font-medium">
            {stats.totalCount} pesanan terbaru dari seluruh pelanggan.
          </p>
        </div>
        <button
          onClick={() => exportToCSV(filtered)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold bg-[#111823] border border-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/20 text-white hover:text-emerald-400 transition-all shadow-lg text-sm shrink-0"
        >
          <FileDown className="w-4 h-4" /> Ekspor CSV ({filtered.length})
        </button>
      </div>

      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Pendapatan", value: stats.revenueFormatted, icon: DollarSign, color: "emerald" },
          { label: "Transaksi Sukses", value: stats.successCount, icon: CheckCircle2, color: "blue" },
          { label: "Sedang Diproses", value: stats.pendingCount, icon: Clock, color: "yellow" },
          { label: "Transaksi Gagal", value: stats.failedCount, icon: AlertTriangle, color: "rose" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[#111823] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-${color}-500/10 flex items-center justify-center shrink-0`}>
              <Icon className={`w-5 h-5 text-${color}-400`} />
            </div>
            <div>
              <p className="text-slate-500 text-xs font-semibold">{label}</p>
              <p className="text-white font-black text-lg leading-tight">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table Card ── */}
      <div className="bg-[#111823] border border-white/5 rounded-3xl overflow-hidden shadow-2xl flex flex-col min-h-[60vh]">
        {/* Controls Bar */}
        <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row justify-between items-center gap-3 bg-[#0a0f16]/50">
          {/* Search */}
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari Order ID, Game ID, atau item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0a0f16] border border-white/10 text-white pl-11 pr-10 py-2.5 rounded-xl text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status Tab Filter */}
          <div className="flex gap-1 bg-[#0a0f16] border border-white/5 p-1 rounded-xl">
            {STATUS_TABS.map(({ key, label, color }) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === key
                    ? `bg-white/10 ${color}`
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-[#111823] sticky top-0 z-10">
              <tr className="text-xs font-bold text-slate-500 border-b border-white/5 uppercase tracking-wider">
                <th className="py-4 px-5 w-[200px]">Order ID & Waktu</th>
                <th className="py-4 px-5">Produk</th>
                <th className="py-4 px-5">ID Tujuan</th>
                <th className="py-4 px-5">SN / Catatan</th>
                <th className="py-4 px-5 text-right">Harga Jual</th>
                <th className="py-4 px-5 text-right">Laba</th>
                <th className="py-4 px-5 text-right w-[130px]">Status</th>
                <th className="py-4 px-5 text-right w-[120px]">Refund</th>
                <th className="py-4 px-5 text-right w-[110px]">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-white/[0.03]">
              {filtered.map((order) => {
                const profit = order.cost != null ? order.price - order.cost : null;
                return (
                  <tr key={order.id} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="py-3.5 px-5">
                      <span className="font-mono font-bold text-slate-300 text-xs block mb-0.5">
                        {order.orderId}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {formatDate(order.createdAt)}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="text-white font-bold block leading-tight text-sm">
                        {order.productName}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="text-xs text-blue-400 font-mono font-bold bg-blue-500/10 px-2.5 py-1 rounded-md inline-block border border-blue-500/20">
                        {order.gameId}
                        {order.zoneId ? ` (${order.zoneId})` : ""}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 max-w-[160px]">
                      {order.digiflazzNote ? (
                        <div className="group/sn relative">
                          <span className="text-[10px] font-mono bg-black/30 border border-white/5 px-2 py-1 rounded text-slate-400 block truncate cursor-help">
                            {order.digiflazzNote}
                          </span>
                          {/* Full SN on hover tooltip */}
                          <div className="absolute left-0 bottom-full mb-2 hidden group-hover/sn:block bg-[#0a0f16] border border-white/10 p-3 rounded-xl text-[10px] text-white z-50 whitespace-normal min-w-[220px] shadow-2xl">
                            <p className="text-slate-400 font-bold uppercase text-[9px] mb-1">SN/Catatan Digiflazz</p>
                            {order.digiflazzNote}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-700 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <span className="font-black text-white">
                        {formatRupiah(order.price)}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      {profit != null && order.status === "SUCCESS" ? (
                        <span className={`font-bold text-sm flex items-center justify-end gap-1 ${profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          <TrendingUp className="w-3 h-3" />
                          {formatRupiah(profit)}
                        </span>
                      ) : (
                        <span className="text-slate-700 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <RefundBadge refundStatus={order.refundStatus} refundNote={order.refundNote} />
                    </td>
                    <td className="py-3.5 px-5 text-right flex items-center justify-end gap-2">
                      {(order.status === "PAID" || order.status === "PENDING" || order.status === "FAILED") && (
                        <button
                          onClick={() => handleManualProcess(order.orderId)}
                          disabled={isPending && processingId === order.orderId}
                          title="Proses Manual (Rescue)"
                          className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 transition-all disabled:opacity-50 inline-flex items-center justify-center shrink-0"
                        >
                          {isPending && processingId === order.orderId ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Wrench className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      {(order.status === "PAID" || order.status === "PENDING") && (
                        <button
                          onClick={() => handleFailOrder(order.orderId)}
                          disabled={isPending && processingId === order.orderId}
                          title="Gagalkan Transaksi"
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-all disabled:opacity-50 inline-flex items-center justify-center shrink-0"
                        >
                          {isPending && processingId === order.orderId ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Empty State */}
          {filtered.length === 0 && (
            <div className="py-20 text-center">
              <Receipt className="w-12 h-12 mx-auto mb-4 text-slate-700" />
              <p className="font-bold text-white text-lg mb-1">
                {search || statusFilter !== "ALL" ? "Tidak ada hasil" : "Belum Ada Transaksi"}
              </p>
              <p className="text-slate-500 text-sm">
                {search || statusFilter !== "ALL"
                  ? "Coba ubah filter atau kata kunci pencarian."
                  : "Data penjualan akan muncul di sini setelah ada transaksi."}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-500 bg-[#0a0f16]/30">
          <span>Menampilkan <strong className="text-white">{filtered.length}</strong> dari <strong className="text-white">{transactions.length}</strong> transaksi</span>
          {(search || statusFilter !== "ALL") && (
            <button
              onClick={() => { setSearch(""); setStatusFilter("ALL"); }}
              className="text-blue-400 hover:text-white font-bold transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Reset Filter
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
