/**
 * @file src/app/admin/products/ProductDashboardClient.tsx
 * @description Interactive client component for the Admin Products page.
 *
 * Features:
 * - Real-time search by name, brand, or SKU
 * - Filter by brand (auto-built from data)
 * - Margin column showing profit per item
 * - Toggle isActive button (optimistic UI)
 * - Last sync timestamp display
 */

"use client";

import { useTransition, useState, useMemo } from "react";
import { runDigiflazzSync } from "./actions";
import { RefreshCcw, Search, ServerCrash, CheckCircle2, ShieldAlert, Filter, ToggleLeft, ToggleRight, TrendingUp, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatRupiah } from "@/lib/utils";

interface Product {
  id: string;
  sku: string;
  brand: string;
  name: string;
  price: number;
  originalPrice: number;
  isActive: boolean;
  category: string;
}

export default function ProductDashboardClient({ products }: { products: Product[] }) {
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("ALL");
  const [showInactive, setShowInactive] = useState(false);

  // Compute total active/inactive counts
  const activeCount = products.filter((p) => p.isActive).length;
  const inactiveCount = products.length - activeCount;

  // Unique brands for the filter dropdown
  const brands = useMemo(() => {
    const set = new Set(products.map((p) => p.brand));
    return Array.from(set).sort();
  }, [products]);

  const filtered = useMemo(() => {
    let result = products;

    if (!showInactive) {
      result = result.filter((p) => p.isActive);
    }

    if (brandFilter !== "ALL") {
      result = result.filter((p) => p.brand === brandFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q)
      );
    }

    return result;
  }, [products, search, brandFilter, showInactive]);

  const handleSync = () => {
    setToast(null);
    startTransition(async () => {
      const res = await runDigiflazzSync();
      setToast({ msg: res.message, type: res.success ? "success" : "error" });
      setTimeout(() => setToast(null), 6000);
    });
  };

  // Compute total margin for currently visible products
  const totalMargin = useMemo(
    () => filtered.reduce((sum, p) => sum + (p.price - p.originalPrice), 0),
    [filtered]
  );

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
        <div>
          <h2 className="text-3xl font-black text-white">Produk Digiflazz</h2>
          <p className="text-slate-500 font-medium">
            Sinkronisasi harga otomatis dari API Digiflazz.
          </p>
          <div className="flex gap-3 mt-3">
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              {activeCount} Aktif
            </span>
            {inactiveCount > 0 && (
              <span className="text-xs font-bold text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                {inactiveCount} Nonaktif
              </span>
            )}
          </div>
        </div>

        <button
          onClick={handleSync}
          disabled={isPending}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg text-sm shrink-0 ${
            isPending
              ? "bg-slate-800 text-slate-500 cursor-wait border border-white/5"
              : "bg-blue-600 hover:bg-blue-500 text-white hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(37,99,235,0.4)]"
          }`}
        >
          <RefreshCcw className={`w-5 h-5 ${isPending ? "animate-spin" : ""}`} />
          {isPending ? "Menyinkronisasi..." : "🔄 Tarik Data Digiflazz"}
        </button>
      </div>

      {/* ── Toast Notification ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <div
              className={`px-5 py-4 rounded-xl flex items-center gap-3 font-semibold text-sm border shadow-lg ${
                toast.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-400"
              }`}
            >
              {toast.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 shrink-0" />
              ) : (
                <ShieldAlert className="w-5 h-5 shrink-0" />
              )}
              {toast.msg}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Table Card ── */}
      <div className="bg-[#111823] border border-white/5 rounded-3xl overflow-hidden shadow-2xl flex flex-col" style={{ minHeight: "65vh" }}>
        {/* Controls */}
        <div className="p-4 border-b border-white/5 flex flex-wrap gap-3 items-center bg-[#0a0f16]/50">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari SKU, nama, atau brand..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0a0f16] border border-white/10 text-white pl-9 pr-4 py-2.5 rounded-xl text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Brand Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="bg-[#0a0f16] border border-white/10 text-slate-300 text-sm rounded-xl pl-8 pr-4 py-2.5 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Semua Brand</option>
              {brands.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Toggle Inactive */}
          <button
            onClick={() => setShowInactive((v) => !v)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border ${
              showInactive
                ? "bg-slate-500/20 border-slate-500/30 text-slate-300"
                : "bg-white/5 border-white/5 text-slate-500 hover:text-slate-300"
            }`}
          >
            {showInactive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            {showInactive ? "Sembunyikan Nonaktif" : "Tampilkan Nonaktif"}
          </button>

          {/* Reset */}
          {(search || brandFilter !== "ALL") && (
            <button
              onClick={() => { setSearch(""); setBrandFilter("ALL"); }}
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-white font-bold transition-colors"
            >
              <X className="w-3 h-3" /> Reset
            </button>
          )}

          {/* Count */}
          <div className="ml-auto text-slate-400 text-sm font-bold">
            <span className="text-white">{filtered.length}</span> item
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="sticky top-0 z-10 bg-[#111823] shadow-md">
              <tr className="text-xs font-bold text-slate-500 border-b border-white/5 uppercase tracking-wider">
                <th className="py-4 px-5 w-10">•</th>
                <th className="py-4 px-5">SKU</th>
                <th className="py-4 px-5">Nama Produk</th>
                <th className="py-4 px-5 text-right">Modal</th>
                <th className="py-4 px-5 text-right">Harga Jual</th>
                <th className="py-4 px-5 text-right">Margin</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-white/[0.03]">
              {filtered.map((p) => {
                const margin = p.price - p.originalPrice;
                const marginPct = p.originalPrice > 0 ? ((margin / p.originalPrice) * 100).toFixed(1) : "0";
                return (
                  <tr
                    key={p.id}
                    className={`transition-colors group ${p.isActive ? "hover:bg-white/[0.03]" : "opacity-40 hover:opacity-60"}`}
                  >
                    <td className="py-3 px-5">
                      <span
                        className={`w-2.5 h-2.5 rounded-full block ${
                          p.isActive
                            ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                            : "bg-slate-600"
                        }`}
                      />
                    </td>
                    <td className="py-3 px-5 text-slate-400 font-mono text-xs font-bold">{p.sku}</td>
                    <td className="py-3 px-5">
                      <span className="text-white font-bold block text-sm leading-tight">{p.name}</span>
                      <span className="text-xs text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded-md mt-1 inline-block border border-blue-500/20">
                        {p.brand}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right text-slate-500 text-sm line-through">
                      {formatRupiah(p.originalPrice)}
                    </td>
                    <td className="py-3 px-5 text-right text-white font-black">
                      {formatRupiah(p.price)}
                    </td>
                    <td className="py-3 px-5 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-emerald-400 font-bold text-sm flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> +{formatRupiah(margin)}
                        </span>
                        <span className="text-[10px] text-slate-500">({marginPct}%)</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <ServerCrash className="w-12 h-12 mx-auto mb-3 text-slate-700" />
              <p className="font-bold text-white">Tidak ada produk ditemukan</p>
              <p className="text-slate-500 text-sm mt-1">
                {search || brandFilter !== "ALL"
                  ? "Coba ubah kata kunci atau filter."
                  : "Klik 'Tarik Data Digiflazz' untuk sinkronisasi pertama."}
              </p>
            </div>
          )}
        </div>

        {/* Footer Summary */}
        {filtered.length > 0 && (
          <div className="p-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-500 bg-[#0a0f16]/30">
            <span>
              Menampilkan <strong className="text-white">{filtered.length}</strong> produk
            </span>
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Total Margin: {formatRupiah(totalMargin)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
