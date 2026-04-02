"use client";
/**
 * @file src/app/topup/success/AutoRefresh.tsx
 * @description Active status poller for the success page.
 *
 * Polls /api/check-payment-status every 2 seconds.
 * When the status changes from PENDING/PAID to SUCCESS or FAILED,
 * it triggers a full page refresh to display the resolved state.
 *
 * This is far more efficient than blind page reloads — it only
 * refreshes when there is actually new data to show.
 */
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface AutoRefreshProps {
  orderId: string;
  /** Interval in milliseconds between polls. Default: 2000 */
  intervalMs?: number;
}

export default function AutoRefresh({ orderId, intervalMs = 2000 }: AutoRefreshProps) {
  const router = useRouter();
  const resolvedRef = useRef(false); // Prevent polling after resolution

  useEffect(() => {
    if (!orderId || resolvedRef.current) return;

    const poll = async () => {
      if (resolvedRef.current) return;
      try {
        const res = await fetch(`/api/check-payment-status?order_id=${encodeURIComponent(orderId)}`);
        if (!res.ok) return;

        const data = await res.json();
        const status = data?.status;

        // If the status has been resolved, refresh the page once to show the result
        if (status === "SUCCESS" || status === "FAILED") {
          resolvedRef.current = true;
          router.refresh();
        }
        // If still PAID or PENDING, do nothing and wait for next poll
      } catch {
        // Network error — silently retry next interval
      }
    };

    const timer = setInterval(poll, intervalMs);
    return () => clearInterval(timer);
  }, [orderId, intervalMs, router]);

  return null; // Renders nothing — purely functional
}
