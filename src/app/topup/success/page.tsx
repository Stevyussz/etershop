/**
 * @file src/app/topup/success/page.tsx
 * @description Post-payment result page — shows real status from DB.
 *
 * Handles all 4 possible transaction statuses:
 * - SUCCESS → Show SN, order details, celebration UI
 * - PAID    → Payment done, Digiflazz still processing (polling active)
 * - PENDING → Payment not yet confirmed by Midtrans
 * - FAILED  → Topup failed, show CS contact
 *
 * Auto-refreshes every 5 seconds when status is PAID/PENDING
 * until it resolves to SUCCESS or FAILED.
 */

import Link from "next/link";
import {
  CheckCircle2, ChevronRight, Home, TicketCheck,
  Clock, XCircle, Zap, RefreshCcw, AlertTriangle,
  MessageSquare, Phone
} from "lucide-react";
import prisma from "@/lib/prisma";
import { formatRupiah, formatDate } from "@/lib/utils";
import AutoRefresh from "./AutoRefresh";
import RefreshButton from "./RefreshButton";

interface PageProps {
  searchParams: Promise<{ order_id?: string; pending?: string }>;
}

// CRITICAL: Disable all caching on this page.
// window.location.reload() on the client must always hit a FRESH server render
// that reads the latest transaction status from the database.
export const dynamic = "force-dynamic";

