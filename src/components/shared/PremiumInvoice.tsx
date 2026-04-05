"use client";

import { useRef } from "react";
import { formatRupiah, formatDate } from "@/lib/utils";
import { CheckCircle2, XCircle, Clock, Printer, TicketCheck } from "lucide-react";

interface InvoiceProps {
  transaction: {
    orderId: string;
    productName: string;
    price: number;
    gameId: string;
    zoneId?: string | null;
    status: string;
    digiflazzNote?: string | null;
    createdAt: Date | string;
    updatedAt?: Date | string;
  } | null;
  showPrintButton?: boolean;
}

export default function PremiumInvoice({ transaction, showPrintButton = true }: InvoiceProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!transaction) return null;

  const isSuccess = transaction.status === "SUCCESS" || transaction.status === "Sukses";
  const isFailed = transaction.status === "FAILED" || transaction.status === "Gagal";
  const isPending = !isSuccess && !isFailed;

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-invoice, #printable-invoice * {
            visibility: visible;
          }
          #printable-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
          }
          .print-hide {
            display: none !important;
          }
          .print-text-black {
            color: black !important;
          }
          .print-border-black {
            border-color: #e2e8f0 !important;
          }
          .print-bg-transparent {
            background: transparent !important;
          }
        }
      `}} />

      <div className="flex justify-center w-full my-6 print-hide z-20 relative">
        {showPrintButton && (
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-transform hover:scale-105"
          >
            <Printer className="w-5 h-5" />
            Cetak Invoice
          </button>
        )}
      </div>

      <div 
        id="printable-invoice"
        ref={printRef}
        className="w-full max-w-sm sm:max-w-md mx-auto bg-[#111823]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden print-bg-transparent print-border-black print-text-black"
      >
        {/* Header / Logo Area */}
        <div className="text-center mb-6 pb-6 border-b border-white/10 print-border-black border-dashed">
          <h2 className="text-2xl font-black text-white tracking-widest print-text-black">ETERSHOP</h2>
          <p className="text-[10px] text-slate-400 mt-1 print-text-black font-semibold uppercase tracking-widest">Pusat Layanan Digital</p>
        </div>

        {/* Status Badge */}
        <div className="flex justify-center mb-6">
          {isSuccess ? (
             <div className="flex flex-col items-center gap-2">
               <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center print-bg-transparent border border-emerald-500/30">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
               </div>
               <span className="text-lg font-black text-emerald-400 tracking-widest mt-1 print-text-black">L U N A S</span>
             </div>
          ) : isFailed ? (
             <div className="flex flex-col items-center gap-2">
               <div className="w-14 h-14 bg-rose-500/10 rounded-full flex items-center justify-center print-bg-transparent border border-rose-500/30">
                  <XCircle className="w-8 h-8 text-rose-500" />
               </div>
               <span className="text-lg font-black text-rose-400 tracking-widest mt-1 print-text-black">G A G A L</span>
             </div>
          ) : (
             <div className="flex flex-col items-center gap-2">
               <div className="w-14 h-14 bg-blue-500/10 rounded-full flex items-center justify-center print-bg-transparent border border-blue-500/30">
                  <Clock className="w-8 h-8 text-blue-400 animate-pulse" />
               </div>
               <span className="text-lg font-black text-blue-400 tracking-widest mt-1 print-text-black">P E N D I N G</span>
             </div>
          )}
        </div>

        {/* Internal ID Section */}
        <div className="bg-[#0a0f16]/80 p-4 rounded-xl border border-white/5 mb-6 print-border-black print-text-black">
           <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1">Nomor Pesanan</p>
           <div className="flex items-center gap-2 text-sm text-white font-mono font-bold break-all">
             <TicketCheck className="w-4 h-4 text-blue-400 shrink-0" />
             {transaction.orderId}
           </div>
        </div>

        {/* Data Rows */}
        <div className="space-y-4 mb-6 px-1">
          <div className="flex justify-between items-start border-b border-white/5 pb-3 print-border-black border-dashed">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider print-text-black">Waktu</span>
            <span className="text-xs font-semibold text-white print-text-black text-right">
              {formatDate(new Date(transaction.createdAt))}
            </span>
          </div>

          <div className="flex justify-between items-start border-b border-white/5 pb-3 print-border-black border-dashed">
             <span className="text-xs text-slate-500 font-bold uppercase tracking-wider print-text-black mt-0.5">Produk</span>
             <span className="text-sm font-black text-blue-400 text-right print-text-black max-w-[65%] leading-snug">
               {transaction.productName}
             </span>
          </div>

          <div className="flex justify-between items-start border-b border-white/5 pb-3 print-border-black border-dashed">
             <span className="text-xs text-slate-500 font-bold uppercase tracking-wider print-text-black mt-0.5">ID Tujuan</span>
             <span className="text-sm font-mono font-bold text-white print-text-black text-right max-w-[65%] leading-snug break-all">
                {transaction.gameId} {transaction.zoneId ? `(${transaction.zoneId})` : ""}
             </span>
          </div>

          {isSuccess && transaction.digiflazzNote && (
            <div className="flex justify-between items-start border-b border-white/5 pb-3 print-border-black border-dashed">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider print-text-black flex-shrink-0 mt-0.5">Serial No</span>
              <span className="text-xs font-mono font-bold text-emerald-400 text-right print-text-black max-w-[70%] break-words leading-relaxed selection:bg-emerald-500/30">
                {transaction.digiflazzNote}
              </span>
            </div>
          )}
        </div>

        {/* Total Cost */}
        <div className="bg-[#0a0f16]/80 rounded-xl p-5 flex flex-col items-center justify-center border border-white/5 print-bg-transparent print-border-black border-solid border-[1px]">
           <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mb-1 print-text-black">Total Transaksi</span>
           <span className="text-2xl sm:text-3xl font-black text-white print-text-black tabular-nums">
              {formatRupiah(transaction.price)}
           </span>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center pt-6 opacity-70">
           <p className="text-[9px] text-slate-400 print-text-black uppercase tracking-widest font-black mb-1">
             TERIMA KASIH TELAH BERBELANJA
           </p>
           <p className="text-[9px] text-slate-500 print-text-black">
             Simpan struk ini sebagai bukti pembayaran yang sah.
           </p>
        </div>
      </div>
    </>
  );
}
