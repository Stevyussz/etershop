/**
 * @file src/app/topup/[game]/CheckoutClient.tsx
 * @description Interactive checkout page for a specific game's topup packages.
 *
 * Renders:
 * - Hero banner with game art
 * - Nominal/package selector grid
 * - Player ID + Zone ID form
 * - Payment method selector (with real logos)
 * - Live sales social proof toast
 * - Midtrans Snap payment popup integration
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
 * Add to this set as more games requiring zone IDs are added.
 */
const GAMES_REQUIRING_ZONE_ID = new Set([
  "MOBILE LEGENDS",
  "MAGIC CHESS",
  "ARENA OF VALOR",
]);

/**
 * Curated hero/background metadata for known game brands.
 * Falls back gracefully for unknown brands.
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
  const [selectedSku, setSelectedSku] = useState<string>("");
  const [selectedPayment, setSelectedPayment] = useState<string>("qris");
  const [isLoading, setIsLoading] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherError, setVoucherError] = useState("");
  const [isVoucherApplied, setIsVoucherApplied] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [toastMsg, setToastMsg] = useState<{name: string, item: string} | null>(null);

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
        body: JSON.stringify({ sku: selectedSku, gameId, zoneId })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (window.snap) {
        window.snap.pay(data.token, {
          onSuccess: function(result: any){
            router.push(`/topup/success?order_id=${result.order_id || 'trxkustom'}`);
          },
          onPending: function(result: any){
            router.push(`/topup/success?order_id=${result.order_id || 'trxkustom'}&pending=true`);
          },
          onError: function(result: any){
            router.push('/topup/error');
          },
          onClose: function(){
            console.log('User closed midtrans popup');
          }
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

  /**
   * Applies the voucher code entered by the user.
   * In this version, we support one hardcoded promo code for demonstration.
   * To scale: replace this with an API call to validate against a vouchers collection.
   *
   * The discount is applied as a flat Rp 5.000 reduction on the selected package.
   * Production NOTE: The final price MUST be verified server-side in create-transaction
   * to prevent client-side price manipulation.
   */
  const handleVoucher = () => {
    setVoucherError("");
    if (!voucherCode.trim()) return;

    const VALID_VOUCHERS: Record<string, number> = {
      SULTAN: 5000,
      ETER10: 10000,
    };

    const discount = VALID_VOUCHERS[voucherCode.trim().toUpperCase()];
    if (discount !== undefined) {
      setIsVoucherApplied(true);
    } else {
      setVoucherError("Kode voucher tidak valid atau sudah kadaluarsa.");
    }
  };

  const isValidToPay = !!selectedSku && !!gameId && (!needsZoneId || !!zoneId);
  const basePrice = selectedProduct?.price ?? 0;
  const VOUCHER_DISCOUNT = 5000;
  const finalPrice = isVoucherApplied ? Math.max(0, basePrice - VOUCHER_DISCOUNT) : basePrice;

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

         {/* MAIN CHECKOUT GRID - Clean 2:1 Proportions */}
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
                     initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                     className="overflow-hidden mb-6"
                   >
                      <div className="bg-[#0a0f16] p-4 rounded-xl border border-white/5">
                         <p className="text-slate-300 text-sm leading-relaxed">
                            1. Masuk ke profil dalam game {brand}.<br/>
                            {needsZoneId ? (
                              <>2. Salin User ID dan Zone ID Anda.<br/></>
                            ) : (
                              <>2. Salin User ID Anda.<br/></>
                            )}
                            3. Masukkan ke dalam form tanpa spasi atau tanda kurung.
                         </p>
                      </div>
                   </motion.div>
                 )}
               </AnimatePresence>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="relative">
                   <div className="text-xs text-slate-400 font-bold mb-1.5 ml-1">User ID</div>
                   <input 
                     type="text" value={gameId} onChange={e => setGameId(e.target.value.trim())}
                     placeholder="Contoh: 12345678"
                     className="w-full bg-[#0a0f16] border border-white/10 text-white px-4 py-3.5 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono text-sm sm:text-base placeholder:text-slate-600"
                   />
                 </div>
                 <AnimatePresence>
                   {needsZoneId && (
                     <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                       <div className="text-xs text-slate-400 font-bold mb-1.5 ml-1">Zone ID</div>
                       <input 
                         type="text" value={zoneId} onChange={e => setZoneId(e.target.value.trim())}
                         placeholder="Contoh: 1234"
                         className="w-full bg-[#0a0f16] border border-white/10 text-white px-4 py-3.5 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono text-sm sm:text-base placeholder:text-slate-600"
                       />
                     </motion.div>
                   )}
                 </AnimatePresence>
               </div>
             </motion.div>

             {/* STEP 2: NOMINAL BLOCK */}
             <motion.div 
               initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
               className="bg-[#111823] border border-white/5 rounded-3xl p-5 md:p-8 shadow-xl"
             >
               <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-fuchsia-500 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg shadow-fuchsia-500/20">
                      2
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Pilih Nominal</h2>
                 </div>
                 <div className="hidden sm:flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs px-2.5 py-1 rounded-full font-bold">
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
                               {isSelected && (
                                  <div className="absolute top-3 right-3 bg-fuchsia-500 rounded-full p-0.5 z-10 hidden sm:block">
                                     <CheckCircle2 className="w-4 h-4 text-white" />
                                  </div>
                               )}
                             </button>
                           )
                         })}
                       </div>
                     </div>
                   )
                 })}
               </div>
             </motion.div>

           </div>

           {/* RIGHT COLUMN: Step 3 & Summary (Sticky on Desktop) */}
           <div className="lg:col-span-1">
             <motion.div 
               initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
               className="bg-[#111823] border border-white/5 rounded-3xl p-5 md:p-6 shadow-xl lg:sticky lg:top-24 flex flex-col gap-6"
             >
                {/* PAYMENT METHODS */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center font-bold shadow-lg shadow-emerald-500/20">
                      3
                    </div>
                    <h2 className="text-lg font-bold text-white tracking-tight">Metode Bayar</h2>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {PAYMENT_METHODS.map((pm) => (
                        <button 
                          key={pm.id} onClick={() => setSelectedPayment(pm.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${
                            selectedPayment === pm.id 
                              ? `border-${pm.highlight.split('-')[1]}-400 bg-${pm.highlight.split('-')[1]}-500/10`
                              : `bg-[#0a0f16] border-white/5 hover:bg-white/5`
                          }`}
                        >
                           <div className="w-8 h-8 relative flex items-center justify-center">
                             {(pm as any).image ? (
                               <Image src={(pm as any).image} alt={pm.name} fill className="object-contain" />
                             ) : (
                               <span className="text-xl">{pm.icon}</span>
                             )}
                           </div>
                           <div className="text-left flex-1">
                              <div className="text-white font-bold text-xs">{pm.name}</div>
                           </div>
                           {selectedPayment === pm.id && (
                             <div className={`w-2 h-2 rounded-full ${pm.highlight}`}></div>
                           )}
                        </button>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-white/5 w-full"></div>

                {/* VOUCHER INPUT */}
                <div>
                   <div className="text-xs font-bold text-yellow-500 mb-2 flex items-center gap-1"><Ticket className="w-3.5 h-3.5" /> Kode Promo/Voucher</div>
                   <div className="flex gap-2">
                      <input 
                        type="text" value={voucherCode} onChange={e => setVoucherCode(e.target.value)}
                        disabled={isVoucherApplied} placeholder="Ketik SULTAN..."
                        className="flex-1 bg-[#0a0f16] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500"
                      />
                      {isVoucherApplied ? (
                        <button onClick={() => { setIsVoucherApplied(false); setVoucherCode(""); }} className="bg-rose-500/20 text-rose-400 border border-rose-500/50 px-3 py-2 rounded-lg text-sm font-bold transition-all">Batal</button>
                      ) : (
                        <button onClick={handleVoucher} className="bg-yellow-500 hover:bg-yellow-400 text-black px-3 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50" disabled={!voucherCode}>Klaim</button>
                      )}
                   </div>
                   {isVoucherApplied && <p className="text-emerald-400 text-xs mt-1.5 flex items-center gap-1 font-medium"><Check className="w-3 h-3" /> Potongan Rp 5.000 sukses!</p>}
                </div>

                {/* SUMMARY BLOCK */}
                <div className="bg-[#0a0f16] rounded-xl p-4 border border-white/5 space-y-3">
                   <div className="flex justify-between items-start">
                      <span className="text-xs text-slate-400 font-semibold mt-0.5">Item</span>
                      <span className="text-sm font-bold text-white text-right break-words max-w-[150px]">{selectedProduct ? selectedProduct.name : '-'}</span>
                   </div>
                   <div className="flex justify-between items-start">
                      <span className="text-xs text-slate-400 font-semibold mt-0.5">ID Game</span>
                      <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded text-right">{gameId || '-'}</span>
                   </div>
                   <div className="h-px bg-white/5 w-full"></div>
                   <div className="flex justify-between items-center pt-1">
                      <span className="text-xs font-bold text-slate-300">Total Harga</span>
                      <div className="text-right flex flex-col items-end">
                        {isVoucherApplied && <span className="line-through text-slate-500 text-[10px]">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(basePrice)}</span>}
                        <span className="text-xl font-black text-emerald-400 leading-none">
                          {selectedProduct ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(finalPrice) : "Rp 0"}
                        </span>
                      </div>
                   </div>
                </div>

                <button
                  onClick={handlePayment}
                  disabled={isLoading || !isValidToPay}
                  className={`w-full py-4 rounded-xl font-bold text-base text-white transition-all flex items-center justify-center gap-2 shadow-lg
                    ${isLoading || !isValidToPay
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5" 
                      : "bg-emerald-500 hover:bg-emerald-400 hover:-translate-y-0.5"}
                  `}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2 text-sm drop-shadow-md">Memproses Transaksi...</span>
                  ) : (
                    <>BAYAR SEKARANG <CreditCard className="w-5 h-5" /></>
                  )}
                </button>
             </motion.div>
           </div>

         </div>
      </div>

      {/* FLOAT NOTIFICATIONS */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#111823]/95 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl p-3 flex items-center gap-3 w-max max-w-[90vw]"
          >
            <div className="p-2 bg-blue-500/20 rounded-xl relative shrink-0">
               <BellRing className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-xs sm:text-sm">
               <p className="text-slate-300 font-medium leading-tight">
                 <strong className="text-white">{toastMsg.name}</strong> baru beli <strong className="text-yellow-400">{toastMsg.item}</strong>
               </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
