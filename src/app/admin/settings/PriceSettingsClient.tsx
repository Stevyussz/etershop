/**
 * @file src/app/admin/settings/PriceSettingsClient.tsx
 * @description Advanced management interface for global markup and profit margins.
 *   - Save pricing strategy (TIERED / PERCENT / FIXED)
 *   - Apply prices to: All Products | Per Game (brand) | Per Item (SKU)
 */

"use client";

import { useState, useTransition, useRef } from "react";
import { updatePriceSettings, applyPricingTarget, searchProducts } from "./price-actions";
import {
  TrendingUp, Percent, Coins, Save,
  RefreshCcw, CheckCircle2, ShieldAlert,
  Info, Loader2, Zap, Gamepad2, Package,
  Search, X, ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Settings {
  globalMarkupType: string;
  globalMarkupPercent: number;
  globalMarkupFixed: number;
  gameValidatorUrl?: string;
}

interface SearchResult {
  sku: string;
  name: string;
  brand: string;
  price: number;
  originalPrice: number;
}

type ApplyMode = "all" | "brand" | "sku";

export default function PriceSettingsClient({
  initialSettings,
  brands = [],
}: {
  initialSettings: Settings | null;
  brands?: string[];
}) {
  const [settings, setSettings] = useState<Settings>(
    initialSettings || {
      globalMarkupType: "TIERED",
      globalMarkupPercent: 5,
      globalMarkupFixed: 2000,
      gameValidatorUrl: "https://api.vany.my.id/api/game/",
    }
  );

  // Apply mode state
  const [applyMode, setApplyMode] = useState<ApplyMode>("all");
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [brandDropdownOpen, setBrandDropdownOpen] = useState(false);

  // SKU search state
  const [skuQuery, setSkuQuery] = useState("");
  const [skuResults, setSkuResults] = useState<SearchResult[]>([]);
  const [selectedSku, setSelectedSku] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Transitions
  const [isSaving, startSaveTransition] = useTransition();
  const [isApplying, startApplyTransition] = useTransition();
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  // ── Save settings ─────────────────────────────────────────────────────────
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    startSaveTransition(async () => {
      const res = await updatePriceSettings(settings);
      if (res.success) {
        showToast("✅ Pengaturan harga berhasil disimpan!", "success");
      } else {
        showToast(`Gagal: ${res.message || "Simpan gagal."}`, "error");
      }
    });
  };

  // ── Apply prices ──────────────────────────────────────────────────────────
  const handleApply = () => {
    if (applyMode === "brand" && !selectedBrand) {
      showToast("Pilih game terlebih dahulu.", "error");
      return;
    }
    if (applyMode === "sku" && !selectedSku) {
      showToast("Pilih item/SKU terlebih dahulu.", "error");
      return;
    }

    const target =
      applyMode === "brand" ? selectedBrand :
      applyMode === "sku"   ? selectedSku!.sku :
      undefined;

    const confirmMsg =
      applyMode === "all"   ? "Ini akan memperbarui SEMUA harga produk. Lanjutkan?" :
      applyMode === "brand" ? `Terapkan harga baru ke semua item game "${selectedBrand}"?` :
                              `Terapkan harga baru ke item "${selectedSku!.name}"?`;

    if (!confirm(confirmMsg)) return;

    startApplyTransition(async () => {
      // Save first to ensure latest settings are used
      await updatePriceSettings(settings);
      const res = await applyPricingTarget(applyMode, target);
      showToast(res.message, res.success ? "success" : "error");
    });
  };

  // ── SKU search with debounce ──────────────────────────────────────────────
  const handleSkuSearch = (q: string) => {
    setSkuQuery(q);
    setSelectedSku(null);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (q.length < 2) { setSkuResults([]); return; }
    setIsSearching(true);
    searchTimeout.current = setTimeout(async () => {
      const results = await searchProducts(q);
      setSkuResults(results);
      setIsSearching(false);
    }, 400);
  };

  // ── Apply button label ────────────────────────────────────────────────────
  const applyLabel =
    applyMode === "all"   ? "Terapkan ke Semua Produk" :
    applyMode === "brand" ? (selectedBrand ? `Terapkan ke Game "${selectedBrand}"` : "Pilih Game Dulu") :
                            (selectedSku ? `Terapkan ke "${selectedSku.name}"` : "Pilih Item Dulu");

  return (
    <div className="max-w-4xl space-y-8">
      {/* ── Header ── */}
      <div>
        <h2 className="text-3xl font-black text-white flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-fuchsia-500" />
          Manager Harga Jual
        </h2>
        <p className="text-slate-500 font-medium mt-1">
          Atur strategi margin dan terapkan harga secara massal, per game, atau per item.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ── LEFT: Strategy + Validator ── */}
        <div className="md:col-span-2 space-y-6">
          {/* Strategy card */}
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 space-y-8">
            {/* Strategy selector */}
            <div className="space-y-4">
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500">
                Strategi Keuntungan
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: "TIERED",  label: "Tiered (Auto)",  icon: Zap,     desc: "<50k: +2rb, >50k: +5%" },
                  { id: "PERCENT", label: "Persentase (%)", icon: Percent,  desc: "Ambil untung % dari modal" },
                  { id: "FIXED",   label: "Flat (Rp)",      icon: Coins,   desc: "Ambil untung tetap per item" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
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

            {/* Dynamic input */}
            <AnimatePresence mode="wait">
              {settings.globalMarkupType === "PERCENT" && (
                <motion.div key="percent" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-2">
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-500">Persentase Margin (%)</label>
                  <div className="relative">
                    <input
                      type="number" step="0.1"
                      value={settings.globalMarkupPercent}
                      onChange={(e) => setSettings({ ...settings, globalMarkupPercent: Number(e.target.value) })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-xl font-bold text-white focus:outline-none focus:border-fuchsia-500/50"
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-600 font-black">%</div>
                  </div>
                  <p className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Info className="w-3 h-3" /> Harga jual = Modal + (Modal × {settings.globalMarkupPercent}%)
                  </p>
                </motion.div>
              )}

              {settings.globalMarkupType === "FIXED" && (
                <motion.div key="fixed" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-2">
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
                  <p className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Info className="w-3 h-3" /> Harga jual = Modal + Rp {settings.globalMarkupFixed.toLocaleString("id-ID")}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="w-full bg-white text-black hover:bg-slate-200 disabled:opacity-50 font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Simpan Pengaturan
            </button>
          </div>

          {/* Validator settings */}
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
                  Format harus diakhiri <code>/</code> (mis: <code>.../api/game/</code>). Sistem akan menambahkan nama game otomatis.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Apply Panel ── */}
        <div className="space-y-4">
          <div className="bg-fuchsia-600/5 border border-fuchsia-500/20 rounded-3xl p-6 space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-fuchsia-500/10 flex items-center justify-center">
              <RefreshCcw className="w-6 h-6 text-fuchsia-400" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Terapkan Harga</h3>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                Pilih target penerapan harga berdasarkan pengaturan yang aktif.
              </p>
            </div>

            {/* ── Mode tabs ── */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-white/5 rounded-2xl">
              {([
                { mode: "all"   as ApplyMode, label: "Semua",   icon: RefreshCcw },
                { mode: "brand" as ApplyMode, label: "Per Game", icon: Gamepad2   },
                { mode: "sku"   as ApplyMode, label: "Per Item", icon: Package    },
              ]).map(({ mode, label, icon: Icon }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => { setApplyMode(mode); setSelectedBrand(""); setSelectedSku(null); setSkuQuery(""); setSkuResults([]); }}
                  className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-[11px] font-bold transition-all ${
                    applyMode === mode
                      ? "bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-600/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            {/* ── Mode-specific selector ── */}
            <AnimatePresence mode="wait">

              {/* All — no selector needed */}
              {applyMode === "all" && (
                <motion.div key="all" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-400 text-center">
                  Semua produk aktif akan diperbarui harganya.
                </motion.div>
              )}

              {/* Per Brand */}
              {applyMode === "brand" && (
                <motion.div key="brand" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pilih Game</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setBrandDropdownOpen(!brandDropdownOpen)}
                      className="w-full flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-sm text-white hover:border-fuchsia-500/40 transition-all"
                    >
                      <span className={selectedBrand ? "text-white font-semibold" : "text-slate-500"}>
                        {selectedBrand || "— Pilih Game —"}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${brandDropdownOpen ? "rotate-180" : ""}`} />
                    </button>
                    <AnimatePresence>
                      {brandDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                          className="absolute z-20 mt-1 w-full bg-[#1a2236] border border-white/10 rounded-2xl shadow-2xl overflow-auto max-h-48"
                        >
                          {brands.length === 0 ? (
                            <p className="p-4 text-xs text-slate-500 text-center">Tidak ada game aktif.</p>
                          ) : brands.map((b) => (
                            <button
                              key={b}
                              type="button"
                              onClick={() => { setSelectedBrand(b); setBrandDropdownOpen(false); }}
                              className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-fuchsia-600/10 ${selectedBrand === b ? "text-fuchsia-400 font-bold" : "text-slate-300"}`}
                            >
                              {b}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}

              {/* Per SKU */}
              {applyMode === "sku" && (
                <motion.div key="sku" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cari Item / SKU</label>

                  {selectedSku ? (
                    <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-fuchsia-600/10 border border-fuchsia-500/30">
                      <div>
                        <p className="text-xs font-bold text-white line-clamp-1">{selectedSku.name}</p>
                        <p className="text-[10px] text-slate-400">{selectedSku.sku} · {selectedSku.brand}</p>
                      </div>
                      <button type="button" onClick={() => { setSelectedSku(null); setSkuQuery(""); setSkuResults([]); }}
                        className="shrink-0 p-1 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="relative flex items-center">
                        <Search className="absolute left-3 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          value={skuQuery}
                          onChange={(e) => handleSkuSearch(e.target.value)}
                          placeholder="Nama produk atau SKU..."
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-9 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-fuchsia-500/50"
                        />
                        {isSearching && <Loader2 className="absolute right-3 w-4 h-4 text-fuchsia-400 animate-spin" />}
                      </div>
                      <AnimatePresence>
                        {skuResults.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                            className="absolute z-20 mt-1 w-full bg-[#1a2236] border border-white/10 rounded-2xl shadow-2xl overflow-auto max-h-52"
                          >
                            {skuResults.map((r) => (
                              <button
                                key={r.sku}
                                type="button"
                                onClick={() => { setSelectedSku(r); setSkuQuery(r.name); setSkuResults([]); }}
                                className="w-full text-left px-4 py-3 hover:bg-fuchsia-600/10 border-b border-white/5 last:border-0 transition-colors"
                              >
                                <p className="text-xs font-semibold text-white line-clamp-1">{r.name}</p>
                                <p className="text-[10px] text-slate-400">{r.sku} · <span className="text-fuchsia-400">{r.brand}</span></p>
                              </button>
                            ))}
                          </motion.div>
                        )}
                        {!isSearching && skuQuery.length >= 2 && skuResults.length === 0 && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute z-20 mt-1 w-full bg-[#1a2236] border border-white/10 rounded-2xl p-4 text-center">
                            <p className="text-xs text-slate-500">Tidak ada hasil untuk &ldquo;{skuQuery}&rdquo;</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Apply button */}
            <button
              type="button"
              onClick={handleApply}
              disabled={isApplying || (applyMode === "brand" && !selectedBrand) || (applyMode === "sku" && !selectedSku)}
              className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-fuchsia-600/20 text-sm"
            >
              {isApplying ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCcw className="w-5 h-5" />}
              {isApplying ? "Menerapkan..." : applyLabel}
            </button>

            <p className="text-[10px] text-slate-600 text-center leading-relaxed">
              Harga diperbarui langsung dari database tanpa mengambil ulang data Digiflazz.
            </p>
          </div>
        </div>
      </div>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-8 right-8 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-xl border ${
              toast.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-rose-500/10 border-rose-500/20 text-rose-400"
            }`}
          >
            {toast.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            <span className="font-bold text-sm">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
