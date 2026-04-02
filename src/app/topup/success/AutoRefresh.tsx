"use client";
/**
 * @file src/app/topup/success/AutoRefresh.tsx
 * @description Active status poller for the success page.
 *
 * Polls /api/check-payment-status every 1.5 seconds.
 * When the status changes to SUCCESS or FAILED, forces a HARD page reload
 * via window.location.reload() (not router.refresh which can be cached).
 */
import { useEffect, useRef } from "react";

interface AutoRefreshProps {
  orderId: string;
  intervalMs?: number;
}

export default function AutoRefresh({ orderId, intervalMs = 1500 }: AutoRefreshProps) {
  const resolvedRef = useRef(false);

  useEffect(() => {
    if (!orderId || resolvedRef.current) return;

    const poll = async () => {
      if (resolvedRef.current) return;
      try {
        // Use a timestamp to mathematically prevent browser caching of the API response
        const res = await fetch(`/api/check-payment-status?order_id=${encodeURIComponent(orderId)}&t=${Date.now()}`, {
          cache: "no-store", 
        });
        if (!res.ok) return;

        const data = await res.json();
        const status = data?.status;

        if (status === "SUCCESS" || status === "FAILED") {
          resolvedRef.current = true;
          // Hard reload — guaranteed to re-fetch fresh data from DB
          window.location.reload();
        }
      } catch {
        // Network blip — silently retry
      }
    };

    // Poll immediately on mount (don't wait for first interval)
    poll();
    const timer = setInterval(poll, intervalMs);
    return () => clearInterval(timer);
  }, [orderId, intervalMs]);

  return null;
}
