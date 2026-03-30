/**
 * @file src/app/topup/[game]/CheckoutClient.tsx
 * @description Interactive checkout page for a specific game's topup packages.
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Script from "next/script";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  CheckCircle2, ShieldCheck, Zap, ArrowLeft, 
  CreditCard, BellRing, Info, Flame, ChevronDown, 
  Ticket, Check, X, Gem 
} from "lucide-react";
import { formatRupiah, slugifyBrand } from "@/lib/utils";
// @ts-ignore
import type { TopupProduct, GameConfig } from "@prisma/client";
import { validateVoucher } from "@/app/admin/vouchers/voucher-actions";
import { validateNickname } from "./validator-actions";

// ─────────────────────────────────────────────
// TYPES & CONSTANTS
// ─────────────────────────────────────────────

interface CheckoutClientProps {
  products: TopupProduct[];
  brand: string;
  config?: GameConfig | null;
}

/**
 * Games that require a Zone/Server ID in addition to the player's Game ID.
 */
const GAMES_REQUIRING_ZONE_ID = new Set([
  "MOBILE LEGENDS",
  "MAGIC CHESS",
  "ARENA OF VALOR",
]);

/**
 * Curated hero/background metadata for known game brands.
 */
const GAME_DISPLAY_META: Record<string, { img: string; title: string; ctg: string; bg: string; dev: string }> = {
  "MOBILE LEGENDS": { img: "/games/mobile-legends.png", title: "Mobile Legends", ctg: "MOBA", bg: "/games/promo_ml.png", dev: "Moonton" },
  "FREE FIRE": { img: "/games/free-fire.png", title: "Free Fire", ctg: "Battle Royale", bg: "/games/promo_ff.png", dev: "Garena" },
  "VALORANT": { img: "/games/valorant.png", title: "Valorant", ctg: "FPS", bg: "/games/promo_valo.png", dev: "Riot Games" },
  "GENSHIN IMPACT": { img: "/games/default.png", title: "Genshin Impact", ctg: "RPG", bg: "/games/default.png", dev: "HoYoverse" },
  "PUBG MOBILE": { img: "/games/default.png", title: "PUBG Mobile", ctg: "Battle Royale", bg: "/games/default.png", dev: "Krafton" },
};

/**
 * Resolves display metadata for any brand, with graceful fallback.
 */
function resolveCheckoutMeta(brand: string) {
  const key = brand.trim().toUpperCase();
  const curated = GAME_DISPLAY_META[key];
  return {
    slug: slugifyBrand(brand),
    img: curated?.img ?? "/games/default.png",
    title: curated?.title ?? brand,
    ctg: curated?.ctg ?? "Games",
    bg: curated?.bg ?? "/games/default.png",
    dev: curated?.dev ?? "Publisher",
  };
}

const PAYMENT_METHODS = [
  { id: "qris", name: "QRIS", type: "Instan", image: "/payment/qris.png", color: "from-pink-500/20 to-rose-500/10", border: "border-pink-500", highlight: "bg-pink-500" },
  { id: "gopay", name: "GoPay", type: "E-Wallet", image: "/payment/gopay.png", color: "from-cyan-500/20 to-teal-500/10", border: "border-teal-500", highlight: "bg-teal-500" },
  { id: "dana", name: "DANA", type: "E-Wallet", image: "/payment/dana.png", color: "from-blue-500/20 to-indigo-500/10", border: "border-blue-500", highlight: "bg-blue-500" },
  { id: "shopeepay", name: "ShopeePay", type: "E-Wallet", image: "/payment/shopeepay.png", color: "from-orange-500/20 to-red-500/10", border: "border-orange-500", highlight: "bg-orange-500" },
  { id: "bca", name: "BCA VA", type: "Bank", icon: "🏦", color: "from-blue-700/20 to-blue-900/10", border: "border-indigo-500", highlight: "bg-indigo-500" },
];

