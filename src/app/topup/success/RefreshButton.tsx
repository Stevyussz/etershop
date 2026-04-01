"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCcw } from "lucide-react";

/**
 * @file src/app/topup/success/RefreshButton.tsx
 * @description Manual refresh button for checking payment status on the success page.
 */
export default function RefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={isPending}
      className="w-full py-2.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
    >
      <RefreshCcw className={`w-3 h-3 ${isPending ? "animate-spin" : ""}`} /> 
      {isPending ? "Mengecek..." : "Cek Status Pembayaran Saya"}
    </button>
  );
}
