/**
 * @file src/app/topup/[game]/CheckoutClient.tsx
 * @description Interactive checkout page for a specific game's topup packages.
 * Uses Midtrans Core API QRIS — fully headless, no Snap popup.
 */

"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, ShieldCheck, Zap, ArrowLeft,
  BellRing, Info, Flame, ChevronDown,
  Ticket, Check, X, Gem, QrCode, Clock, RefreshCcw, AlertCircle, Download
} from "lucide-react";
import { formatRupiah, slugifyBrand } from "@/lib/utils";
// @ts-ignore
import type { TopupProduct, GameConfig } from "@prisma/client";
import { validateVoucher } from "@/app/admin/vouchers/voucher-actions";
import { validateNickname } from "./validator-actions";
import { QRCodeCanvas } from "qrcode.react";

// ─────────────────────────────────────────────
// TYPES & CONSTANTS
// ─────────────────────────────────────────────

interface CheckoutClientProps {
  products: TopupProduct[];
  brand: string;
  config?: GameConfig | null;
}

interface QrisData {
  orderId: string;
  qrString: string;
  qrImageUrl: string;
  expiredAt: string;
  amount: number;
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

function resolveCheckoutMeta(brand: string, category?: string) {
  const key = brand.trim().toUpperCase();
  const curated = GAME_DISPLAY_META[key];

  let defaultImg = "/games/default.png";
  let defaultTitle = brand;
  let defaultCtg = category || "Games";
  let defaultDev = "Service Provider";

  if (category === "Pulsa") { defaultImg = "/games/pulsa.png"; defaultDev = "Telekomunikasi"; }
  else if (category === "PLN") { defaultImg = "/games/pln.png"; defaultDev = "Energi"; }
  else if (category === "E-Money") { defaultImg = "/games/emoney.png"; defaultDev = "Fintech"; }

  return {
    slug: slugifyBrand(brand),
    img: curated?.img ?? defaultImg,
    title: curated?.title ?? defaultTitle,
    ctg: curated?.ctg ?? defaultCtg,
    bg: curated?.bg ?? defaultImg,
    dev: curated?.dev ?? defaultDev,
  };
}

// ─────────────────────────────────────────────
// QRIS COUNTDOWN TIMER COMPONENT
// ─────────────────────────────────────────────
function QrisCountdown({ expiredAt, onExpire }: { expiredAt: string; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const calc = () => {
      const ms = new Date(expiredAt).getTime() - Date.now();
      const secs = Math.max(0, Math.floor(ms / 1000));
      setRemaining(secs);
      if (secs === 0) onExpire();
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [expiredAt, onExpire]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const pct = Math.max(0, (remaining / (15 * 60)) * 100);
  const isUrgent = remaining < 120;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" /> QR kedaluwarsa dalam
        </span>
        <span className={`text-sm font-black tabular-nums ${isUrgent ? "text-rose-400 animate-pulse" : "text-white"}`}>
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full transition-colors ${isUrgent ? "bg-rose-500" : "bg-emerald-500"}`}
          initial={{ width: "100%" }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// QRIS MODAL COMPONENT
// ─────────────────────────────────────────────
function QrisModal({
  qrisData,
  onClose,
  onSuccess,
}: {
  qrisData: QrisData;
  onClose: () => void;
  onSuccess: (orderId: string) => void;
}) {
  const [pollStatus, setPollStatus] = useState<"polling" | "paid" | "expired">("polling");
  const [pollCount, setPollCount] = useState(0);
  const [imgError, setImgError] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const MAX_POLLS = 225; // 225 × 2s = 7.5 min safety cut-off (QR lasts 15min, user can refresh)

  const stopPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  const handleExpire = useCallback(() => {
    stopPolling();
    setPollStatus("expired");
  }, [stopPolling]);

  const downloadQR = () => {
    const canvas = document.getElementById("qris-canvas") as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `QRIS-${qrisData.orderId}.png`;
      a.click();
    }
  };

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(
          `/api/check-payment-status?order_id=${qrisData.orderId}&t=${Date.now()}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json();
          const st: string = data.status;
          if (st === "PAID" || st === "SUCCESS") {
            stopPolling();
            setPollStatus("paid");
            setTimeout(() => onSuccess(qrisData.orderId), 1000);
          } else if (st === "FAILED") {
            stopPolling();
            onClose();
          }
        }
      } catch {
        // silently ignore network blips
      }
      setPollCount((c) => {
        if (c + 1 >= MAX_POLLS) {
          stopPolling();
          setPollStatus("expired");
        }
        return c + 1;
      });
    };

