/**
 * @file src/app/topup/TopupCatalogClient.tsx
 * @description Client-side game catalog with premium "Poster Grid" layout.
 *
 * This component handles:
 * - Real-time filtering and search
 * - Hero slider for promotions
 * - Animated grid of game posters
 * - Dynamic metadata resolution from DB or fallback defaults
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { slugifyBrand } from "@/lib/utils";
import { 
  Zap, Flame, Monitor, Smartphone, ChevronRight, 
  Search, ShieldCheck, Trophy, Clock, Gamepad, Gift,
  ImageIcon, Sparkles, TicketCheck, Wallet
} from "lucide-react";

type GameCategory = "Semua" | "Mobile" | "PC" | "Voucher" | "Lainnya";

interface GameMeta {
  slug: string;
  img: string | null;
  title: string;
  ctg: GameCategory;
  brand: string;
  isPopular: boolean;
}

const CATEGORIES: { label: string; icon: React.ElementType }[] = [
  { label: "Semua", icon: Flame },
  { label: "Games", icon: Gamepad },
  { label: "Pulsa & Data", icon: Smartphone },
  { label: "Token PLN", icon: Zap },
  { label: "E-Wallet", icon: Wallet },
  { label: "Voucher", icon: Gift },
];

const BANNERS = [
  {
    id: 1,
    image: "/games/promo_ml.png",
    label: "Hot Promo",
    title: "Mobile Legends",
    subtitle: "Diamond terlengkap, proses kilat 1 detik!",
    gradient: "from-blue-900/80 to-indigo-900/80",
  },
  {
    id: 2,
    image: "/games/promo_valo.png",
    label: "Flash Sale",
    title: "Valorant Night Market",
    subtitle: "VP Points harga spesial, stok terbatas!",
    gradient: "from-red-900/80 to-rose-900/80",
  },
  {
    id: 3,
    image: "/games/promo_ff.png",
    label: "New Event",
    title: "Free Fire Season Baru",
    subtitle: "Top Up Diamond & dapat bonus item eksklusif!",
    gradient: "from-orange-900/80 to-yellow-900/80",
  },
];

interface Props {
  games: { brand: string }[];
  configs: any[];
}

export default function TopupCatalogClient({ games, configs }: Props) {
  const [activeTab, setActiveTab] = useState<string>("Semua");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Auto-advance hero slider
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % BANNERS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  /**
   * Merge raw brand names from TopupProduct with custom metadata from GameConfig.
   */
  const allGames = useMemo(() => {
    const seen = new Map<string, GameMeta>();
    
    games.forEach((g: any) => {
      const config = configs.find(c => c.brand.trim().toUpperCase() === (g.brand || "").trim().toUpperCase());
      const slug = slugifyBrand(g.brand);
      
      if (!seen.has(slug)) {
        // Map Digiflazz category to UI Label
        let uiCtg: string = "Games";
        const rawCtg = g.category || "Games";
        
        if (rawCtg === "Pulsa") uiCtg = "Pulsa & Data";
        else if (rawCtg === "PLN") uiCtg = "Token PLN";
        else if (rawCtg === "E-Money") uiCtg = "E-Wallet";
        else if (rawCtg === "Voucher") uiCtg = "Voucher";
        else uiCtg = "Games";

        seen.set(slug, {
          brand: g.brand,
          slug: slug,
          img: config?.imageUrl || null,
          title: g.brand, 
          ctg: (uiCtg || "Games") as any,
          isPopular: config?.isPopular || false
        });
      }
    });

    return Array.from(seen.values());
  }, [games, configs]);

  // Combined filter & search
  const filteredGames = useMemo(() => {
    let result = activeTab === "Semua" ? allGames : allGames.filter((g) => g.ctg === activeTab);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((g) => g.title.toLowerCase().includes(q));
    }
    return result;
  }, [allGames, activeTab, searchQuery]);

  return (
    <div className="pb-32">
      {/* ── STUNNING HERO SLIDER ── */}
      <div className="relative w-full h-[40vh] md:h-[55vh] max-h-[600px] overflow-hidden">
        <AnimatePresence initial={false}>
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <Image
              src={BANNERS[currentSlide].image}
              alt={BANNERS[currentSlide].title}
              fill
              className="object-cover"
              priority
            />
            {/* Layers of gradients for that "Netflix" depth effect */}
            <div className={`absolute inset-0 bg-gradient-to-t ${BANNERS[currentSlide].gradient} mix-blend-multiply opacity-60`} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f16] via-[#0a0f16]/30 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0f16]/80 via-transparent to-transparent hidden md:block" />

            {/* Banner Copy */}
            <div className="absolute bottom-0 left-0 w-full p-8 md:p-20 z-10 container mx-auto">
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-md"
              >
                <Sparkles className="w-3 h-3" /> {BANNERS[currentSlide].label}
              </motion.div>
              <motion.h2
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-4xl md:text-6xl lg:text-8xl font-black text-white mb-2 leading-[0.9] tracking-tighter drop-shadow-2xl"
              >
                {BANNERS[currentSlide].title}
              </motion.h2>
              <motion.p
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-base md:text-xl text-slate-300 max-w-xl font-medium leading-relaxed"
              >
                {BANNERS[currentSlide].subtitle}
              </motion.p>
              
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="mt-8 hidden md:block"
              >
                <Link href="/topup" className="bg-white text-black px-8 py-3.5 rounded-2xl font-black text-sm hover:scale-105 transition-transform flex items-center gap-2 w-fit">
                   Beli Sekarang <ChevronRight className="w-5 h-5" />
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Indicator dots */}
        <div className="absolute bottom-12 right-8 md:bottom-20 md:right-20 z-20 flex gap-2">
          {BANNERS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                currentSlide === idx ? "w-10 bg-white" : "w-4 bg-white/20 hover:bg-white/40"
              }`}
            />
          ))}
        </div>
      </div>

      {/* ── FLOATING FILTER BAR ── */}
      <div className="container mx-auto px-4 -mt-10 md:-mt-14 max-w-7xl relative z-30">
        <div className="bg-[#111823]/60 backdrop-blur-3xl border border-white/5 rounded-3xl p-3 md:p-4 shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
          
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 lg:py-0">
            {CATEGORIES.map(({ label, icon: Icon }) => {
              const isActive = activeTab === label;
              return (
                <button
                  key={label}
                  onClick={() => setActiveTab(label)}
                  className={`relative px-6 py-3 rounded-2xl font-bold whitespace-nowrap transition-all duration-300 flex items-center gap-2.5 text-sm md:text-base ${
                    isActive ? "text-white bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.4)]" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "animate-pulse" : ""}`} />
                  {label}
                </button>
              );
            })}
          </div>

          <div className="relative group w-full lg:w-[400px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
            <input
              type="text"
              placeholder="Cari voucher game..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0a0f16]/80 border border-white/10 text-white pl-12 pr-4 py-3.5 rounded-2xl focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all text-sm md:text-base"
            />
          </div>
        </div>

        {/* ── PREMIUM POSTER GRID ── */}
        <div className="mt-12 md:mt-20">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl md:text-3xl font-black text-white flex items-center gap-3">
               <Gamepad className="w-6 h-6 md:w-8 md:h-8 text-blue-500" /> Katalog Populer
            </h3>
            <div className="h-px flex-1 bg-gradient-to-r from-blue-500/20 to-transparent mx-6 hidden md:block" />
            <span className="text-slate-500 font-bold text-sm hidden md:block">
               Menampilkan <span className="text-white">{filteredGames.length}</span> Judul
            </span>
          </div>

          <motion.div
            layout
            className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-6 lg:gap-8"
          >
            <AnimatePresence mode="popLayout">
              {filteredGames.map((game, idx) => (
                <motion.div
                  key={game.slug}
                  layout
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.4, delay: Math.min(idx * 0.05, 0.4) }}
                >
                  <Link href={`/topup/${game.slug}`} className="block group">
                    <div className="relative aspect-[3/4] rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden bg-[#111823] border border-white/[0.03] shadow-2xl transition-all duration-500 group-hover:-translate-y-3 group-hover:shadow-[0_20px_40px_-10px_rgba(59,130,246,0.3)] group-hover:border-blue-500/30">
                      
                      {/* Base Image or Placeholder */}
                      {game.img ? (
                        <Image
                          src={game.img}
                          alt={game.title}
                          fill
                          className="object-cover transition-transform duration-1000 group-hover:scale-110"
                          sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 20vw"
                          unoptimized={true} // Allow external images more easily
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#111823] to-[#0a0f16]">
                           <ImageIcon className="w-10 h-10 text-slate-800 mb-2 opacity-50" />
                           <span className="text-[10px] text-slate-700 font-black uppercase tracking-widest text-center px-4">Missing Cover</span>
                        </div>
                      )}

                      {/* Overlays */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f16] via-transparent to-transparent opacity-90 transition-opacity duration-500 group-hover:opacity-60" />
                      
                      {/* Glowing border effect on hover */}
                      <div className="absolute inset-0 border-2 border-blue-500/0 group-hover:border-blue-500/40 rounded-[inherit] transition-all duration-500" />
                      
                      {/* Brand & Name Info (No Pill) */}
                      <div className="absolute bottom-0 inset-x-0 p-3 md:p-6 z-20">
                        <div className="flex flex-col gap-1.5 group-hover:-translate-y-1 transition-transform duration-500">
                           <h4 className="text-white font-black text-[11px] sm:text-[13px] md:text-lg leading-tight group-hover:text-blue-400 transition-colors drop-shadow-md [text-shadow:_0_2px_10px_rgb(0_0_0_/_100%)]">
                              {game.title}
                           </h4>
                           <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-blue-400 font-black">
                                 <Zap className="w-3 h-3 md:w-3.5 md:h-3.5 fill-blue-400/20" />
                                 <span className="text-[8px] md:text-[10px] uppercase tracking-[0.15em] drop-shadow-lg">INSTAN</span>
                              </div>
                              <ChevronRight className="w-3 h-3 md:w-4 md:h-4 text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all" />
                           </div>
                        </div>
                      </div>

                      {/* Hot Badge */}
                      {game.isPopular && (
                        <div className="absolute top-4 left-4 z-30">
                           <div className="bg-rose-600/90 text-white text-[10px] font-black px-3 py-1 rounded-full border border-rose-400/40 shadow-lg shadow-rose-900/40 flex items-center gap-1 animate-pulse">
                              <Flame className="w-3 h-3" /> HOT
                           </div>
                        </div>
                      )}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Empty State */}
          {filteredGames.length === 0 && (
            <div className="py-32 text-center bg-[#111823]/30 rounded-[3rem] border border-white/5">
               <Search className="w-16 h-16 text-slate-800 mx-auto mb-4" />
               <h3 className="text-2xl font-bold text-white mb-2">Game tidak ditemukan</h3>
               <p className="text-slate-500 mb-6">Mungkin kata kuncinya salah? Coba hapus filter pencarian.</p>
               <button 
                  onClick={() => setSearchQuery("")}
                  className="px-8 py-3 bg-white text-black rounded-2xl font-black text-sm hover:scale-105 transition-transform"
               >
                  Reset Pencarian
               </button>
            </div>
          )}
        </div>
      </div>

      {/* ── TRUST SECTION ── */}
      <section className="container mx-auto px-4 max-w-7xl mt-40">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: ShieldCheck, color: "blue", title: "Layanan Terpercaya", desc: "Verifikasi otomatis 24/7. Item terkirim aman ke akun resmi." },
            { icon: Clock, color: "rose", title: "Proses Detik", desc: "Metode pembayaran API memproses top up kamu dalam hitungan detik." },
            { icon: Trophy, color: "amber", title: "Terbaik & Termurah", desc: "Harga termurah di kelasnya dengan pelayanan yang VIP." },
          ].map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className="bg-white/[0.02] border border-white/[0.05] p-8 rounded-[2.5rem] flex flex-col items-center text-center group hover:bg-white/[0.04] transition-colors">
               <div className={`w-16 h-16 rounded-2xl bg-${color}-500/10 flex items-center justify-center text-${color}-400 mb-6 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-8 h-8" />
               </div>
               <h4 className="text-white font-black text-xl mb-2">{title}</h4>
               <p className="text-slate-500 leading-relaxed text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
