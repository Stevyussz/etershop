/**
 * @file src/app/admin/settings/PriceSettingsClient.tsx
 * @description Advanced management interface for global markup and profit margins.
 */

"use client";

import { useState, useTransition } from "react";
import { updatePriceSettings } from "./price-actions";
import { runDigiflazzSync } from "../products/actions";
import { 
  TrendingUp, Percent, Coins, Save, 
  RefreshCcw, CheckCircle2, ShieldAlert,
  Info, Loader2, Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Settings {
  globalMarkupType: string;
  globalMarkupPercent: number;
  globalMarkupFixed: number;
  gameValidatorUrl?: string;
}

export default function PriceSettingsClient({ initialSettings }: { initialSettings: Settings | null }) {
  // Clean initialSettings from MongoDB technical fields before setting state
  const cleanInitial = initialSettings ? (() => {
    const { id, createdAt, updatedAt, ...others } = initialSettings as any;
    return others as Settings;
  })() : null;

  const [settings, setSettings] = useState<Settings>(cleanInitial || {
    globalMarkupType: "TIERED",
    globalMarkupPercent: 5,
    globalMarkupFixed: 2000,
    gameValidatorUrl: "https://api.vany.my.id/api/game/"
  });
  const [isPending, startTransition] = useTransition();
  const [isSyncPending, startSyncTransition] = useTransition();
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const res = await updatePriceSettings(settings);
        if (res.success) {
          setToast({ msg: "Pengaturan harga berhasil disimpan!", type: "success" });
        } else {
          setToast({ msg: `Gagal: ${res.message || "Simpan pengaturan gagal."}`, type: "error" });
        }
      } catch (err: any) {
        setToast({ msg: `Error: ${err.message || "Gagal simpan."}`, type: "error" });
      }
      setTimeout(() => setToast(null), 3000);
    });
  };

  const handleApplyToAll = () => {
    if (!confirm("Ini akan menghitung ulang dan memperbarui harga SEMUA produk di database. Proses ini mungkin memakan waktu beberapa saat. Lanjutkan?")) return;
    
    startSyncTransition(async () => {
      // First save settings to be sure
      await updatePriceSettings(settings);
      // Then run sync
      const res = await runDigiflazzSync();
      setToast({ msg: res.message, type: res.success ? "success" : "error" });
      setTimeout(() => setToast(null), 5000);
    });
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h2 className="text-3xl font-black text-white flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-fuchsia-500" />
          Manager Harga Jual
        </h2>
        <p className="text-slate-500 font-medium mt-1">Atur strategi margin keuntungan global untuk semua produk.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* TYPE SELECTOR */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 space-y-8">
            <div className="space-y-4">
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500">Strategi Keuntungan</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: "TIERED", label: "Tiered (Auto)", icon: Zap, desc: "<50k: +2rb, >50k: +5%" },
                  { id: "PERCENT", label: "Persentase (%)", icon: Percent, desc: "Ambil untung % dari modal" },
                  { id: "FIXED", label: "Flat (Rp)", icon: Coins, desc: "Ambil untung tetap per item" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSettings({ ...settings, globalMarkupType: t.id })}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      settings.globalMarkupType === t.id 
                        ? "bg-fuchsia-600/10 border-fuchsia-500 text-white shadow-[0_0_15px_rgba(217,70,239,0.15)]" 
                        : "bg-white/5 border-white/5 text-slate-400 hover:border-white/10"
                    }`}
                  >
                    <t.icon className={`w-5 h-5 mb-2 ${settings.globalMarkupType === t.id ? "text-fuchsia-400" : "text-slate-500"}`} />
                    <div className="font-bold text-sm">{t.label}</div>
                    <div className="text-[10px] opacity-60 leading-tight mt-1">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {settings.globalMarkupType === "PERCENT" && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="space-y-2"
                >
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-500">Persentase Margin (%)</label>
                  <div className="relative">
                    <input 
                      type="number"
                      step="0.1"
                      value={settings.globalMarkupPercent}
                      onChange={(e) => setSettings({ ...settings, globalMarkupPercent: Number(e.target.value) })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-xl font-bold text-white focus:outline-none focus:border-fuchsia-500/50"
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-600 font-black">%</div>
                  </div>
                  <p className="text-[10px] text-slate-500 flex items-center gap-1"><Info className="w-3 h-3"/> Harga jual = Modal + (Modal * {settings.globalMarkupPercent}%)</p>
                </motion.div>
              )}

              {settings.globalMarkupType === "FIXED" && (
                <motion.div 
                   initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                   className="space-y-2"
                >
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-500">Margin Tetap (Rupiah)</label>
                  <div className="relative">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 font-black">Rp</div>
                    <input 
                      type="number"
                      value={settings.globalMarkupFixed}
                      onChange={(e) => setSettings({ ...settings, globalMarkupFixed: Number(e.target.value) })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-xl font-bold text-white focus:outline-none focus:border-fuchsia-500/50"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 flex items-center gap-1"><Info className="w-3 h-3"/> Harga jual = Modal + Rp {settings.globalMarkupFixed.toLocaleString()}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              onClick={handleSave}
              disabled={isPending}
              className="w-full bg-white text-black hover:bg-slate-200 disabled:opacity-50 font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all"
            >
              {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Simpan Pengaturan
            </button>
          </div>

          {/* VALIDATOR SETTINGS */}
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white">Nickname Validator (Cek ID)</h3>
            </div>
            
            <div className="space-y-4">
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                URL API gratis yang digunakan untuk mengecek nickname pemain sebelum transaksi. 
                Ganti jika layanan yang sekarang sedang gangguan.
              </p>
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-600 ml-1">Validator Endpoint URL</label>
                <input 
                  type="text"
                  value={settings.gameValidatorUrl || ""}
                  onChange={(e) => setSettings({ ...settings, gameValidatorUrl: e.target.value })}
                  placeholder="https://api.vany.my.id/api/game/"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-medium text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-3">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Format harus diakhiri `/` (misalnya: `.../api/game/`). Sistem akan otomatis menambahkan nama game di belakangnya.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* APPLY PANEL */}
        <div className="space-y-6">
          <div className="bg-fuchsia-600/5 border border-fuchsia-500/20 rounded-3xl p-8 space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-fuchsia-500/10 flex items-center justify-center">
               <RefreshCcw className="w-6 h-6 text-fuchsia-400" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Terapkan Massal</h3>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                Klik tombol di bawah untuk **memperbarui harga semua produk** di database menggunakan pengaturan baru ini sekarang juga.
              </p>
            </div>
            <button 
              onClick={handleApplyToAll}
              disabled={isSyncPending}
              className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-fuchsia-600/20"
            >
              {isSyncPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCcw className="w-5 h-5" />} Terapkan ke Semua
            </button>
          </div>
        </div>
      </div>

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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