    // Start polling after 3s (give Midtrans time to settle)
    const delayTimer = setTimeout(() => {
      pollRef.current = setInterval(poll, 2000);
    }, 3000);

    return () => {
      clearTimeout(delayTimer);
      stopPolling();
    };
  }, [qrisData.orderId, stopPolling, onSuccess, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex flex-col items-center justify-end md:justify-center p-0 md:p-4"
    >
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-sm bg-[#0f1923] border-t md:border border-white/10 rounded-t-[2.5rem] md:rounded-[2rem] overflow-hidden shadow-[0_-20px_60px_rgba(0,0,0,0.6)] md:shadow-[0_40px_80px_rgba(0,0,0,0.8)] max-h-[90vh] flex flex-col"
      >
        <div className="overflow-y-auto no-scrollbar pb-6 flex-1">
          {/* Top accent bar */}
          <div className="h-1.5 md:h-1 w-full bg-gradient-to-r from-pink-500 via-rose-400 to-orange-400" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-pink-500/30">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-black text-base leading-tight">Bayar dengan QRIS</p>
              <p className="text-slate-500 text-[10px] font-medium tracking-widest uppercase">Scan & Pay</p>
            </div>
          </div>
          {pollStatus === "polling" && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Amount */}
        <div className="mx-6 mb-4 bg-white/[0.04] border border-white/5 rounded-2xl px-4 py-3 flex items-center justify-between">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Total</span>
          <span className="text-white font-black text-xl tracking-tight">{formatRupiah(qrisData.amount)}</span>
        </div>

        {/* QR Code Area */}
        <div className="px-6 pb-4">
          <div className="relative bg-white rounded-2xl p-4 flex items-center justify-center overflow-hidden" style={{ minHeight: 264 }}>
            {/* Animated scanning line overlay when polling */}
            {pollStatus === "polling" && (
              <motion.div
                className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-pink-500 to-transparent z-10"
                animate={{ top: ["10%", "90%", "10%"] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
              />
            )}

            {pollStatus === "paid" && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute inset-0 bg-emerald-500/10 backdrop-blur-sm flex flex-col items-center justify-center z-20 rounded-2xl"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                  className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center shadow-2xl shadow-emerald-500/50"
                >
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </motion.div>
                <p className="mt-4 text-emerald-700 font-black text-lg">Pembayaran Diterima!</p>
                <p className="text-emerald-600 text-sm font-medium mt-1">Mengalihkan...</p>
              </motion.div>
            )}

            {pollStatus === "expired" && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-20 rounded-2xl">
                <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
                <p className="text-rose-600 font-black text-base">QR Kadaluarsa</p>
                <p className="text-slate-500 text-xs mt-1 font-medium">Silakan buat transaksi baru</p>
              </div>
            )}

            {/* QRIS Rendered by react-qr-code directly from qris string */}
            <div className="bg-white p-3 rounded-2xl flex items-center justify-center shadow-inner relative z-10 w-[240px] h-[240px]">
              {qrisData.qrString ? (
                 <QRCodeCanvas 
                    id="qris-canvas"
                    value={qrisData.qrString} 
                    size={220} 
                    level="Q" 
                    includeMargin={false}
                    imageSettings={{
                      src: "/payment/qris.png",
                      x: undefined,
                      y: undefined,
                      height: 48,
                      width: 90,
                      excavate: true,
                    }}
                 />
              ) : (
                <div className="text-center p-4">
                  <QrCode className="w-16 h-16 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-400 text-xs mt-2">Gagal memuat QR Code. Pastikan channel QRIS sudah aktif.</p>
                </div>
              )}
            </div>
          </div>
          
          {qrisData.qrString && pollStatus === "polling" && (
            <button 
              onClick={downloadQR}
              className="mx-auto mt-4 w-full max-w-[240px] bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 rounded-xl py-2.5 text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> Unduh QR Code
            </button>
          )}

          {/* Payment Instructions */}
          <div className="mt-5 bg-white/[0.03] border border-white/5 rounded-2xl p-4">
            <p className="text-white text-xs font-bold mb-2">Cara Pembayaran:</p>
            <ol className="text-slate-400 text-[11px] leading-relaxed space-y-1.5 list-decimal list-inside marker:text-pink-500">
              <li>Buka aplikasi E-Wallet/M-Banking Anda (GoPay, OVO, Dana, ShopeePay, BCA, dll).</li>
              <li>Pilih menu <strong>Scan QR</strong>.</li>
              <li>Scan kode QR di atas atau gunakan gambar QR yang telah diunduh dari galeri.</li>
              <li>Selesaikan pembayaran, saldo akan otomatis masuk!</li>
            </ol>
          </div>
        </div>

        {/* Countdown & Status */}
        <div className="px-6 pb-4 space-y-3">
          {pollStatus === "polling" && (
            <QrisCountdown expiredAt={qrisData.expiredAt} onExpire={handleExpire} />
          )}

          {/* Polling status indicator */}
          <div className={`flex items-center justify-center gap-2 text-xs font-bold py-2.5 rounded-xl ${
            pollStatus === "polling" ? "text-blue-400 bg-blue-500/10" :
            pollStatus === "paid" ? "text-emerald-400 bg-emerald-500/10" :
            "text-rose-400 bg-rose-500/10"
          }`}>
            {pollStatus === "polling" && (
              <>
                <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                Menunggu konfirmasi pembayaran...
              </>
            )}
            {pollStatus === "paid" && (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Pembayaran Berhasil! Sedang diproses...
              </>
            )}
            {pollStatus === "expired" && (
              <>
                <AlertCircle className="w-3.5 h-3.5" />
                QR Kode sudah tidak berlaku.
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/5 px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-slate-500 text-[10px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Transaksi diproses aman oleh <span className="text-slate-400 font-bold">Midtrans</span></span>
            </div>
            {/* QRIS Logo */}
            <img src="/payment/qris.png" alt="QRIS" className="h-6 object-contain opacity-60" onError={(e) => (e.currentTarget.style.display = "none")} />
          </div>

          {/* Supported apps */}
          <p className="text-[10px] text-slate-600 text-center mt-3 leading-relaxed">
            Scan dengan GoPay · OVO · DANA · ShopeePay · BCA · Jago · dan semua e-wallet yang mendukung QRIS
          </p>

          {/* Cancel button — only when polling */}
          {pollStatus === "polling" && (
            <button
              onClick={onClose}
              className="w-full mt-3 py-2.5 rounded-xl border border-white/10 text-slate-500 hover:text-white hover:border-white/20 text-xs font-bold transition-all"
            >
              Batalkan Transaksi
            </button>
          )}

          {/* New transaction button — when expired */}
          {pollStatus === "expired" && (
            <button
              onClick={onClose}
              className="w-full mt-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-xs font-bold transition-all flex items-center justify-center gap-2"
            >
              <RefreshCcw className="w-3.5 h-3.5" /> Tutup & Buat Pesanan Baru
            </button>
          )}
        </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function CheckoutClient({ products, brand, config }: CheckoutClientProps) {
  const router = useRouter();

  const category = products[0]?.category || "Games";
  const isGame = category === "Games";

  const meta = useMemo(() => {
    const fallback = resolveCheckoutMeta(brand, category);
    if (!config) return fallback;
    return { ...fallback, title: config.title || brand, bg: config.imageUrl || fallback.bg };
  }, [brand, config, category]);

  const needsZoneId = isGame && GAMES_REQUIRING_ZONE_ID.has(brand.trim().toUpperCase());
  const canCheckNickname = isGame;

  const [gameId, setGameId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [nickname, setNickname] = useState("");
  const [isCheckingNick, setIsCheckingNick] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [nickError, setNickError] = useState("");
  const [selectedSku, setSelectedSku] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherError, setVoucherError] = useState("");
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [isVoucherApplied, setIsVoucherApplied] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ name: string; item: string } | null>(null);

  // QRIS State
  const [qrisData, setQrisData] = useState<QrisData | null>(null);

  const handleCheckNickname = async () => {
    if (!gameId || gameId.length < 5) return setNickError("Masukkan ID Game valid!");
    if (needsZoneId && !zoneId) return setNickError("Masukkan Zone ID!");
    setIsCheckingNick(true);
    setIsRetrying(false);
    setNickError("");
    setNickname("");
    try {
      const timeoutIndicator = setTimeout(() => setIsRetrying(true), 6000);
      const res = await validateNickname(brand, gameId, zoneId);
      clearTimeout(timeoutIndicator);
      if (res.success && res.nickname) setNickname(res.nickname);
      else setNickError(res.message || "Gagal cek nickname. Cek ID kembali.");
    } catch {
      setNickError("Layanan pengecekan sedang gangguan.");
    } finally {
      setIsCheckingNick(false);
      setIsRetrying(false);
    }
  };

  const selectedProduct = useMemo(() => products.find((p) => p.sku === selectedSku) ?? null, [products, selectedSku]);

  const groupedProducts = useMemo(() => {
    const groups: { label: string; items: TopupProduct[]; icon: any }[] = [
      { label: "Top Up Game", items: [], icon: Zap },
      { label: "Membership & Paket", items: [], icon: Ticket },
    ];
    const membershipKws = ["weekly", "monthly", "pass", "membership", "paket", "bundle", "card", "season"];
    products.forEach((p: TopupProduct) => {
      const name = p.name.toLowerCase();
      const sku = p.sku.toLowerCase();
      const isMembership = membershipKws.some((kw) => name.includes(kw) || sku.includes(kw));
      if (isMembership) groups[1].items.push(p);
      else groups[0].items.push(p);
    });
    return groups.filter((g) => g.items.length > 0);
  }, [products]);

  // Social proof toasts
  useEffect(() => {
    const names = ["Andi", "Rizky", "Budi", "Sarah", "Dimas", "Alya", "Kevin"];
    let isMounted = true;
    const showToast = () => {
      if (!isMounted || products.length === 0) return;
      const randomName = names[Math.floor(Math.random() * names.length)];
      const randomProduct = products[Math.floor(Math.random() * products.length)];
      setToastMsg({ name: randomName, item: randomProduct.name });
      setTimeout(() => { if (isMounted) setToastMsg(null); }, 4000);
    };
    const intervalId = setInterval(showToast, Math.random() * 15000 + 10000);
    return () => { isMounted = false; clearInterval(intervalId); };
  }, [products]);

  // ── PAYMENT HANDLER (Core API QRIS) ──────────
  const handlePayment = async () => {
    if (!gameId || !selectedSku) return alert("Harap masukkan ID Game dan pilih nominal!");
    if (needsZoneId && !zoneId) return alert("Harap masukkan Zone ID!");

    setIsLoading(true);
    try {
      const res = await fetch("/api/create-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: selectedSku,
          gameId,
          zoneId,
          voucherCode: isVoucherApplied ? voucherCode : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat transaksi.");

      // Show QRIS modal with returned data
      setQrisData({
        orderId: data.orderId,
        qrString: data.qrString,
        qrImageUrl: data.qrImageUrl,
        expiredAt: data.expiredAt,
        amount: data.amount,
      });
    } catch (e: any) {
      alert(e.message || "Gagal memproses transaksi. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQrisSuccess = useCallback(
    (orderId: string) => {
      setQrisData(null);
      router.push(`/topup/success?order_id=${orderId}`);
    },
    [router]
  );

  const handleQrisClose = useCallback(() => {
    setQrisData(null);
  }, []);

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
    } catch {
      setVoucherError("Gagal memvalidasi voucher.");
    } finally {
      setIsLoading(false);
    }
  };

  const isValidToPay = !!selectedSku && !!gameId && (!needsZoneId || !!zoneId);
  const basePrice = (selectedProduct?.isFlashSale && selectedProduct?.flashSalePrice)
    ? selectedProduct.flashSalePrice
    : selectedProduct?.price ?? 0;
  const finalPrice = Math.max(0, basePrice - voucherDiscount);

  // ────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────
  return (
    <>
      {/* QRIS Payment Modal */}
      <AnimatePresence>
        {qrisData && (
          <QrisModal
            qrisData={qrisData}
            onClose={handleQrisClose}
            onSuccess={handleQrisSuccess}
          />
        )}
      </AnimatePresence>

      {/* HERO BANNER */}
      <div className="relative w-full h-48 md:h-64 overflow-hidden rounded-t-3xl md:rounded-3xl mb-8">
        <div
          className="absolute inset-0 bg-cover bg-center scale-105"
          style={{ backgroundImage: `url(${meta.bg})`, filter: "brightness(0.4) saturate(0.8)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080d18] via-[#080d18]/40 to-transparent" />
        <div className="absolute bottom-0 left-0 p-6 md:p-8 flex items-end gap-4">
          <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl shadow-black/40 shrink-0">
            <Image src={meta.img} alt={meta.title} fill className="object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-400 bg-fuchsia-500/10 px-2 py-0.5 rounded-full border border-fuchsia-500/20">{meta.ctg}</span>
              {products.some((p: TopupProduct) => p.isFlashSale) && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1 animate-pulse">
                  <Flame className="w-3 h-3" /> Flash Sale
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight">{meta.title}</h1>
            <p className="text-slate-400 text-xs font-medium mt-1">{meta.dev}</p>
          </div>
        </div>
        <Link href="/topup" className="absolute top-4 left-4 md:top-6 md:left-6 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-black/60 transition-all">
          <ArrowLeft className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-6">

          {/* STEP 1: ID INPUT */}
          <motion.div
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}
            className="bg-[#111823] border border-white/5 rounded-3xl p-5 md:p-8 shadow-xl"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-fuchsia-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg shadow-fuchsia-600/20">1</div>
              <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">ID {isGame ? "Game" : "Tujuan"}</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500">
                  {isGame ? "User ID" : "No. HP / ID Pelanggan"}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text" value={gameId} onChange={(e) => { setGameId(e.target.value); setNickname(""); setNickError(""); }}
                    placeholder={isGame ? "Contoh: 123456789" : "Nomor tujuan"}
                    className="flex-1 bg-[#0a0f16] border border-white/10 rounded-2xl py-3.5 px-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-fuchsia-500/50 transition-all font-mono"
                  />
                  {needsZoneId && (
                    <input
                      type="text" value={zoneId} onChange={(e) => { setZoneId(e.target.value); setNickname(""); }}
                      placeholder="Zone ID"
                      className="w-24 md:w-32 bg-[#0a0f16] border border-white/10 rounded-2xl py-3.5 px-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-fuchsia-500/50 transition-all font-mono"
                    />
                  )}
                </div>
              </div>

              {canCheckNickname && (
                <button
                  onClick={handleCheckNickname}
                  disabled={isCheckingNick || !gameId}
                  className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-fuchsia-500/30 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isCheckingNick ? (
                    <><Loader2 className="w-4 h-4" />{isRetrying ? "Mencoba ulang..." : "Mengecek..."}</>
                  ) : (
                    <><Gem className="w-4 h-4 text-fuchsia-400" /> Cek Nickname</>
                  )}
                </button>
              )}

              <AnimatePresence>
                {nickname && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-3 bg-fuchsia-500/10 border border-fuchsia-500/20 p-3 rounded-2xl"
                  >
                    <CheckCircle2 className="w-5 h-5 text-fuchsia-400 shrink-0" />
                    <div>
                      <p className="text-[10px] text-fuchsia-400/80 font-bold uppercase tracking-widest">Nickname terverifikasi</p>
                      <p className="text-white font-black text-sm mt-0.5">{nickname}</p>
                    </div>
                  </motion.div>
                )}
                {nickError && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-rose-500 text-xs font-bold flex items-center gap-1.5 ml-1">
                    <Info className="w-3.5 h-3.5" /> {nickError}
                  </motion.p>
                )}
              </AnimatePresence>

              <button onClick={() => setShowHowTo(!showHowTo)} className="text-[10px] text-slate-500 hover:text-white transition-colors flex items-center gap-1 font-bold mt-1">
                <Info className="w-3 h-3" /> Cara menemukan User ID <ChevronDown className={`w-3 h-3 transition-transform ${showHowTo ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {showHowTo && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    className="bg-[#0a0f16] border border-white/5 rounded-2xl p-4 text-slate-400 text-xs leading-relaxed space-y-1.5 overflow-hidden"
                  >
                    <p className="font-bold text-white text-[11px] mb-2">Cara menemukan User ID:</p>
                    <p>• <span className="text-white font-bold">Mobile Legends:</span> Buka profil → salin angka sebelum ( ) sebagai User ID, dan angka di dalam ( ) sebagai Zone ID.</p>
                    <p>• <span className="text-white font-bold">Free Fire:</span> Buka profil akun → salin angka 9-10 digit di bawah nama.</p>
                    <p>• <span className="text-white font-bold">PUBG Mobile:</span> Buka profil → lihat Character ID di bawah nama.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* STEP 2: SELECT PRODUCT */}
          <motion.div
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-[#111823] border border-white/5 rounded-3xl p-5 md:p-8 shadow-xl flex-1"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-600/20">2</div>
              <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Pilih Nominal</h2>
            </div>

            {groupedProducts.map(({ label, items, icon: GroupIcon }) => (
              <div key={label} className="mb-6 last:mb-0">
                <div className="flex items-center gap-2 mb-3">
                  <GroupIcon className="w-4 h-4 text-slate-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {items.map((p: TopupProduct) => {
                    const isSelected = selectedSku === p.sku;
                    const isGangguan = p.isGangguan;
                    return (
                      <button
                        key={p.sku}
                        onClick={() => { if (!isGangguan) { setSelectedSku(p.sku); setVoucherDiscount(0); setIsVoucherApplied(false); } }}
                        disabled={isGangguan}
                        className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border transition-all min-h-[72px] overflow-hidden ${
                          isGangguan
                            ? "opacity-50 cursor-not-allowed border-white/5 bg-[#0a0f16]"
                            : isSelected
                            ? "bg-gradient-to-br from-fuchsia-600/20 to-blue-600/10 border-fuchsia-500/40 shadow-xl shadow-fuchsia-500/10 scale-[1.03]"
                            : "bg-[#0a0f16] border-white/5 hover:border-white/20 hover:bg-white/[0.03] active:scale-95"
                        }`}
                      >
                        {isGangguan && (
                          <span className="absolute top-1 right-1 text-[9px] font-bold text-rose-400 bg-rose-500/20 px-1.5 py-0.5 rounded-full border border-rose-500/30">🔴 Gangguan</span>
                        )}
                        {isSelected && !isGangguan && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-fuchsia-500 rounded-full flex items-center justify-center shadow-lg shadow-fuchsia-500/50">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                        {p.isFlashSale && p.flashSalePrice && (
                          <span className="absolute top-1 left-1 text-[8px] font-black text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded-full border border-amber-500/30 uppercase tracking-wide flex items-center gap-0.5">
                            <Flame className="w-2 h-2" /> FS
                          </span>
                        )}
                        <span className="text-white font-bold text-sm md:text-base mb-1 z-10 leading-tight text-center">{p.name}</span>
                        {p.isFlashSale && p.flashSalePrice ? (
                          <div className="font-semibold z-10 flex flex-col text-xs md:text-sm items-center">
                            <span className="text-rose-400 line-through text-[10px] md:text-xs">{formatRupiah(p.price)}</span>
                            <span className="text-amber-400 font-extrabold drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]">{formatRupiah(p.flashSalePrice)}</span>
                          </div>
                        ) : (
                          <span className={`font-semibold z-10 text-xs md:text-sm transition-colors ${isSelected ? "text-fuchsia-400" : "text-slate-400"}`}>{formatRupiah(p.price)}</span>
                        )}
                        <div className={`absolute inset-0 bg-gradient-to-br from-fuchsia-600/10 to-transparent transition-opacity duration-300 ${isSelected ? "opacity-100" : "opacity-0"}`} />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col gap-6">

          {/* STEP 3: PAYMENT METHOD (QRIS Only) */}
          <motion.div
            initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
            className="bg-[#111823] border border-white/5 rounded-3xl p-5 md:p-8 shadow-xl"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg shadow-emerald-600/20">3</div>
              <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Pembayaran</h2>
            </div>

            {/* QRIS Selected Card */}
            <div className="bg-gradient-to-r from-pink-500/20 to-rose-500/10 border border-pink-500/40 rounded-2xl p-4 flex items-center gap-4 relative overflow-hidden shadow-lg shadow-pink-500/10">
              <div className="absolute left-0 top-0 h-full w-1.5 bg-pink-500 rounded-l-2xl" />
              <div className="w-14 h-10 bg-white/10 border border-white/10 rounded-xl flex items-center justify-center p-1.5 ml-2">
                <img src="/payment/qris.png" alt="QRIS" className="object-contain h-full" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
              <div className="flex-1">
                <p className="text-white font-black text-base">QRIS</p>
                <p className="text-pink-300/70 text-[10px] uppercase font-bold tracking-widest">GoPay · OVO · DANA · ShopeePay · dan semua e-wallet</p>
              </div>
              <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shadow shrink-0">
                <Check className="w-3 h-3 text-pink-600" />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2.5 text-xs text-slate-500 bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Scan QR Code menggunakan aplikasi e-wallet atau mobile banking apapun yang mendukung QRIS.</span>
            </div>

            {/* VOUCHER SECTION */}
            <div className="mt-8 pt-8 border-t border-white/5">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1 block mb-3">Promo / Voucher</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text" value={voucherCode} onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    placeholder="KODE PROMO"
                    className="w-full bg-[#0a0f16] border border-white/10 rounded-2xl py-3 px-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 uppercase font-black tracking-widest text-sm transition-all"
                  />
                </div>
                <button
                  onClick={handleVoucher}
                  disabled={isLoading || !voucherCode}
                  className="bg-white hover:bg-slate-200 disabled:opacity-50 text-black font-black px-6 rounded-2xl text-xs transition-all flex items-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-4 h-4" /> : "CEK"}
                </button>
              </div>
              {voucherError && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-rose-500 text-[10px] font-bold mt-2 ml-1">{voucherError}</motion.p>}
              {isVoucherApplied && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 text-emerald-400 text-[10px] font-bold mt-2 ml-1 bg-emerald-500/10 w-fit px-2 py-1 rounded-lg border border-emerald-500/20"
                >
                  <CheckCircle2 className="w-3 h-3" /> Voucher berhasil diterapkan! Potongan {formatRupiah(voucherDiscount)}
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* ORDER SUMMARY */}
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
                  <span className="text-white font-medium text-right max-w-[150px] truncate">{selectedProduct?.name || "—"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Pembayaran</span>
                  <span className="text-white font-medium flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-pink-400" /> QRIS
                  </span>
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

              {/* PAY BUTTON */}
              <button
                onClick={handlePayment}
                disabled={!isValidToPay || isLoading}
                className={`w-full py-5 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl ${
                  isValidToPay && !isLoading
                    ? "bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white shadow-pink-600/30 active:scale-95"
                    : "bg-white/5 text-slate-600 cursor-not-allowed"
                }`}
              >
                {isLoading ? <Loader2 className="w-6 h-6" /> : <QrCode className="w-6 h-6" />}
                {isLoading ? "Membuat QR Code..." : "BAYAR PAKAI QRIS"}
              </button>

              <p className="text-[10px] text-center text-slate-600 mt-4 leading-relaxed">
                Dengan menekan tombol di atas, Anda menyetujui <span className="text-slate-400 underline">Syarat & Ketentuan</span> kami. Proses pengiriman biasanya memakan waktu 1–5 menit.
              </p>
            </div>

            {/* Decorative glows */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 blur-3xl -z-10" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-rose-500/5 blur-3xl -z-10" />
          </motion.div>
        </div>
      </div>

      {/* SOCIAL PROOF TOAST */}
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
