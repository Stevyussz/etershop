"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Search, Package, Clock, ShieldCheck, AlertCircle, RefreshCcw, Home, CheckCircle2, ChevronRight, Info, Copy, CheckCheck } from "lucide-react";
import { formatRupiah } from "@/lib/utils";

export default function TrackOrderPage() {
  const searchParams = useSearchParams();
  const [orderId, setOrderId] = useState(searchParams.get("orderId") ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [orderData, setOrderData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Auto-submit if orderId is pre-filled from URL (e.g. from success page)
  useEffect(() => {
    const prefilledId = searchParams.get("orderId");
    if (prefilledId) {
      fetchOrder(prefilledId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchOrder = async (id: string) => {
    if (!id.trim()) return;
    setIsLoading(true);
    setErrorText("");
    setOrderData(null);
    try {
      const res = await fetch(`/api/track-order?orderId=${encodeURIComponent(id.trim())}`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal melacak pesanan");
      setOrderData(result.data);
    } catch (error: any) {
      setErrorText(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrder(orderId);
  };

  const copySN = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Determine Timeline Progress
  // Statuses: PENDING, PAID, SUCCESS, FAILED
  const getStepStatus = (stepIndex: number, currentStatus: string) => {
     if (currentStatus === "FAILED") {
       if (stepIndex === 0) return "completed";
       return "failed"; // The rest are failed
     }
     
     if (currentStatus === "SUCCESS") {
       return "completed";
     }
     
     if (currentStatus === "PAID") {
       if (stepIndex <= 1) return "completed";
       if (stepIndex === 2) return "processing";
       return "waiting";
     }
     
     if (currentStatus === "PENDING") {
       if (stepIndex === 0) return "processing";
       return "waiting";
     }
     
     return "waiting";
  };

  return (
    <div className="min-h-screen bg-[#0a0f16] flex flex-col pt-32 pb-24 px-4 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-full h-[500px] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-[#0a0f16] to-[#0a0f16] pointer-events-none"></div>

      <div className="max-w-3xl mx-auto w-full relative z-10 flex flex-col items-center">
         
         <div className="mb-12 text-center">
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4 drop-shadow-md">
               Lacak Pesanan
            </h1>
            <p className="text-slate-400 font-medium md:text-lg">
               Pantau status top-up Anda secara real-time dengan nomor Invoice (TRX).
            </p>
         </div>

         {/* SEARCH BOX */}
         <motion.form 
           onSubmit={handleTrack}
           initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
           className="w-full bg-[#111823]/80 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 shadow-2xl shadow-blue-900/10 mb-10"
         >
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                 <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                 <input 
                   type="text"
                   value={orderId}
                   onChange={e => setOrderId(e.target.value.toUpperCase())}
                   placeholder="Contoh: TRX-16980000-A1B2C3"
                   className="w-full bg-[#0a0f16] border border-white/5 text-white pl-14 pr-6 py-5 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono text-base md:text-lg uppercase placeholder:normal-case placeholder:text-slate-500 shadow-inner"
                 />
              </div>
              <button 
                type="submit" disabled={isLoading || !orderId.trim()}
                className={`py-5 px-8 rounded-2xl font-bold text-white transition-all shadow-lg flex items-center justify-center gap-2 md:w-auto w-full shrink-0
                  ${isLoading || !orderId.trim() 
                    ? "bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed" 
                    : "bg-blue-600 hover:bg-blue-500 hover:shadow-[0_10px_30px_rgba(37,99,235,0.4)] hover:-translate-y-1"}
                `}
              >
                {isLoading ? <RefreshCcw className="w-5 h-5 animate-spin" /> : "Lacak Sekarang"}
              </button>
            </div>
            
            <AnimatePresence>
               {errorText && (
                 <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-4">
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-medium">
                       <AlertCircle className="w-5 h-5 shrink-0" /> {errorText}
                    </div>
                 </motion.div>
               )}
            </AnimatePresence>
         </motion.form>

         {/* RESULT CARD */}
         <AnimatePresence mode="wait">
            {orderData && (
              <motion.div 
                key={orderData.orderId}
                initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -20 }}
                className="w-full bg-[#111823]/95 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-6 lg:p-10 shadow-[0_30px_60px_rgba(0,0,0,0.5)] relative overflow-hidden"
              >
                 {/* Status Color Bar */}
                 {orderData.status === 'SUCCESS' && <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,1)]"></div>}
                 {orderData.status === 'FAILED' && <div className="absolute top-0 left-0 w-full h-2 bg-red-500 shadow-[0_0_20px_rgba(239,68,68,1)]"></div>}
                 {(orderData.status === 'PENDING' || orderData.status === 'PAID') && <div className="absolute top-0 left-0 w-full h-2 bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,1)]"></div>}

                 <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6 mb-10 border-b border-white/5 pb-8">
                    <div>
                      <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-1">Invoice ID</p>
                      <h2 className="text-2xl md:text-3xl font-mono font-black text-white">{orderData.orderId}</h2>
                      <p className="text-xs text-slate-500 mt-2 font-medium">{new Date(orderData.createdAt).toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" })}</p>
                    </div>
                     <div className="bg-[#0a0f16]/90 border border-white/5 rounded-2xl p-4 self-start lg:self-auto min-w-[180px]">
                       <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Total Transaksi</p>
                       <p className="text-2xl font-black text-emerald-400">
                         {formatRupiah(orderData.price)}
                       </p>
                     </div>
                 </div>

                 {/* ITEM DETAIL */}
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                   <div className="bg-[#0a0f16] p-4 rounded-xl border border-white/5">
                      <p className="text-slate-500 text-xs mb-1">Item yang dibeli</p>
                      <p className="text-white font-bold text-sm leading-tight">{orderData.productName}</p>
                   </div>
                   <div className="bg-[#0a0f16] p-4 rounded-xl border border-white/5">
                      <p className="text-slate-500 text-xs mb-1">User ID</p>
                      <p className="text-blue-400 font-bold text-sm bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 w-max mt-1">{orderData.gameId}</p>
                   </div>
                   <div className="bg-[#0a0f16] p-4 rounded-xl border border-white/5">
                      <p className="text-slate-500 text-xs mb-1">Zone ID</p>
                      <p className="text-white font-bold text-sm">{orderData.zoneId || '-'}</p>
                   </div>
                   <div className="bg-[#0a0f16] p-4 rounded-xl border border-white/5">
                      <p className="text-slate-500 text-xs mb-1">Status Pembayaran</p>
                      <p className="text-white font-bold text-sm">
                        {orderData.status === 'PENDING' ? <span className="text-yellow-400">Belum Dibayar</span> : <span className="text-emerald-400">Sudah Dibayar</span>}
                      </p>
                   </div>
                 </div>

                 {/* VISUAL TIMELINE PROGRESS */}
                 <div className="relative pt-4 pb-8">
                    {/* Background Line */}
                    <div className="absolute top-[34px] md:top-[38px] left-8 right-8 h-1 bg-slate-800 rounded-full z-0"></div>
                    
                    {/* Active Line Progress */}
                    <div className="absolute top-[34px] md:top-[38px] left-8 h-1 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,1)] rounded-full z-0 transition-all duration-1000" 
                         style={{ 
                           width: orderData.status === 'SUCCESS' || orderData.status === 'FAILED' ? '100%' : 
                                  orderData.status === 'PAID' ? '50%' : '0%' 
                         }}></div>

                    <div className="flex justify-between relative z-10 font-bold text-sm">
                       
                       {/* Step 1: Pending */}
                       <div className="flex flex-col items-center gap-3 w-1/3 text-center">
                          <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all ${getStepStatus(0, orderData.status) === 'completed' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'bg-slate-800 text-slate-400 border-2 border-slate-700'}`}>
                             <Clock className="w-5 h-5 md:w-7 md:h-7" />
                          </div>
                          <div>
                            <span className={`block md:text-base text-xs ${getStepStatus(0, orderData.status) === 'completed' ? 'text-white' : 'text-slate-500'}`}>Pesanan Dibuat</span>
                          </div>
                       </div>

                       {/* Step 2: Paid/Processing */}
                       <div className="flex flex-col items-center gap-3 w-1/3 text-center">
                          <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all ${
                            getStepStatus(1, orderData.status) === 'completed' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 
                            getStepStatus(1, orderData.status) === 'processing' ? 'bg-[#111823] text-blue-400 border-2 border-blue-500 animate-pulse' : 
                            'bg-slate-800 text-slate-400 border-2 border-slate-700'
                          }`}>
                             {getStepStatus(1, orderData.status) === 'processing' ? <RefreshCcw className="w-5 h-5 md:w-7 md:h-7 animate-spin" /> : <ShieldCheck className="w-5 h-5 md:w-7 md:h-7" />}
                          </div>
                          <div>
                            <span className={`block md:text-base text-xs ${getStepStatus(1, orderData.status) === 'completed' || getStepStatus(1, orderData.status) === 'processing' ? 'text-white' : 'text-slate-500'}`}>Diproses Server</span>
                          </div>
                       </div>

                       {/* Step 3: Success / Failed */}
                       <div className="flex flex-col items-center gap-3 w-1/3 text-center">
                          <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all ${
                            getStepStatus(2, orderData.status) === 'completed' ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.7)]' : 
                            getStepStatus(2, orderData.status) === 'failed' ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.7)]' : 
                            'bg-slate-800 text-slate-400 border-2 border-slate-700'
                          }`}>
                            {getStepStatus(2, orderData.status) === 'failed' ? <AlertCircle className="w-6 h-6 md:w-8 md:h-8" /> : 
                             getStepStatus(2, orderData.status) === 'completed' ? <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8" /> :
                             <Package className="w-5 h-5 md:w-7 md:h-7" />
                            }
                          </div>
                          <div>
                            <span className={`block md:text-base text-xs ${getStepStatus(2, orderData.status) === 'completed' ? 'text-emerald-400' : getStepStatus(2, orderData.status) === 'failed' ? 'text-red-400' : 'text-slate-500'}`}>
                               {orderData.status === 'FAILED' ? 'Dibatalkan/Gagal' : 'Item Terkirim'}
                            </span>
                          </div>
                       </div>

                    </div>
                 </div>
                                  {/* SN / Delivery Note — shown for SUCCESS */}
                  {orderData.status === 'SUCCESS' && orderData.digiflazzNote && (
                    <div className="mt-6 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl">
                       <div className="flex items-center justify-between mb-1">
                         <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Serial Number (SN)</p>
                         <button
                           onClick={() => copySN(orderData.digiflazzNote)}
                           className="flex items-center gap-1 text-xs text-emerald-400 hover:text-white transition-colors"
                         >
                           {copied ? <CheckCheck className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                           {copied ? 'Tersalin!' : 'Salin'}
                         </button>
                       </div>
                       <p className="text-sm font-mono text-white break-all">{orderData.digiflazzNote}</p>
                       <p className="text-[10px] text-emerald-400/70 mt-2">Ini adalah bukti pengirimann item ke akun Anda.</p>
                    </div>
                  )}

                  {/* Pending Help Context */}
                  {orderData.status === 'PENDING' && (
                    <div className="mt-8 bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl flex items-start gap-3">
                       <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                       <p className="text-sm text-blue-200/80 leading-relaxed font-medium">
                         Sistem sedang menunggu Anda menyelesaikan pembayaran. Jika sudah bayar, status ini akan berubah ke <strong className="text-white">Diproses</strong> secara otomatis dalam beberapa menit.
                       </p>
                    </div>
                  )}

              </motion.div>
            )}
         </AnimatePresence>

         <div className="mt-10">
            <Link href="/" className="text-slate-400 hover:text-white font-bold flex items-center gap-2 transition-colors">
               <ChevronRight className="w-4 h-4 rotate-180" /> Kembali ke Beranda
            </Link>
         </div>
      </div>
    </div>
  );
}
