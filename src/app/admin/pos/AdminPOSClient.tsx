"use client";

import { useState, useRef, useTransition } from "react";
import { searchProducts } from "../settings/price-actions";
import { manualCreatePosOrder } from "./pos-actions";
import { Search, PackageCheck, UserCircle, Zap, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminPOSClient() {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [customerNo, setCustomerNo] = useState("");

  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const [lastResult, setLastResult] = useState<{ sn: string; status: string } | null>(null);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (val.trim().length >= 2) {
      setIsSearching(true);
      searchTimeout.current = setTimeout(async () => {
        const results = await searchProducts(val);
        setSearchResults(results);
        setIsSearching(false);
      }, 500);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  const handleSelectProduct = (product: any) => {
    setSelectedProduct(product);
    setQuery("");
    setSearchResults([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !customerNo) return;

    startTransition(async () => {
      setLastResult(null);
      const res = await manualCreatePosOrder(selectedProduct.sku, customerNo);
      
      if (res.success) {
        setToast({ msg: res.message, type: "success" });
        setLastResult({ sn: res.sn || "-", status: res.digiflazzStatus || "PENDING" });
        setSelectedProduct(null);
        setCustomerNo("");
      } else {
        setToast({ msg: res.message, type: "error" });
      }
      
      setTimeout(() => setToast(null), 8000);
    });
  };

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div className="bg-[#111823] p-8 rounded-3xl border border-blue-500/10 shadow-[0_0_40px_rgba(37,99,235,0.05)] relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/20 blur-[80px] rounded-full pointer-events-none" />
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center flex-shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Kasir POS Manual</h1>
            <p className="text-slate-400 mt-2 max-w-2xl leading-relaxed">
              Fasilitas kasir offline. Potong saldo Digiflazz secara langsung tanpa via Midtrans untuk melayani pembeli tunai atau jastip.
            </p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        
        {/* Input Column */}
        <div className="bg-[#111823] border border-white/5 p-6 rounded-3xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* 1. Product Search */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <PackageCheck className="w-4 h-4" /> Cari Produk Digiflazz
              </label>
              
              {!selectedProduct ? (
                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    {isSearching ? (
                       <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                    ) : (
                       <Search className="w-5 h-5 text-slate-500" />
                    )}
                  </div>
                  <input
                    type="text"
                    value={query}
                    onChange={handleSearch}
                    placeholder="Ketik nama game / SKU..."
                    className="w-full bg-[#0a0f16] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                  
                  {/* Results Dropdown */}
                  <AnimatePresence>
                    {searchResults.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="absolute z-10 w-full mt-2 bg-[#111823] border border-white/10 rounded-2xl shadow-xl max-h-64 overflow-y-auto"
                      >
                        {searchResults.map((item) => (
                          <button
                            key={item.sku}
                            type="button"
                            onClick={() => handleSelectProduct(item)}
                            className="w-full text-left p-4 hover:bg-white/5 border-b border-white/5 transition-colors flex items-center justify-between group"
                          >
                            <div>
                               <p className="text-white font-bold group-hover:text-blue-400 transition-colors">{item.name}</p>
                               <span className="text-[10px] uppercase tracking-widest text-slate-500">{item.brand} • SKU: {item.sku}</span>
                            </div>
                            <p className="font-mono text-emerald-400 font-bold">Rp {item.price.toLocaleString("id-ID")}</p>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white mb-1"><span className="text-blue-400">Terpilih:</span> {selectedProduct.name}</p>
                    <p className="text-xs text-slate-400 tracking-widest font-mono">SKU: {selectedProduct.sku} | Harga: Rp {selectedProduct.price.toLocaleString("id-ID")}</p>
                  </div>
                  <button type="button" onClick={() => setSelectedProduct(null)} className="text-red-400 hover:text-red-300 text-xs font-bold underline">Ubah</button>
                </div>
              )}
            </div>

            {/* 2. Target ID Input */}
            <div className="space-y-2">
               <label className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                 <UserCircle className="w-4 h-4" /> ID Tujuan / No HP
               </label>
               <input 
                 type="text"
                 required
                 value={customerNo}
                 onChange={(e) => setCustomerNo(e.target.value)}
                 placeholder="Contoh: 123456781234 (gabung game+zone)"
                 className="w-full bg-[#0a0f16] border border-white/5 rounded-2xl p-4 text-white font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
               />
               <p className="text-[10px] text-slate-500">Note: Bila game butuh Server ID, gabungkan murni angkanya tanpa spasi.</p>
            </div>

            <button 
              type="submit"
              disabled={isPending || !selectedProduct || !customerNo}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-2xl py-4 font-black transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-900/20"
            >
              {isPending ? (
                 <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Bayar Pakai Saldo Digiflazz <Zap className="w-4 h-4" /></>
              )}
            </button>
            
          </form>
        </div>

        {/* Status Dashboard Panel */}
        <div className="bg-gradient-to-br from-[#0c1526] to-[#080d18] border border-cyan-500/10 p-6 rounded-3xl relative overflow-hidden flex flex-col justify-center">
          <ShieldCheck className="absolute -bottom-10 -left-10 w-64 h-64 text-cyan-500/5" />
          
          {lastResult ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 text-center space-y-4">
              <div className="inline-flex w-16 h-16 rounded-full items-center justify-center bg-cyan-500/20 text-cyan-400 mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white px-4">Proses Selesai!</h3>
              <div className="bg-black/40 border border-white/5 rounded-xl p-4 text-left space-y-2 mt-4">
                 <p className="text-xs text-slate-400">Status Respon:</p>
                 <p className="text-lg font-bold text-emerald-400">{lastResult.status}</p>
                 <div className="h-px bg-white/5 my-2" />
                 <p className="text-xs text-slate-400">Catatan/SN Digiflazz:</p>
                 <p className="font-mono text-sm text-cyan-400 select-all">{lastResult.sn}</p>
              </div>
            </motion.div>
          ) : (
             <div className="relative z-10 text-center opacity-40">
                <Zap className="w-12 h-12 mx-auto mb-4" />
                <p className="font-bold">Menunggu Perintah Anda</p>
                <p className="text-xs mt-2">Data topup terakhir akan muncul di sini.</p>
             </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-8 right-8 z-[100]">
          <motion.div 
            initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
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