export default function CheckoutClient({ products, brand, config }: CheckoutClientProps) {
  const router = useRouter();
  
  // Use config data if available, fallback to resolveCheckoutMeta
  const meta = useMemo(() => {
    const fallback = resolveCheckoutMeta(brand);
    if (!config) return fallback;

    return {
      ...fallback,
      title: config.title || brand,
      bg: config.imageUrl || fallback.bg,
    };
  }, [brand, config]);

  const needsZoneId = GAMES_REQUIRING_ZONE_ID.has(brand.trim().toUpperCase());

  const [gameId, setGameId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [nickname, setNickname] = useState("");
  const [isCheckingNick, setIsCheckingNick] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [nickError, setNickError] = useState("");
  const [selectedSku, setSelectedSku] = useState<string>("");
  const [selectedPayment, setSelectedPayment] = useState<string>("qris");
  const [isLoading, setIsLoading] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherError, setVoucherError] = useState("");
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [isVoucherApplied, setIsVoucherApplied] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [toastMsg, setToastMsg] = useState<{name: string, item: string} | null>(null);

  /** Validates the nickname with automatic failover support */
  const handleCheckNickname = async () => {
    if (!gameId || gameId.length < 5) return setNickError("Masukkan ID Game valid!");
    if (needsZoneId && !zoneId) return setNickError("Masukkan Zone ID!");

    setIsCheckingNick(true);
    setIsRetrying(false);
    setNickError("");
    setNickname("");

    try {
      // Logic for fallback notification: 
      // If the action takes more than 6s, it's likely on the second provider
      const timeoutIndicator = setTimeout(() => setIsRetrying(true), 6000);

      const res = await validateNickname(brand, gameId, zoneId);
      clearTimeout(timeoutIndicator);

      if (res.success && res.nickname) {
        setNickname(res.nickname);
      } else {
        setNickError(res.message || "Gagal cek nickname. Cek ID kembali.");
      }
    } catch (e) {
      setNickError("Layanan pengecekan sedang gangguan.");
    } finally {
      setIsCheckingNick(false);
      setIsRetrying(false);
    }
  };

  /** The currently selected product object, derived from selectedSku */
  const selectedProduct = useMemo(
    () => products.find((p) => p.sku === selectedSku) ?? null,
    [products, selectedSku]
  );

  /** Groups products into 'Top Up' and 'Membership/Paket' */
  const groupedProducts = useMemo(() => {
    const groups: { label: string; items: TopupProduct[]; icon: any }[] = [
      { label: "Top Up Game", items: [], icon: Zap },
      { label: "Membership & Paket", items: [], icon: Ticket },
    ];

    const membershipKws = ["weekly", "monthly", "pass", "membership", "paket", "bundle", "card", "season"];

    products.forEach((p: TopupProduct) => {
      const name = p.name.toLowerCase();
      const sku = p.sku.toLowerCase();
      const isMembership = membershipKws.some(kw => name.includes(kw) || sku.includes(kw));
      if (isMembership) {
        groups[1].items.push(p);
      } else {
        groups[0].items.push(p);
      }
    });

    return groups.filter(g => g.items.length > 0);
  }, [products]);

  useEffect(() => {
    const names = ["Andi", "Rizky", "Budi", "Sarah", "Dimas", "Alya", "Kevin"];
    let isMounted = true;
    
    const showToast = () => {
       if(!isMounted) return;
       if(products.length > 0) {
         const randomName = names[Math.floor(Math.random() * names.length)];
         const randomProduct = products[Math.floor(Math.random() * products.length)];
         setToastMsg({ name: randomName, item: randomProduct.name });
         
         setTimeout(() => {
           if(isMounted) setToastMsg(null);
         }, 4000);
       }
    };
    
    const intervalId = setInterval(showToast, Math.random() * 15000 + 10000);
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [products]);

  const midtransScriptUrl = process.env.NEXT_PUBLIC_MIDTRANS_ENV === "production" 
     ? "https://app.midtrans.com/snap/snap.js"
     : "https://app.sandbox.midtrans.com/snap/snap.js";

  const handlePayment = async () => {
    if (!gameId || !selectedSku) return alert("Harap masukkan ID Game dan pilih nominal!");
    if (needsZoneId && !zoneId) return alert("Harap masukkan Zone ID!");

    setIsLoading(true);
    try {
      const res = await fetch("/api/create-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku: selectedSku, gameId, zoneId, voucherCode: isVoucherApplied ? voucherCode : null })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (window.snap) {
        window.snap.pay(data.token, {
          onSuccess: (result: any) => router.push(`/topup/success?order_id=${result.order_id || 'trxkustom'}`),
          onPending: (result: any) => router.push(`/topup/success?order_id=${result.order_id || 'trxkustom'}&pending=true`),
          onError: () => router.push('/topup/error'),
          onClose: () => console.log('User closed midtrans popup')
        });
      } else {
        alert("Sistem pembayaran gagal dimuat. Periksa koneksi internet Anda.");
      }
    } catch (e: any) {
      alert(e.message || "Gagal memproses transaksi.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoucher = async () => {
    setVoucherError("");
    setVoucherDiscount(0);
    setIsVoucherApplied(false);
    
    if (!voucherCode.trim()) return;
    if (!selectedProduct) return setVoucherError("Pilih nominal terlebih dahulu!");

    setIsLoading(true);
    try {
      const res = await validateVoucher(voucherCode.trim(), selectedProduct.price);
      if (res.success) {
        setVoucherDiscount(res.discount || 0);
        setIsVoucherApplied(true);
      } else {
        setVoucherError(res.message || "Voucher tidak valid.");
      }
    } catch (error) {
      setVoucherError("Gagal memvalidasi voucher.");
    } finally {
      setIsLoading(false);
    }
  };

  const isValidToPay = !!selectedSku && !!gameId && (!needsZoneId || !!zoneId);
  const basePrice = selectedProduct?.price ?? 0;
  const finalPrice = isVoucherApplied ? Math.max(0, basePrice - voucherDiscount) : basePrice;

  return (
    <>
      <Script src={midtransScriptUrl} data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY} strategy="lazyOnload" />

      {/* HEADER HERO SECTION */}
      <div className="absolute top-0 left-0 w-full h-[400px] md:h-[500px] overflow-hidden -z-10 bg-[#0a0f16]">
         <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f16] via-[#0a0f16]/90 to-[#0a0f16]/30 z-10"></div>
         <motion.div 
           initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 0.5, scale: 1 }} transition={{ duration: 1 }}
           className="w-full h-full relative"
         >
            <Image 
              src={meta.bg} 
              alt={meta.title} 
              fill 
              className="object-cover object-top filter contrast-125 brightness-75" 
              priority 
              unoptimized={true}
            />
         </motion.div>
      </div>

      <div className="max-w-6xl mx-auto pt-6 px-0 md:px-0">
         {/* Title Block */}
         <div className="flex items-center gap-4 mb-8">
            <Link href="/topup" className="flex-shrink-0 p-3 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors backdrop-blur-md">
               <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
               <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight drop-shadow-lg">
                   {meta.title}
               </h1>
               <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="bg-blue-500/20 text-blue-400 px-2.5 py-1 rounded text-xs font-bold border border-blue-500/20">{meta.ctg}</span>
                  <span className="text-slate-300 text-xs font-medium bg-white/5 px-2.5 py-1 rounded">Dev: {meta.dev}</span>
                  <span className="text-emerald-400 text-xs font-bold flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded"><Zap className="w-3 h-3"/> Proses Instan</span>
               </div>
            </div>
         </div>

         {/* MAIN CHECKOUT GRID */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
           
           {/* LEFT COLUMN: Steps 1 & 2 */}
           <div className="lg:col-span-2 flex flex-col gap-6">
             
             {/* STEP 1: ACCOUNT DATA */}
             <motion.div 
               initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
               className="bg-[#111823] border border-white/5 rounded-3xl p-5 md:p-8 shadow-xl"
             >
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-500/20">
                      1
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Data Akun</h2>
                 </div>
                 <button 
                   onClick={() => setShowHowTo(!showHowTo)}
                   className="text-blue-400 text-sm font-semibold flex items-center gap-1 hover:text-blue-300 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 w-max"
                 >
                   Petunjuk <ChevronDown className={`w-4 h-4 transition-transform ${showHowTo ? 'rotate-180' : ''}`} />
                 </button>
               </div>

               <AnimatePresence>
                 {showHowTo && (
                   <motion.div 
                     initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                     className="overflow-hidden mb-6"
                   >
                     <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-slate-300 text-sm leading-relaxed">
                        Masukkan User ID dan Zone ID akun Anda. Anda bisa menekan tombol petunjuk ini untuk melihat cara menemukannya di dalam game. Pastikan data yang dimasukkan sudah benar untuk menghindari kesalahan pengiriman.
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">User ID</label>
                    <div className="relative">
                      <input 
                        type="text" value={gameId} onChange={(e) => setGameId(e.target.value)}
                        placeholder="Masukkan User ID"
                        className="w-full bg-[#0a0f16] border border-white/10 rounded-2xl py-4 px-6 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                      />
                      {!needsZoneId && gameId.length > 4 && !nickname && (
                        <button 
                          onClick={handleCheckNickname}
                          disabled={isCheckingNick}
                          className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold px-3 py-2 rounded-xl flex items-center gap-1 shadow-lg shadow-blue-500/20"
                        >
                          {isCheckingNick ? (
                            <div className="flex items-center gap-2">
                               <Loader2 className="w-3 h-3 animate-spin"/>
                               {isRetrying && <span>RETRYING...</span>}
                            </div>
                          ) : "CEK"}
                        </button>
                      )}
                    </div>
                  </div>
                  {needsZoneId && (
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Zone ID</label>
                      <div className="relative">
                        <input 
                          type="text" value={zoneId} onChange={(e) => setZoneId(e.target.value)}
                          placeholder="Masukkan Zone ID"
                          className="w-full bg-[#0a0f16] border border-white/10 rounded-2xl py-4 px-6 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                        />
                        {gameId.length > 4 && zoneId.length >= 4 && !nickname && (
                          <button 
                            onClick={handleCheckNickname}
                            disabled={isCheckingNick}
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold px-3 py-2 rounded-xl flex items-center gap-1 shadow-lg shadow-blue-500/20"
                          >
                            {isCheckingNick ? (
                               <div className="flex items-center gap-2">
                                  <Loader2 className="w-3 h-3 animate-spin"/>
                                  {isRetrying && <span>RETRYING...</span>}
                               </div>
                            ) : "CEK"}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
               </div>

               <AnimatePresence>
                 {(isCheckingNick && isRetrying) && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] text-blue-400 font-bold mt-3 ml-1 animate-pulse">
                       ⏳ Server utama sedang sibuk, beralih ke server cadangan...
                    </motion.p>
                 )}
                 {(nickname || nickError) && (
                   <motion.div 
                     initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                     className="mt-6"
                   >
                     {nickname ? (
                       <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                             </div>
                             <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Username Ditemukan</div>
                                <div className="text-xl font-black text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{nickname}</div>
                             </div>
                          </div>
                          <div className="hidden sm:block text-[10px] font-bold text-emerald-500/60 mr-2">Verified ✅</div>
                       </div>
                     ) : (
                       <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3">
                          <X className="w-5 h-5 text-rose-500" />
                          <span className="text-sm font-bold text-rose-400">{nickError}</span>
                       </div>
                     )}
                   </motion.div>
                 )}
               </AnimatePresence>
             </motion.div>

             {/* STEP 2: SELECT NOMINAL */}
             <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
                className="bg-[#111823] border border-white/5 rounded-3xl p-5 md:p-8 shadow-xl"
             >
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-fuchsia-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg shadow-fuchsia-600/20">
                      2
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Pilih Nominal</h2>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
                    <Flame className="w-3.5 h-3.5" /> Terlaris
                  </div>
                </div>
                
                <div className="space-y-10">
                  {groupedProducts.map((group: { label: string; items: TopupProduct[]; icon: any }) => {
                    const GroupIcon = group.icon;
                    return (
                      <div key={group.label} className="space-y-4">
                        <div className="flex items-center gap-2 text-slate-400 mb-4 ml-1">
                          <GroupIcon className="w-4 h-4 text-fuchsia-500" />
                          <h3 className="text-sm font-black uppercase tracking-widest">{group.label}</h3>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                          {group.items.map((p: TopupProduct, idx: number) => {
                            const isSelected = selectedSku === p.sku;
                            const isHot = idx === 0 && group.label === "Top Up Game";
                            const isDiamond = p.name.toLowerCase().includes("diamond");
                            return (
                              <button
                                key={p.sku}
                                onClick={() => setSelectedSku(p.sku)}
                                className={`relative p-4 md:p-5 text-left flex flex-col justify-center transition-all duration-200 rounded-2xl border overflow-hidden bg-[#0a0f16] group ${
                                  isSelected 
                                    ? "border-fuchsia-400/80 bg-fuchsia-500/5 ring-1 ring-fuchsia-400/50 shadow-[0_0_15px_rgba(217,70,239,0.15)]" 
                                    : "border-white/5 hover:border-white/20 hover:bg-[#1a2333]"
                                }`}
                              >
                                {isHot && !isSelected && (
                                   <span className="absolute -right-6 top-2 bg-gradient-to-r from-rose-600 to-red-600 text-[8px] font-black tracking-widest text-white px-8 py-0.5 rotate-45 z-10 shadow-md">HOT</span>
                                )}
                                
                                {isDiamond && (
                                   <Gem className="w-4 h-4 text-cyan-400 mb-2 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
                                )}
                                
                                <span className="text-white font-bold text-sm md:text-base mb-1 z-10 leading-tight">{p.name}</span>
                                <span className={`font-semibold z-10 text-xs md:text-sm transition-colors ${isSelected ? 'text-fuchsia-400' : 'text-slate-400'}`}>
                                  {formatRupiah(p.price)}
                                </span>
                                
                                <div className={`absolute inset-0 bg-gradient-to-br from-fuchsia-600/10 to-transparent transition-opacity duration-300 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
             </motion.div>
           </div>

           {/* RIGHT COLUMN: Step 3 & Summary */}
           <div className="flex flex-col gap-6">
             
             {/* STEP 3: PAYMENT */}
             <motion.div 
               initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
               className="bg-[#111823] border border-white/5 rounded-3xl p-5 md:p-8 shadow-xl"
             >
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg shadow-emerald-600/20">
                    3
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Pembayaran</h2>
                </div>

                <div className="space-y-3">
                   {PAYMENT_METHODS.map((pm) => (
                     <button
                        key={pm.id}
                        onClick={() => setSelectedPayment(pm.id)}
                        className={`w-full group relative overflow-hidden flex items-center justify-between p-4 rounded-2xl border transition-all ${
                          selectedPayment === pm.id 
                            ? `bg-gradient-to-r ${pm.color} ${pm.border} border-opacity-50 shadow-lg` 
                            : "bg-[#0a0f16] border-white/5 hover:border-white/20"
                        }`}
                     >
                       <div className="flex items-center gap-4 z-10">
                          <div className={`w-12 h-8 bg-white/5 rounded-lg flex items-center justify-center p-1 border border-white/5 transition-colors ${selectedPayment === pm.id ? 'bg-white/10' : ''}`}>
                             {pm.image ? <Image src={pm.image} alt={pm.name} width={40} height={20} className="object-contain" /> : <span className="text-lg">{pm.icon}</span>}
                          </div>
                          <div className="text-left">
                            <div className="text-white font-bold text-sm">{pm.name}</div>
                            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-black">{pm.type}</div>
                          </div>
                       </div>
                       <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all z-10 ${selectedPayment === pm.id ? 'bg-white border-transparent' : 'border-white/10'}`}>
                          {selectedPayment === pm.id && <Check className="w-3 h-3 text-emerald-600" />}
                       </div>
                       {selectedPayment === pm.id && (
                         <motion.div layoutId="pay-highlight" className={`absolute left-0 w-1.5 h-full ${pm.highlight}`} />
                       )}
                     </button>
                   ))}
                </div>

                {/* VOUCHER SECTION */}
                <div className="mt-8 pt-8 border-t border-white/5">
                   <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1 block mb-3">Promo / Voucher</label>
                   <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input 
                          type="text" value={voucherCode} onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                          placeholder="KODE PROMO"
                          className="w-full bg-[#0a0f16] border border-white/10 rounded-2xl py-3 px-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 uppercase font-black tracking-widest text-sm"
                        />
                      </div>
                      <button 
                         onClick={handleVoucher}
                         disabled={isLoading || !voucherCode}
                         className="bg-white hover:bg-slate-200 disabled:opacity-50 text-black font-black px-6 rounded-2xl text-xs transition-all flex items-center gap-2"
                      >
                         {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "CEK"}
                      </button>
                   </div>
                   {voucherError && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-rose-500 text-[10px] font-bold mt-2 ml-1">{voucherError}</motion.p>}
                   {isVoucherApplied && (
                     <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2 text-emerald-400 text-[10px] font-bold mt-2 ml-1 bg-emerald-500/10 w-fit px-2 py-1 rounded-lg border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" /> Voucher berhasil diterapkan! Potongan {formatRupiah(voucherDiscount)}
                     </motion.div>
                   )}
                </div>
             </motion.div>

             {/* ORDER SUMMARY BLOCK */}
             <motion.div 
               initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}
               className="bg-[#111823] border border-white/5 rounded-3xl p-8 shadow-xl relative overflow-hidden"
             >
                <div className="relative z-10 space-y-6">
                   <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-white tracking-tight">Ringkasan</h3>
                      <ShieldCheck className="w-5 h-5 text-emerald-500" />
                   </div>

                   <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Produk</span>
                        <span className="text-white font-medium text-right max-w-[150px] truncate">{selectedProduct?.name || "-"}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Pembayaran</span>
                        <span className="text-white font-medium">{PAYMENT_METHODS.find(p => p.id === selectedPayment)?.name}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Harga Dasar</span>
                        <span className="text-white font-medium">{formatRupiah(basePrice)}</span>
                      </div>
                      {isVoucherApplied && (
                        <div className="flex justify-between text-sm">
                          <span className="text-emerald-500">Diskon Voucher</span>
                          <span className="text-emerald-500 font-bold">-{formatRupiah(voucherDiscount)}</span>
                        </div>
                      )}
                      
                      <div className="h-px bg-white/5 my-4" />
                      
                      <div className="flex justify-between items-end">
                        <span className="text-slate-500 text-xs pb-1">Total Pembayaran</span>
                        <span className="text-2xl font-black text-white">{formatRupiah(finalPrice)}</span>
                      </div>
                   </div>

                   <button 
                     onClick={handlePayment}
                     disabled={!isValidToPay || isLoading}
                     className={`w-full py-5 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl ${
                       isValidToPay && !isLoading
                         ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20 active:scale-95" 
                         : "bg-white/5 text-slate-600 cursor-not-allowed"
                     }`}
                   >
                     {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6" />}
                     KONFIRMASI TOP UP
                   </button>
                   
                   <p className="text-[10px] text-center text-slate-600 mt-4 leading-relaxed">
                     Dengan menekan tombol di atas, Anda menyetujui <span className="text-slate-400 underline">Syarat & Ketentuan</span> kami. Proses pengiriman biasanya memakan waktu 1-5 menit.
                   </p>
                </div>
                
                {/* Subtle Decorative Elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl -z-10" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-fuchsia-500/5 blur-3xl -z-10" />
             </motion.div>
           </div>

         </div>
      </div>

      {/* FLOATING TOASTS (Social Proof) */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div 
            initial={{ opacity: 0, x: 50, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 50, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 bg-[#1a2333]/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl flex items-center gap-4 max-w-sm"
          >
             <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-fuchsia-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                <BellRing className="w-5 h-5" />
             </div>
             <div>
                <div className="text-white text-xs font-bold">{toastMsg.name} baru saja membeli</div>
                <div className="text-fuchsia-400 text-[10px] font-black uppercase tracking-widest mt-0.5">{toastMsg.item}</div>
                <div className="text-slate-500 text-[9px] mt-1">1 menit yang lalu • Verified ✅</div>
             </div>
             <button onClick={() => setToastMsg(null)} className="ml-2 text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
             </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Loader2({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}
