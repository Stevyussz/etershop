"use client";

import { useTransition } from "react";
import { RefreshCcw } from "lucide-react";
import { refreshDigiflazzBalance } from "./actions";

interface RefreshBalanceButtonProps {
  isOnline: boolean;
}

/**
 * A client component button that triggers a server action to clear
 * the Digiflazz balance cache.
 */
export default function RefreshBalanceButton({ isOnline }: RefreshBalanceButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(async () => {
      try {
        await refreshDigiflazzBalance();
      } catch (error) {
        console.error("Failed to refresh balance:", error);
      }
    });
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={isPending}
      title="Refresh Saldo (Gunakan seperlunya untuk hemat Fixie)"
      className={`bg-[#111823] border border-white/5 rounded-2xl px-4 py-3 flex items-center gap-2.5 shadow-lg hover:bg-white/5 transition-all group ${
        isPending ? "opacity-70 cursor-not-allowed" : ""
      }`}
    >
      <div
        className={`w-2.5 h-2.5 rounded-full ${
          isOnline
            ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"
            : "bg-rose-500"
        }`}
      />
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
        {isOnline ? "Digiflazz Online" : "Digiflazz Offline"}
        <RefreshCcw
          className={`w-3 h-3 text-slate-500 group-hover:text-blue-400 transition-colors ${
            isPending ? "animate-spin text-blue-400" : ""
          }`}
        />
      </span>
    </button>
  );
}
