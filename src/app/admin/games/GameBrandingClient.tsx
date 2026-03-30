/**
 * @file src/app/admin/games/GameBrandingClient.tsx
 * @description Client-side management for Game Branding.
 */

"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { upsertGameConfig } from "./actions";
import { 
  Search, ShieldCheck, Gamepad2, ImageIcon, 
  CheckCircle2, AlertCircle, Edit3, X, Save, 
  ChevronRight, Smartphone, Monitor, Gift
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BrandData {
  brand: string;
  config: {
    id: string;
    title: string | null;
    imageUrl: string | null;
    category: string | null;
    isPopular: boolean;
  } | null;
}

const CATEGORIES = ["Mobile", "PC", "Voucher", "Lainnya"];

export default function GameBrandingClient({ initialBrands }: { initialBrands: any[] }) {
  const [search, setSearch] = useState("");
  const [editingBrand, setEditingBrand] = useState<any | null>(null);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const filteredBrands = initialBrands.filter(b => 
    b.brand.toLowerCase().includes(search.toLowerCase()) ||
    (b.config?.title?.toLowerCase() || "").includes(search.toLowerCase())
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBrand) return;

    startTransition(async () => {
      const res = await upsertGameConfig({
        brand: editingBrand.brand,
        title: editingBrand.config?.title || editingBrand.brand,
        imageUrl: editingBrand.config?.imageUrl || "",
        category: editingBrand.config?.category || "Mobile",
        isPopular: editingBrand.config?.isPopular || false,
      });

      if (res.success) {
        setToast({ msg: `Berhasil memperbarui branding ${editingBrand.brand}!`, type: "success" });
        setEditingBrand(null);
      } else {
        setToast({ msg: `Gagal memperbarui: ${res.message}`, type: "error" });
      }
      setTimeout(() => setToast(null), 5000);
    });
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative max-w-md group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
        <input 
          type="text"
          placeholder="Cari brand game..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#111823] border border-white/10 text-white pl-12 pr-4 py-3.5 rounded-2xl focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-xl"
        />
      </div>

      {/* Grid of Brand Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredBrands.map((item) => {
          const config = item.config;
          const hasImage = !!config?.imageUrl;

          return (
            <div 
              key={item.brand}
              className="group bg-[#111823] border border-white/5 rounded-3xl overflow-hidden hover:border-blue-500/30 transition-all hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] flex flex-col"
            >
              {/* Image Preview Area */}
              <div className="aspect-[3/4] relative bg-[#0a0f16] overflow-hidden">
                {hasImage ? (
                  <Image 
                    src={config.imageUrl!} 
                    alt={item.brand}
                    fill
                    unoptimized={true}
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-700 bg-gradient-to-b from-white/5 to-transparent">
                    <ImageIcon className="w-12 h-12 mb-2 opacity-20" />
                    <span className="text-[10px] uppercase font-black tracking-widest opacity-30">No Cover Image</span>
                  </div>
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-[#111823] via-transparent to-transparent opacity-60" />

                {/* Edit Overlay */}
                <button 
                  onClick={() => setEditingBrand(JSON.parse(JSON.stringify(item)))}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-blue-600/90 backdrop-blur-md text-white flex items-center justify-center shadow-lg opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all"
                >
                  <Edit3 className="w-5 h-5" />
                </button>
              </div>

              {/* Brand Info */}
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-white font-black text-lg leading-tight truncate mr-2">
                    {config?.title || item.brand}
                  </h3>
                  {config?.category && (
                    <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20 whitespace-nowrap">
                      {config.category}
                    </span>
                  )}
                </div>
                <p className="text-slate-500 text-[10px] font-mono uppercase tracking-widest mb-4">
                  Brand: {item.brand}
                </p>
                <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between text-xs font-bold">
                  <span className={config?.isPopular ? "text-rose-400" : "text-slate-600"}>
                    {config?.isPopular ? "🔥 Populer" : "— Biasa"}
                  </span>
                  <button 
                    onClick={() => setEditingBrand(JSON.parse(JSON.stringify(item)))}
                    className="text-blue-500 hover:text-white transition-colors flex items-center gap-1"
                  >
                    Atur <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Editing Modal */}
      <AnimatePresence>
        {editingBrand && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingBrand(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-[#111823] border border-white/10 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-8 md:p-10">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black text-white">Edit Branding</h2>
                  <button onClick={() => setEditingBrand(null)} className="text-slate-500 hover:text-white">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                  {/* Brand (ReadOnly) */}
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                      Target Brand (Digiflazz)
                    </label>
                    <p className="text-white font-mono font-bold">{editingBrand.brand}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Custom Title */}
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">
                        Judul Kustom (Opsional)
                      </label>
                      <input 
                        type="text"
                        value={editingBrand.config?.title || ""}
                        onChange={(e) => setEditingBrand({
                          ...editingBrand,
                          config: { ...(editingBrand.config || {}), title: e.target.value }
                        })}
                        placeholder={`Default: ${editingBrand.brand}`}
                        className="w-full bg-[#0a0f16] border border-white/5 text-white p-3.5 rounded-xl focus:border-blue-500 focus:outline-none"
                      />
                      <p className="text-[9px] text-slate-600 mt-1 ml-1">Kosongkan untuk menggunakan nama brand asli.</p>
                    </div>

                    {/* Category */}
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">
                        Kategori
                      </label>
                      <select 
                        value={editingBrand.config?.category || "Mobile"}
                        onChange={(e) => setEditingBrand({
                          ...editingBrand,
                          config: { ...(editingBrand.config || {}), category: e.target.value }
                        })}
                        className="w-full bg-[#0a0f16] border border-white/5 text-white p-3.5 rounded-xl focus:border-blue-500 focus:outline-none appearance-none"
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Image URL */}
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">
                      URL Gambar Cover (Vertical Poster 3:4)
                    </label>
                    <div className="relative">
                      <ImageIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input 
                        type="url"
                        value={editingBrand.config?.imageUrl || ""}
                        onChange={(e) => setEditingBrand({
                          ...editingBrand,
                          config: { ...(editingBrand.config || {}), imageUrl: e.target.value }
                        })}
                        placeholder="https://imgur.com/example.png"
                        className="w-full bg-[#0a0f16] border border-white/5 text-white pl-10 pr-4 py-3.5 rounded-xl focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <p className="text-[10px] text-slate-600 mt-2">
                       Gunakan rasio 3:4 (contoh: 300x400px) untuk tampilan kartu yang paling elegan.
                    </p>
                  </div>

                  {/* Popular Toggle */}
                  <label className="flex items-center gap-3 cursor-pointer p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/[0.08] transition-colors">
                    <input 
                      type="checkbox"
                      checked={editingBrand.config?.isPopular || false}
                      onChange={(e) => setEditingBrand({
                        ...editingBrand,
                        config: { ...(editingBrand.config || {}), isPopular: e.target.checked }
                      })}
                      className="w-5 h-5 rounded-md border-white/20 bg-transparent text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <p className="text-white font-bold text-sm">Game Populer?</p>
                      <p className="text-[10px] text-slate-500">Tampilkan pin "🔥 Hot" pada kartu produk.</p>
                    </div>
                  </label>

                  <button 
                    disabled={isPending}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-900/20 disabled:opacity-50"
                  >
                    {isPending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                    Simpan Branding
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 right-8 z-[100]">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 text-white font-bold ${
              toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
            }`}
          >
            {toast.type === "success" ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
            {toast.msg}
          </motion.div>
        </div>
      )}
    </div>
  );
}
