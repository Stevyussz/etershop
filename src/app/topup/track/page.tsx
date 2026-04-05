"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Search, Loader2, AlertCircle, TicketCheck, ChevronRight, Package, Clock, ShieldCheck, Copy, CheckCircle2, MessageSquare, Phone, Info, CheckCheck, RefreshCcw, QrCode } from "lucide-react";
import PremiumInvoice from "@/components/shared/PremiumInvoice";
import { formatRupiah } from "@/lib/utils";

function TrackOrderContent() {
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
               Pantau status top-up Anda secara real-time dengan nomor Invoice (TRX/POS).
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
                   placeholder="Contoh: TRX-xxx atau POS-xxx"
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

         {/* RESULT SECTION */}
         <AnimatePresence mode="wait">
            {orderData && (
              <motion.div 
                key={orderData.orderId}
                initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -20 }}
                className="w-full relative 0 z-10"
              >
                 {/* VISUAL TIMELINE PROGRESS (Print Hide) */}
                 <div className="relative pt-4 pb-8 print-hide bg-[#111823]/80 p-6 md:p-10 rounded-[2.5rem] border border-white/10 mb-8 mt-4 shadow-xl backdrop-blur-xl max-w-2xl mx-auto">
                    {/* Background Line */}
                    <div className="absolute top-[58px] left-10 right-10 md:left-14 md:right-14 h-1 bg-slate-800 rounded-full z-0"></div>
                    
                    {/* Active Line Progress */}
                    <div className="absolute top-[58px] left-10 md:left-14 h-1 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,1)] rounded-full z-0 transition-all duration-1000" 
                         style={{ 
                           width: orderData.status === 'SUCCESS' || orderData.status === 'FAILED' ? 'calc(100% - 80px)' : 
                                  orderData.status === 'PAID' ? 'calc(50% - 40px)' : '0%' 
                         }}></div>

                    <div className="flex justify-between relative z-10 font-bold text-sm px-2">
                       
                       {/* Step 1: Pending */}
                       <div className="flex flex-col items-center gap-3 w-1/3 text-center">
                          <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all ${getStepStatus(0, orderData.status) === 'completed' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'bg-[#0a0f16] text-slate-400 border-2 border-slate-700'}`}>
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
                            getStepStatus(1, orderData.status) === 'processing' ? 'bg-[#0a0f16] text-blue-400 border-2 border-blue-500 animate-pulse' : 
                            'bg-[#0a0f16] text-slate-400 border-2 border-slate-700'
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
                            'bg-[#0a0f16] text-slate-400 border-2 border-slate-700'
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

                 {/* Premium Invoice */}
                 <PremiumInvoice transaction={orderData} showPrintButton={true} />

                  {/* Pending Help Context */}
                  {orderData.status === 'PENDING' && (
                    <div className="mt-8 bg-blue-500/10 border border-blue-500/20 p-5 rounded-3xl flex flex-col md:flex-row items-center gap-5 justify-between">
                       <div className="flex items-start gap-4">
                         <div className="bg-blue-500/20 p-2 rounded-xl shrink-0 text-blue-400">
                           <Info className="w-6 h-6" />
                         </div>
                         <div>
                           <p className="text-white font-bold text-lg mb-1">Menunggu Pembayaran</p>
                           <p className="text-sm text-slate-400 leading-relaxed max-w-lg">
                             Sistem sedang menunggu Anda menyelesaikan pembayaran. Jika pembayaran sukses, status pesanan akan diproses otomatis ke Etershop dalam hitungan detik.
                           </p>
                         </div>
                       </div>
                       
                       <Link
                          href="/topup"
                          className="w-full md:w-auto mt-2 md:mt-0 whitespace-nowrap bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-blue-500/25 flex items-center justify-center gap-2"
                        >
                          <QrCode className="w-5 h-5" />
                          Bayar Ulang via QRIS
                        </Link>
                    </div>
                  )}

                  {/* Failed/Gagal Help Context */}
                  {orderData.status === 'FAILED' && (
                    <div className="mt-8 bg-rose-500/10 border border-rose-500/20 p-5 rounded-3xl flex flex-col md:flex-row items-center gap-5 justify-between">
                       <div className="flex items-start gap-4">
                         <div className="bg-rose-500/20 p-2 rounded-xl shrink-0 text-rose-400">
                           <MessageSquare className="w-6 h-6" />
                         </div>
                         <div>
                           <p className="text-white font-bold text-lg mb-1">Transaksi Gagal</p>
                           <p className="text-sm text-slate-400 leading-relaxed max-w-lg">
                             Jangan khawatir ya, kendala transaksi Anda akan kami bantu sampai selesai. Silakan hubungi Customer Service kami untuk bantuan lebih lanjut.
                           </p>
                         </div>
                       </div>
                       
                       <Link
                         href={`https://wa.me/6285175224481?text=${encodeURIComponent(
                           `Halo Admin EterShop, saya ingin bertanya mengenai pesanan saya dengan Order ID: ${orderData.orderId}.\n\nStatus: ${orderData.status}\nProduk: ${orderData.productName}\n\nMohon bantuannya ya!`
                         )}`}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="w-full md:w-auto mt-2 md:mt-0 whitespace-nowrap bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-emerald-500/25 flex items-center justify-center gap-2"
                       >
                         <Phone className="w-5 h-5" />
                         Hubungi CS WhatsApp
                       </Link>
                    </div>
                  )}

              </motion.div>
            )}
         </AnimatePresence>

         {/* Midtrans QRIS — no Snap script needed */}

         <div className="mt-10">
            <Link href="/" className="text-slate-400 hover:text-white font-bold flex items-center gap-2 transition-colors">
               <ChevronRight className="w-4 h-4 rotate-180" /> Kembali ke Beranda
            </Link>
         </div>
      </div>
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense>
      <TrackOrderContent />
    </Suspense>
  );
}
