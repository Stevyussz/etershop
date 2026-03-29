/**
 * @file src/app/topup/success/page.tsx
 * @description Post-payment success/pending page.
 *
 * This page is displayed after a Midtrans payment attempt.
 * It fetches the actual order data from the database to show real-time status,
 * and displays the Digiflazz Serial Number (SN) if available.
 *
 * URL patterns:
 * - /topup/success?order_id=TRX-xxx → Normal success display
 * - /topup/success?order_id=TRX-xxx&pending=true → Payment pending display
 */

import Link from "next/link";
import { CheckCircle2, ChevronRight, Home, TicketCheck, Clock, Package } from "lucide-react";
import prisma from "@/lib/prisma";
import { formatRupiah } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{ order_id?: string; pending?: string }>;
}

export default async function TopupSuccessPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const orderId = params.order_id;
  const isPending = params.pending === "true";

  // Fetch the actual transaction to show real status and SN
  let transaction = null;
  if (orderId) {
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
        updatedAt: true,
      },
    });
  }

  // Determine what to show based on actual DB status (not just query params)
  const actualStatus = transaction?.status ?? (isPending ? "PENDING" : "SUCCESS");
  const isSuccess = actualStatus === "SUCCESS";
  const isFailed = actualStatus === "FAILED";

  return (
    <div className="min-h-screen bg-[#0a0f16] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background */}
      <div
        className={`absolute inset-0 pointer-events-none ${
          isSuccess
            ? "bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-900/20 via-[#0a0f16] to-[#0a0f16]"
            : isFailed
            ? "bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-900/20 via-[#0a0f16] to-[#0a0f16]"
            : "bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-[#0a0f16] to-[#0a0f16]"
        }`}
      />

      <div
        className={`bg-[#111823]/80 backdrop-blur-2xl border rounded-[2.5rem] p-8 md:p-12 text-center max-w-lg w-full relative z-10 shadow-2xl ${
          isSuccess
            ? "border-emerald-500/30 shadow-emerald-900/20"
            : isFailed
            ? "border-red-500/30 shadow-red-900/20"
            : "border-blue-500/30 shadow-blue-900/20"
        }`}
      >
        {/* Status Icon */}
        <div
          className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 relative ${
            isSuccess ? "bg-emerald-500/10" : isFailed ? "bg-red-500/10" : "bg-blue-500/10"
          }`}
        >
          <div
            className={`absolute inset-0 animate-ping rounded-full border-2 ${
              isSuccess ? "border-emerald-400/50" : isFailed ? "border-red-400/50" : "border-blue-400/50"
            }`}
          />
          {isSuccess ? (
            <CheckCircle2 className="w-14 h-14 text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.8)]" />
          ) : isFailed ? (
            <Package className="w-14 h-14 text-red-400" />
          ) : (
            <Clock className="w-14 h-14 text-blue-400 animate-pulse" />
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-4">
          {isSuccess ? "Transaksi Berhasil!" : isFailed ? "Transaksi Gagal" : "Menunggu Pembayaran"}
        </h1>

        {/* Description */}
        <p className="text-slate-400 text-lg mb-8 font-medium">
          {isSuccess
            ? "Item Anda sudah berhasil terkirim ke akun game secara otomatis oleh sistem kami."
            : isFailed
            ? "Maaf, terjadi kendala saat memproses pesanan Anda. Silakan hubungi CS kami."
            : "Order Anda telah dicatat. Silakan selesaikan pembayaran di aplikasi e-wallet Anda."}
        </p>

        {/* Order Info Card */}
        {transaction ? (
          <div className="bg-[#0a0f16]/90 border border-white/5 rounded-2xl p-5 mb-8 text-left space-y-3">
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">ID Pesanan</div>
              <div className="text-base text-white font-mono font-bold flex items-center gap-2">
                <TicketCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                {transaction.orderId}
              </div>
            </div>

            <div className="h-px bg-white/5" />

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-slate-500 text-xs mb-1">Item</p>
                <p className="text-white font-semibold leading-tight">{transaction.productName}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-1">Harga</p>
                <p className="text-emerald-400 font-bold">{formatRupiah(transaction.price)}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-1">ID Game</p>
                <p className="text-blue-400 font-mono font-bold text-xs bg-blue-500/10 px-2 py-0.5 rounded w-max">
                  {transaction.gameId}
                  {transaction.zoneId ? ` (${transaction.zoneId})` : ""}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-1">Status</p>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded ${
                    isSuccess
                      ? "text-emerald-400 bg-emerald-500/10"
                      : isFailed
                      ? "text-red-400 bg-red-500/10"
                      : "text-yellow-400 bg-yellow-500/10"
                  }`}
                >
                  {actualStatus}
                </span>
              </div>
            </div>

            {/* SN (Serial Number) — only shown on success */}
            {isSuccess && transaction.digiflazzNote && (
              <>
                <div className="h-px bg-white/5" />
                <div>
                  <p className="text-slate-500 text-xs mb-1">Serial Number (SN)</p>
                  <p className="text-xs font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg break-all">
                    {transaction.digiflazzNote}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">Simpan SN ini sebagai bukti pengiriman.</p>
                </div>
              </>
            )}
          </div>
        ) : (
          /* Fallback if transaction not found in DB yet */
          <div className="bg-[#0a0f16]/90 border border-white/5 rounded-2xl p-5 mb-8 text-left">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">ID Pesanan</div>
            <div className="text-xl text-emerald-400 font-mono font-bold flex items-center gap-2">
              <TicketCheck className="w-5 h-5" />
              {orderId || "TRX-UNKNOWN"}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/topup"
            className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-bold transition-all shadow-lg flex justify-center items-center gap-2 text-lg"
          >
            Top Up Lagi <ChevronRight className="w-5 h-5" />
          </Link>
          <Link
            href="/"
            className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 text-lg"
          >
            <Home className="w-5 h-5" /> Ke Beranda
          </Link>
        </div>

        {/* Track Order Link */}
        {orderId && (
          <Link
            href={`/topup/track?orderId=${encodeURIComponent(orderId)}`}
            className="mt-4 block text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            Lacak status pesanan ini →
          </Link>
        )}
      </div>
    </div>
  );
}
