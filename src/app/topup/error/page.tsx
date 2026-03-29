import Link from "next/link";
import { XCircle, RefreshCcw, Home } from "lucide-react";

export default function TopupErrorPage() {
  return (
    <div className="min-h-screen bg-[#0a0f16] flex items-center justify-center p-4 relative overflow-hidden">
       <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-900/20 via-[#0a0f16] to-[#0a0f16] pointer-events-none"></div>
       
       <div className="bg-[#111823]/80 backdrop-blur-2xl border border-red-500/30 rounded-[2.5rem] p-8 md:p-12 text-center max-w-lg w-full relative z-10 shadow-[0_30px_60px_rgba(239,68,68,0.15)]">
          <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8 relative">
             <div className="absolute inset-0 animate-ping rounded-full border-2 border-red-400/50"></div>
             <XCircle className="w-14 h-14 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]" />
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-4">Transaksi Gagal</h1>
          
          <p className="text-slate-400 text-lg mb-8 font-medium leading-relaxed">
             Pembayaran Anda dibatalkan atau waktu telah habis. Jangan khawatir, saldo Anda tidak dipotong.
          </p>

          <div className="flex flex-col gap-3">
             <Link href="/topup" className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-red-500/20 flex justify-center items-center gap-2 text-lg">
                <RefreshCcw className="w-5 h-5" /> Coba Pembayaran Lagi 
             </Link>
             <Link href="/" className="w-full py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 text-lg">
                <Home className="w-5 h-5" /> Kembali ke Beranda
             </Link>
          </div>
       </div>
    </div>
  );
}
