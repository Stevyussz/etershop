"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { slugifyBrand } from "@/lib/utils";
import { 
  Zap, Flame, Monitor, Smartphone, ChevronRight, 
  Search, ShieldCheck, Trophy, Clock, Gamepad, Gift,
  ImageIcon, Sparkles, Wallet
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
        // Map Digiflazz category to UI Label ONLY IF admin hasn't set a manual override
        let uiCtg: string = config?.category as string;
        
        // Handle legacy manual overrides (Mobile/PC)
        if (uiCtg === "Mobile" || uiCtg === "PC") {
          uiCtg = "Games";
        }
        
        if (!uiCtg) {
          const rawCtg = g.category || "Games";
          if (rawCtg === "Pulsa") uiCtg = "Pulsa & Data";
          else if (rawCtg === "PLN") uiCtg = "Token PLN";
          else if (rawCtg === "E-Money") uiCtg = "E-Wallet";
          else if (rawCtg === "Voucher") uiCtg = "Voucher";
          else uiCtg = "Games";
        }

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

  // Helper render for single item (used in grid OR horizontal row)
  const renderItem = (game: GameMeta, idx: number) => (
    <motion.div
      key={game.slug}
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3, delay: Math.min(idx * 0.03, 0.2) }}
      className="shrink-0 w-[140px] sm:w-[160px] md:w-[200px] h-full"
    >
      <Link href={`/topup/${game.slug}`} className="block group h-full">
        <div className="relative aspect-[3/4] w-full h-full rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden bg-[#111823] border border-white/[0.03] shadow-2xl transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-[0_20px_40px_-10px_rgba(59,130,246,0.3)] group-hover:border-blue-500/30">
          
          {game.img ? (
            <Image
              src={game.img}
              alt={game.title}
              fill
              className="object-cover transition-transform duration-1000 group-hover:scale-110"
              sizes="(max-width: 640px) 140px, (max-width: 768px) 160px, 200px"
              unoptimized={true} 
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#111823] to-[#0a0f16]">
               <ImageIcon className="w-10 h-10 text-slate-800 mb-2 opacity-50" />
               <span className="text-[10px] text-slate-700 font-black uppercase tracking-widest text-center px-4 leading-tight">{game.title}</span>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f16] via-[#0a0f16]/40 to-transparent opacity-90 transition-opacity duration-300 group-hover:opacity-100" />
          
          {game.isPopular && (
            <div className="absolute top-3 right-3 md:top-4 md:right-4 z-10 animate-bounce">
              <div className="bg-gradient-to-tr from-rose-600 to-orange-500 text-white rounded-full p-1.5 md:p-2 shadow-lg shadow-rose-500/30">
                <Flame className="w-3 h-3 md:w-4 md:h-4" />
              </div>
            </div>
          )}

          <div className="absolute bottom-0 w-full p-4 md:p-5 flex flex-col gap-1.5 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
             <span className="text-[9px] md:text-[10px] font-black tracking-[0.2em] text-blue-400 uppercase">
                {game.ctg}
             </span>
             <h4 className="text-white font-black text-xs sm:text-sm md:text-lg leading-tight truncate">
                {game.title}
             </h4>
             <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity pt-1">
                <div className="flex items-center gap-1.5 text-blue-400 font-black">
                   <Zap className="w-3 h-3 md:w-3.5 md:h-3.5 fill-blue-400/20" />
                   <span className="text-[8px] md:text-[10px] uppercase tracking-[0.15em]">INSTAN</span>
                </div>
                <ChevronRight className="w-3 h-3 md:w-4 md:h-4 text-white/40" />
             </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );

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

      {/* ── SEAMLESS FILTER & SEARCH BAR ── */}
      <div className="container mx-auto px-4 max-w-7xl mt-12 mb-12">
        <div className="bg-[#111823]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-4 md:p-6 shadow-2xl flex flex-col lg:flex-row gap-6 lg:items-center justify-between transition-all duration-300">
          
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 lg:py-0 scroll-smooth">
            {CATEGORIES.map(({ label, icon: Icon }) => {
              const isActive = activeTab === label;
              return (
                <button
                  key={label}
                  onClick={() => { setActiveTab(label); setSearchQuery(""); }}
                  className={`relative px-5 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all duration-500 flex items-center gap-2.5 text-xs md:text-sm group/btn ${
                    isActive 
                      ? "text-white bg-blue-600 shadow-[0_0_30px_rgba(37,99,235,0.4)]" 
                      : "text-slate-500 hover:text-slate-200 hover:bg-white/10 border border-transparent hover:border-white/5"
                  }`}
                >
                  <div className={`transition-transform duration-300 ${isActive ? "scale-110" : "group-hover/btn:scale-110"}`}>
                    <Icon className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isActive ? "text-white" : "text-slate-500"}`} />
                  </div>
                  {label}
                  {isActive && (
                    <motion.div layoutId="activeTabGlow" className="absolute inset-0 rounded-xl bg-blue-400/10 blur-xl -z-10" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="relative group w-full lg:w-[320px] xl:w-[450px]">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 group-focus-within:scale-110 transition-all" />
            <input
              type="text"
              placeholder="Cari voucher atau game favoritmu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0a0f16]/40 border border-white/10 text-white pl-14 pr-6 py-4 rounded-2xl focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm md:text-base placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* ── PREMIUM CATALOG RENDER ── */}
        <div className="mt-12 md:mt-20">
          
          {/* HORIZONTAL CAROUSEL RENDER FOR "SEMUA" MODE */}
          {activeTab === "Semua" && searchQuery === "" ? (
             <div className="space-y-16">
                {CATEGORIES.filter(c => c.label !== "Semua").map(({ label, icon: Icon }) => {
                  const items = filteredGames.filter(g => g.ctg === label);
                  if (items.length === 0) return null;

                  return (
                    <div key={label} className="flex flex-col">
                       <div className="flex items-center justify-between mb-6 px-2">
                         <h3 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
                            <Icon className="w-6 h-6 md:w-8 md:h-8 text-blue-500" /> {label}
                         </h3>
                         <button onClick={() => setActiveTab(label)} className="text-blue-500 hover:text-white text-sm font-bold flex items-center transition-colors">
                            Lihat Semua <ChevronRight className="w-4 h-4 ml-1" />
                         </button>
                       </div>
                       
                       <div className="flex overflow-x-auto gap-4 md:gap-6 pb-8 snap-x snap-mandatory no-scrollbar px-2 styled-scrollbars-hidden">
                          <AnimatePresence mode="popLayout">
                             {items.map((game, idx) => (
                               <div key={game.slug} className="snap-start">
                                 {renderItem(game, idx)}
                               </div>
                             ))}
                          </AnimatePresence>
                       </div>
                    </div>
                  );
                })}
             </div>
          ) : (
            /* STANDARD GRID RENDER FOR SPECIFIC TABS OR SEARCH */
            <>
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl md:text-3xl font-black text-white flex items-center gap-3">
                   {searchQuery ? <Search className="text-blue-500 w-6 h-6 md:w-8 md:h-8" /> : <Gamepad className="w-6 h-6 md:w-8 md:h-8 text-blue-500" />} 
                   {searchQuery ? "Hasil Pencarian" : `Katalog ${activeTab !== "Semua" ? activeTab : "Populer"}`}
                </h3>
                <div className="h-px flex-1 bg-gradient-to-r from-blue-500/20 to-transparent mx-6 hidden md:block" />
                <span className="text-slate-500 font-bold text-sm hidden md:block">
                   Menampilkan <span className="text-white">{filteredGames.length}</span> Produk
                </span>
              </div>

              <motion.div
                layout
                className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-6 lg:gap-8 auto-rows-fr"
              >
                <AnimatePresence mode="popLayout">
                  {filteredGames.map((game, idx) => (
                    <div key={game.slug} className="h-full">
                       {renderItem(game, idx)}
                    </div>
                  ))}
                </AnimatePresence>
              </motion.div>

              {filteredGames.length === 0 && (
                <div className="py-32 text-center bg-[#111823]/30 rounded-[3rem] border border-white/5">
                   <Search className="w-16 h-16 text-slate-800 mx-auto mb-4" />
                   <h3 className="text-2xl font-bold text-white mb-2">Pencarian Tidak Ditemukan</h3>
                   <p className="text-slate-500 mb-6">Mungkin kata kuncinya salah? Coba hapus filter pencarian.</p>
                   <button 
                      onClick={() => setSearchQuery("")}
                      className="px-8 py-3 bg-white text-black rounded-2xl font-black text-sm hover:scale-105 transition-transform"
                   >
                      Bersihkan
                   </button>
                </div>
              )}
            </>
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
