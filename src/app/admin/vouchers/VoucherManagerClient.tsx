/**
 * @file src/app/admin/vouchers/VoucherManagerClient.tsx
 * @description Advanced management interface for promotional codes.
 */

"use client";

import { useState, useTransition, useMemo } from "react";
import { getVouchers, upsertVoucher, deleteVoucher } from "./voucher-actions";
import { 
  Plus, Ticket, Trash2, Edit2, Search, 
  Calendar, CheckCircle2, ShieldAlert, X, 
  Save, Loader2, Tag
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDate } from "@/lib/utils";

interface Voucher {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  minPurchase: number;
  maxDiscount?: number | null;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  expiryDate?: Date | string | null;
}

export default function VoucherManagerClient({ initialVouchers }: { initialVouchers: Voucher[] }) {
  const [vouchers, setVouchers] = useState<Voucher[]>(initialVouchers);
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Partial<Voucher> | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const filtered = useMemo(() => {
    return vouchers.filter(v => 
      v.code.toLowerCase().includes(search.toLowerCase())
    );
  }, [vouchers, search]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVoucher?.code || !editingVoucher?.discountValue) return;

    startTransition(async () => {
      const res = await upsertVoucher(editingVoucher);
      if (res.success) {
        setToast({ msg: "Voucher berhasil disimpan!", type: "success" });
        // Refresh local state (simplification: re-fetch or update manually)
        const updated = await getVouchers();
        // @ts-ignore
        setVouchers(updated);
        setIsModalOpen(false);
      } else {
        setToast({ msg: res.message || "Gagal menyimpan voucher.", type: "error" });
      }
      setTimeout(() => setToast(null), 3000);
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus voucher ini?")) return;
    startTransition(async () => {
      const res = await deleteVoucher(id);
      if (res.success) {
        setVouchers(vouchers.filter(v => v.id !== id));
        setToast({ msg: "Voucher dihapus.", type: "success" });
      }
      setTimeout(() => setToast(null), 3000);
    });
  };

  const openAddModal = () => {
    setEditingVoucher({
      code: "",
      discountType: "FIXED",
      discountValue: 0,
      minPurchase: 0,
      usageLimit: -1,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (v: Voucher) => {
    setEditingVoucher(v);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-white">Voucher Manager</h2>
          <p className="text-slate-500 font-medium">Kelola kode promo dan diskon pelanggan.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="flex items-center gap-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-fuchsia-600/20 active:scale-95"
        >
          <Plus className="w-5 h-5" /> Tambah Voucher
        </button>
      </div>

      {/* STATS & SEARCH */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
          <input 
            type="text"
            placeholder="Cari kode voucher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-fuchsia-500/50 transition-colors"
          />
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex items-center justify-center gap-3">
          <Ticket className="w-5 h-5 text-fuchsia-500" />
          <span className="text-white font-bold">{vouchers.length} Total</span>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="py-5 px-6 text-slate-400 font-bold text-xs uppercase tracking-wider">Kode</th>
                <th className="py-5 px-6 text-slate-400 font-bold text-xs uppercase tracking-wider">Potongan</th>
                <th className="py-5 px-6 text-slate-400 font-bold text-xs uppercase tracking-wider">Minimal Beli</th>
                <th className="py-5 px-6 text-slate-400 font-bold text-xs uppercase tracking-wider">Pemakaian</th>
                <th className="py-5 px-6 text-slate-400 font-bold text-xs uppercase tracking-wider">Status</th>
                <th className="py-5 px-6 text-slate-400 font-bold text-xs uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              <AnimatePresence mode="popLayout">
                {filtered.map((v) => (
                  <motion.tr 
                    key={v.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-fuchsia-500/10 flex items-center justify-center">
                          <Tag className="w-4 h-4 text-fuchsia-500" />
                        </div>
                        <span className="text-white font-black tracking-tight">{v.code}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-white font-bold">
                      {v.discountType === "PERCENT" ? `${v.discountValue}%` : `Rp ${v.discountValue.toLocaleString()}`}
                    </td>
                    <td className="py-4 px-6 text-slate-400">Rp {v.minPurchase.toLocaleString()}</td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1">
                        <span className="text-white font-medium">{v.usedCount} {v.usageLimit === -1 ? "" : `/ ${v.usageLimit}`}</span>
                        {v.usageLimit !== -1 && (
                          <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-fuchsia-500" 
                              style={{ width: `${(v.usedCount / v.usageLimit) * 100}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        v.isActive ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                      }`}>
                        {v.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => openEditModal(v)}
                          className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(v.id)}
                          className="p-2 hover:bg-rose-500/10 rounded-lg text-slate-400 hover:text-rose-500 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL EDIT/ADD */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-[#111823] border border-white/10 w-full max-w-lg rounded-3xl shadow-2xl relative z-10 overflow-hidden"
          >
            <form onSubmit={handleSave}>
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <h3 className="text-xl font-black text-white">{editingVoucher?.id ? "Edit Voucher" : "Tambah Voucher Baru"}</h3>
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Kode Voucher</label>
                  <input 
                    type="text"
                    required
                    value={editingVoucher?.code}
                    onChange={(e) => setEditingVoucher({...editingVoucher, code: e.target.value.toUpperCase()})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-fuchsia-500/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Tipe Potongan</label>
                    <select 
                      value={editingVoucher?.discountType}
                      onChange={(e) => setEditingVoucher({...editingVoucher, discountType: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-white focus:outline-none"
                    >
                      <option value="FIXED" className="bg-[#111823]">Potongan Rupiah</option>
                      <option value="PERCENT" className="bg-[#111823]">Persentase (%)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Nilai Potongan</label>
                    <input 
                      type="number"
                      required
                      value={editingVoucher?.discountValue}
                      onChange={(e) => setEditingVoucher({...editingVoucher, discountValue: Number(e.target.value)})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Minimal Beli</label>
                    <input 
                      type="number"
                      value={editingVoucher?.minPurchase}
                      onChange={(e) => setEditingVoucher({...editingVoucher, minPurchase: Number(e.target.value)})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Kuota Pakai (-1=∞)</label>
                    <input 
                      type="number"
                      value={editingVoucher?.usageLimit}
                      onChange={(e) => setEditingVoucher({...editingVoucher, usageLimit: Number(e.target.value)})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/5">
                  <input 
                    type="checkbox"
                    id="is-active"
                    checked={editingVoucher?.isActive}
                    onChange={(e) => setEditingVoucher({...editingVoucher, isActive: e.target.checked})}
                    className="w-5 h-5 accent-fuchsia-500"
                  />
                  <label htmlFor="is-active" className="text-sm font-bold text-white cursor-pointer select-none">Voucher Aktif</label>
                </div>
              </div>

              <div className="p-8 pt-0 flex gap-3">
                <button 
                  type="submit"
                  disabled={isPending}
                  className="flex-1 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-fuchsia-600/20"
                >
                  {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Simpan Voucher
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* TOAST PANEL */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-8 right-8 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-xl border ${
              toast.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
            }`}
          >
            {toast.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            <span className="font-bold">{toast.msg}</span>
            <button onClick={() => setToast(null)}><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