export default async function TopupSuccessPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const orderId = params.order_id;

  // Fetch real transaction from DB
  let transaction = null;
  if (orderId) {
    try {
      transaction = await prisma.topupTransaction.findUnique({
        where: { orderId },
        select: {
          orderId: true,
          productName: true,
          price: true,
          gameId: true,
          zoneId: true,
          status: true,
          digiflazzNote: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch {
      // DB error — show neutral UI
    }
  }

  const status = transaction?.status ?? (params.pending === "true" ? "PENDING" : "SUCCESS");
  const isSuccess = status === "SUCCESS";
  const isFailed = status === "FAILED";
  const isProcessing = status === "PAID"; // Payment done, awaiting Digiflazz
  const isPending = status === "PENDING"; // Payment not confirmed yet
  const isWaiting = isProcessing || isPending;

  // Auto-refresh the page every 5s while waiting for topup resolution
  const shouldAutoRefresh = isWaiting;

  const statusConfig = {
    SUCCESS: {
      border: "border-emerald-500/30",
      bg: "from-emerald-900/20",
      iconBg: "bg-emerald-500/10",
      ping: "border-emerald-400/40",
      icon: <CheckCircle2 className="w-14 h-14 text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.8)]" />,
      title: "Transaksi Berhasil! 🎉",
      desc: "Item sudah otomatis terkirim ke akun game kamu.",
    },
    PAID: {
      border: "border-blue-500/30",
      bg: "from-blue-900/20",
      iconBg: "bg-blue-500/10",
      ping: "border-blue-400/40",
      icon: <RefreshCcw className="w-14 h-14 text-blue-400 animate-spin" />,
      title: "Sedang Diproses ⚡",
      desc: "Pembayaran diterima. Sistem sedang mengirim item ke akunmu secara otomatis...",
    },
    PENDING: {
      border: "border-yellow-500/30",
      bg: "from-yellow-900/10",
      iconBg: "bg-yellow-500/10",
      ping: "border-yellow-400/40",
      icon: <Clock className="w-14 h-14 text-yellow-400 animate-pulse" />,
      title: "Verifikasi Pembayaran ⏳",
      desc: "Sedang menunggu konfirmasi sistem. Jika Anda sudah membayar, status akan berubah otomatis dalam beberapa detik.",
    },
    FAILED: {
      border: "border-red-500/30",
      bg: "from-red-900/20",
      iconBg: "bg-red-500/10",
      ping: "border-red-400/30",
      icon: <XCircle className="w-14 h-14 text-red-400" />,
      title: "Transaksi Gagal",
      desc: "Terjadi kendala saat memproses pesanan. Hubungi CS kami untuk refund.",
    },
  };

  const cfg = statusConfig[status as keyof typeof statusConfig] ?? statusConfig.PENDING;

  return (
    <div className="min-h-screen bg-[#0a0f16] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Active status poller — polls /api/check-payment-status every 1.5s */}
      {shouldAutoRefresh && orderId && <AutoRefresh orderId={orderId} intervalMs={1500} />}

      {/* Ambient background */}
      <div className={`absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] ${cfg.bg} via-[#0a0f16] to-[#0a0f16]`} />

      <div className={`bg-[#111823]/90 backdrop-blur-2xl border rounded-[2.5rem] p-8 md:p-12 text-center max-w-lg w-full relative z-10 shadow-2xl ${cfg.border}`}>

        {/* Status Icon */}
        <div className={`w-24 h-24 rounded-full ${cfg.iconBg} flex items-center justify-center mx-auto mb-8 relative`}>
          <div className={`absolute inset-0 animate-ping rounded-full border-2 ${cfg.ping} opacity-60`} />
          {cfg.icon}
        </div>

        {/* Title & Description */}
        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-3">{cfg.title}</h1>
        <p className="text-slate-400 text-base mb-8 font-medium leading-relaxed">{cfg.desc}</p>

        {/* Order Info Card */}
        <div className="bg-[#0a0f16]/90 border border-white/5 rounded-2xl p-5 mb-8 text-left space-y-4">
          {/* Order ID */}
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">ID Pesanan</p>
            <div className="text-sm text-white font-mono font-bold flex items-center gap-2 break-all">
              <TicketCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              {transaction?.orderId || orderId || "—"}
            </div>
          </div>

          {transaction && (
            <>
              <div className="h-px bg-white/5" />

              {/* Product + Price */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500 text-[10px] uppercase font-bold mb-1">Item</p>
                  <p className="text-white font-bold leading-snug">{transaction.productName}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] uppercase font-bold mb-1">Harga</p>
                  <p className="text-emerald-400 font-black">{formatRupiah(transaction.price)}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] uppercase font-bold mb-1">ID Tujuan</p>
                  <p className="text-blue-400 font-mono text-xs bg-blue-500/10 px-2 py-1 rounded-lg w-fit">
                    {transaction.gameId}
                    {transaction.zoneId ? ` (${transaction.zoneId})` : ""}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] uppercase font-bold mb-1">Waktu</p>
                  <p className="text-slate-300 text-xs">{formatDate(transaction.updatedAt)}</p>
                </div>
              </div>

              {/* SN — shown only on SUCCESS */}
              {isSuccess && transaction.digiflazzNote && (
                <>
                  <div className="h-px bg-white/5" />
                  <div>
                    <p className="text-slate-500 text-[10px] uppercase font-bold mb-2 flex items-center gap-1.5">
                      <Zap className="w-3 h-3 text-emerald-400" /> Serial Number (SN)
                    </p>
                    <p className="text-xs font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5 rounded-xl break-all leading-relaxed">
                      {transaction.digiflazzNote}
                    </p>
                    <p className="text-[10px] text-slate-600 mt-1.5">
                      Simpan SN ini sebagai bukti pengiriman resmi.
                    </p>
                  </div>
                </>
              )}

              {/* PAID — processing indicator */}
              {isProcessing && (
                <>
                  <div className="h-px bg-white/5" />
                  <div className="flex items-start gap-2 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-2.5 rounded-xl">
                    <RefreshCcw className="w-3 h-3 animate-spin shrink-0 mt-0.5" />
                    <span>Diamond sedang dikirim ke akunmu... Halaman ini akan <strong>otomatis update</strong> begitu selesai. Jangan tutup atau tinggalkan halaman ini!</span>
                  </div>
                </>
              )}

              {/* FAILED — error message & CS link */}
              {isFailed && (
                <>
                  <div className="h-px bg-white/5" />
                  <div className="mt-4 flex flex-col gap-4">
                    <div className="flex items-start gap-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-3 rounded-xl ring-1 ring-red-500/20">
                      <MessageSquare className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold text-white">Jangan khawatir ya!</p>
                        <p className="leading-relaxed opacity-80">
                          Kendala transaksi Anda akan kami bantu sampai selesai. Tim kami akan segera memproses pengecekan manual atau pengembalian dana.
                        </p>
                      </div>
                    </div>

                    {transaction && (
                      <Link
                        href={`https://wa.me/6285175224481?text=${encodeURIComponent(
                          `Halo Admin EterShop, saya ingin bertanya mengenai pesanan saya dengan Order ID: ${transaction.orderId}.\n\nStatus: GAGAL\nProduk: ${transaction.productName}\n\nMohon bantuannya ya untuk pengecekan!`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold transition-all shadow-lg hover:shadow-emerald-500/25"
                      >
                        <Phone className="w-4 h-4" /> Hubungi CS WhatsApp
                      </Link>
                    )}
                  </div>
                </>
              )}
              {/* PENDING — manual check button */}
              {isPending && (
                <>
                  <div className="h-px bg-white/5" />
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-3 py-2.5 rounded-xl">
                      <Clock className="w-3 h-3 animate-pulse shrink-0" />
                      Status: Belum terbaca. Webhook mungkin sedang tertunda.
                    </div>
                    <RefreshButton />
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Action Buttons — hidden while PAID to prevent user from navigating away */}
        {isWaiting ? (
          // Lock user on page while order is processing — do NOT show navigation buttons
          <div className="w-full py-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col items-center gap-2 text-center px-4">
            <div className="flex items-center gap-2 text-amber-400 font-black text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              JANGAN TINGGALKAN HALAMAN INI
            </div>
            <p className="text-amber-400/70 text-xs leading-relaxed">
              Sistem sedang mengirim item ke akunmu secara otomatis.<br/>
              Halaman ini akan berubah ke <strong className="text-white">Transaksi Berhasil</strong> dalam beberapa detik.
            </p>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/topup"
              className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-all shadow-lg flex justify-center items-center gap-2"
            >
              Top Up Lagi <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" /> Beranda
            </Link>
          </div>
        )}

        {/* Track Link — only shown when fully resolved, not while processing */}
        {orderId && !isWaiting && (
          <Link
            href={`/topup/track?orderId=${encodeURIComponent(orderId)}`}
            className="mt-4 block text-sm text-slate-600 hover:text-slate-300 transition-colors"
          >
            Lacak status pesanan ini →
          </Link>
        )}
      </div>
    </div>
  );
}
