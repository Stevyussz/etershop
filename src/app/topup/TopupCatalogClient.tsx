/**
 * @file src/app/topup/TopupCatalogClient.tsx
 * @description Client-side interactive catalog for the Topup page.
 *
 * Renders a hero slider, search bar, category filter tabs, and the game grid.
 * All data is passed from the server component (TopupPage) to keep this component
 * purely presentational — no data fetching happens here.
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { slugifyBrand } from "@/lib/utils";
import { Zap, Flame, Monitor, Smartphone, ChevronRight, Search, ShieldCheck, Trophy, Clock, Gamepad, Gift } from "lucide-react";

// ─────────────────────────────────────────────
// GAME METADATA CATALOGUE
// ─────────────────────────────────────────────

/**
 * Category types for filtering.
 * "Mobile" = Mobile games, "PC" = Desktop games, "Voucher" = Digital vouchers.
 */
type GameCategory = "Semua" | "Mobile" | "PC" | "Voucher" | "Lainnya";

interface GameMeta {
  slug: string;
  img: string;
  title: string;
  ctg: GameCategory;
  brand: string; // Keep original brand for deduplication
}

/**
 * Curated metadata for well-known games.
 * Add entries here as new games are added to the Digiflazz catalog.
 * Key: UPPERCASE brand name exactly as returned by Digiflazz API.
 */
const GAME_METADATA_MAP: Record<string, Omit<GameMeta, "slug" | "brand">> = {
  "MOBILE LEGENDS": { img: "/games/mobile-legends.png", title: "Mobile Legends", ctg: "Mobile" },
  "FREE FIRE": { img: "/games/free-fire.png", title: "Free Fire", ctg: "Mobile" },
  "VALORANT": { img: "/games/valorant.png", title: "Valorant", ctg: "PC" },
  "GENSHIN IMPACT": { img: "/games/default.png", title: "Genshin Impact", ctg: "Mobile" },
  "PUBG MOBILE": { img: "/games/default.png", title: "PUBG Mobile", ctg: "Mobile" },
  "PUBG PC": { img: "/games/default.png", title: "PUBG PC", ctg: "PC" },
  "CALL OF DUTY MOBILE": { img: "/games/default.png", title: "Call of Duty Mobile", ctg: "Mobile" },
  "HONOR OF KINGS": { img: "/games/default.png", title: "Honor of Kings", ctg: "Mobile" },
  "ARENA OF VALOR": { img: "/games/default.png", title: "Arena of Valor", ctg: "Mobile" },
  "STEAM WALLET": { img: "/games/default.png", title: "Steam Wallet", ctg: "Voucher" },
  "GOOGLE PLAY": { img: "/games/default.png", title: "Google Play", ctg: "Voucher" },
  "ROBLOX": { img: "/games/default.png", title: "Roblox", ctg: "Mobile" },
  "RAGNAROK M": { img: "/games/default.png", title: "Ragnarok M", ctg: "Mobile" },
  "POINT BLANK": { img: "/games/default.png", title: "Point Blank", ctg: "PC" },
};

/**
 * Resolves a Digiflazz brand name to its full display metadata.
 * Falls back to a generic entry for unknown brands.
 */
function resolveGameMeta(brand: string): GameMeta {
  const key = brand.trim().toUpperCase();
  const curated = GAME_METADATA_MAP[key];

  return {
    brand,
    slug: slugifyBrand(brand), // Use centralized slugify
    img: curated?.img ?? "/games/default.png",
    title: curated?.title ?? brand,
    ctg: curated?.ctg ?? "Lainnya",
  };
}

// ─────────────────────────────────────────────
// STATIC CONTENT
// ─────────────────────────────────────────────

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

const CATEGORIES: { label: GameCategory; icon: React.ElementType }[] = [
  { label: "Semua", icon: Flame },
  { label: "Mobile", icon: Smartphone },
  { label: "PC", icon: Monitor },
  { label: "Voucher", icon: Gift },
  { label: "Lainnya", icon: Gamepad },
];

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

interface Props {
  /** Distinct brands from the database — each brand becomes one catalog card. */
  games: { brand: string }[];
}

export default function TopupCatalogClient({ games }: Props) {
  const [activeTab, setActiveTab] = useState<GameCategory>("Semua");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Auto-advance the hero banner slider every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % BANNERS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  /**
   * Map and memoize game metadata — only recomputes when the `games` prop changes.
   * Deduplication is handled by using a Map keyed by slug to prevent duplicate cards
   * if Digiflazz returns the same brand in multiple categories.
   */
  const allGames = useMemo(() => {
    const seen = new Map<string, GameMeta>();
    games.forEach((g) => {
      const meta = resolveGameMeta(g.brand);
      if (!seen.has(meta.slug)) {
        seen.set(meta.slug, meta);
      }
    });
    return Array.from(seen.values());
  }, [games]);

  /** Apply category filter + search query */
  const filteredGames = useMemo(() => {
    let result = activeTab === "Semua" ? allGames : allGames.filter((g) => g.ctg === activeTab);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((g) => g.title.toLowerCase().includes(q));
    }
    return result;
  }, [allGames, activeTab, searchQuery]);

  return (
    <div className="pb-24">
      {/* ── HERO SLIDER ── */}
      <div className="relative w-full h-[45vh] md:h-[60vh] max-h-[600px] overflow-hidden">
        <AnimatePresence initial={false}>
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0"
          >
            <Image
              src={BANNERS[currentSlide].image}
              alt={BANNERS[currentSlide].title}
              fill
              className="object-cover"
              priority
            />
            <div className={`absolute inset-0 bg-gradient-to-t ${BANNERS[currentSlide].gradient} mix-blend-multiply`} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f16] via-[#0a0f16]/60 to-transparent" />

            {/* Banner Copy */}
            <div className="absolute bottom-0 left-0 w-full p-8 md:p-16 z-10 container mx-auto pb-16 md:pb-24">
              <motion.span
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="inline-block px-3 py-1 mb-3 rounded-full bg-red-500/20 text-red-400 border border-red-500/50 text-xs font-bold uppercase tracking-widest backdrop-blur-md"
              >
                {BANNERS[currentSlide].label}
              </motion.span>
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-3xl md:text-5xl lg:text-7xl font-black text-white mb-2 drop-shadow-2xl tracking-tighter"
              >
                {BANNERS[currentSlide].title}
              </motion.h2>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-lg md:text-2xl text-slate-300 max-w-2xl font-medium"
              >
                {BANNERS[currentSlide].subtitle}
              </motion.p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Dot navigation */}
        <div className="absolute bottom-16 right-8 md:bottom-24 md:right-16 z-20 flex gap-2">
          {BANNERS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              aria-label={`Slide ${idx + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                currentSlide === idx ? "w-10 bg-white" : "w-4 bg-white/30"
              }`}
            />
          ))}
        </div>
      </div>

      {/* ── SEARCH & FILTER BAR ── */}
      <main className="container mx-auto px-4 -mt-10 md:-mt-12 max-w-7xl relative z-30">
        <div className="bg-[#111823]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 md:p-6 shadow-[0_20px_40px_rgba(0,0,0,0.5)] flex flex-col md:flex-row gap-4 md:items-center justify-between mb-12">
          {/* Search Input */}
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
            <input
              type="text"
              placeholder="Cari game favoritmu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0a0f16] border border-white/5 text-white pl-12 pr-4 py-4 rounded-2xl focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {CATEGORIES.map(({ label, icon: Icon }) => {
              const isActive = activeTab === label;
              return (
                <button
                  key={label}
                  onClick={() => setActiveTab(label)}
                  className={`relative px-5 py-3 rounded-xl font-bold whitespace-nowrap transition-colors duration-300 ${
                    isActive ? "text-white" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTabBadge"
                      className="absolute inset-0 bg-white/10 border border-white/20 rounded-xl backdrop-blur-md"
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2 text-sm md:text-base">
                    <Icon className="w-4 h-4" />
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── GAMES GRID ── */}
        <motion.div
          layout
          className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-6"
        >
          <AnimatePresence>
            {filteredGames.map((game, idx) => (
              <motion.div
                layout
                key={game.slug}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.35, delay: Math.min(idx * 0.04, 0.3) }}
              >
                <Link href={`/topup/${game.slug}`} prefetch={false}>
                  <div className="group relative rounded-2xl md:rounded-[2rem] overflow-hidden aspect-[3/4] border border-white/5 bg-[#111823] cursor-pointer shadow-black/50 shadow-lg transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_15px_30px_-10px_rgba(59,130,246,0.3)] hover:border-blue-500/30">
                    <Image
                      src={game.img}
                      alt={game.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110 opacity-70 group-hover:opacity-100 mix-blend-screen"
                      sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 20vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f16] via-[#0a0f16]/20 to-transparent opacity-90" />

                    {/* Title Box */}
                    <div className="absolute bottom-2 md:bottom-4 inset-x-2 md:inset-x-4 z-10">
                      <div className="bg-[#111823]/60 backdrop-blur-md border border-white/10 rounded-xl md:rounded-2xl p-2 md:p-3 group-hover:-translate-y-1 transition-transform duration-500">
                        <h3 className="font-bold text-white leading-tight mb-1 text-[11px] sm:text-xs md:text-base truncate">
                          {game.title}
                        </h3>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] md:text-xs font-bold text-blue-400 bg-blue-500/10 px-1.5 md:px-2 py-0.5 rounded-md flex items-center gap-1 border border-blue-500/20">
                            <Zap className="w-2.5 h-2.5 md:w-3 md:h-3 shrink-0" /> Instan
                          </span>
                          <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-blue-500 group-hover:shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all shrink-0">
                            <ChevronRight className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Hot Badge */}
                    <div className="absolute top-2 right-2 md:top-4 md:right-4 bg-gradient-to-r from-rose-500 to-red-600 px-2 py-0.5 rounded-full border border-red-400/30 shadow-md shadow-red-500/30 translate-x-12 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-500 z-10 flex items-center gap-1">
                      <Flame className="w-2.5 h-2.5 text-white animate-pulse" />
                      <span className="text-[8px] md:text-[10px] uppercase font-black tracking-widest text-white">Hot</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Empty State */}
        {filteredGames.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-24 text-center bg-[#111823]/50 rounded-3xl border border-white/5 mt-8"
          >
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-10 h-10 text-slate-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Game tidak ditemukan</h2>
            <p className="text-slate-400">Coba kata kunci lain, atau pilih kategori "Semua".</p>
            <button
              onClick={() => { setSearchQuery(""); setActiveTab("Semua"); }}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-colors text-sm"
            >
              Reset Filter
            </button>
          </motion.div>
        )}
      </main>

      {/* ── TRUST BADGES ── */}
      <section className="container mx-auto px-4 max-w-7xl mt-24 mb-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: ShieldCheck, color: "emerald", title: "Transaksi Aman 100%", desc: "Pembayaran terenkripsi dan ID langsung diproses otomatis ke server resmi game." },
            { icon: Clock, color: "blue", title: "Proses Secepat Kilat", desc: "Hanya butuh 1-3 detik untuk sistem cerdas kami memverifikasi dan mengirim item." },
            { icon: Trophy, color: "yellow", title: "Pilihan Top #1 Gamers", desc: "Ribuan gamers telah mempercayakan pengisian saldo bulanannya di EterShop." },
          ].map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className={`bg-gradient-to-br from-[#111823] to-[#0a0f16] border border-${color}-500/10 p-6 rounded-3xl flex items-start gap-4 hover:border-${color}-500/30 transition-colors`}>
              <div className={`p-4 bg-${color}-500/10 rounded-2xl text-${color}-400 shrink-0`}>
                <Icon className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-white font-bold text-lg mb-1">{title}</h4>
                <p className="text-slate-400 text-sm">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
