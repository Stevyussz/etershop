"use client";
/**
 * @file src/app/topup/success/AutoRefresh.tsx
 * @description Invisible client component that auto-refreshes the page.
 * Used on the success page when order status is PAID or PENDING
 * to poll until Digiflazz resolves it to SUCCESS or FAILED.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface AutoRefreshProps {
  /** Interval in milliseconds between refreshes. Default: 5000 */
  intervalMs?: number;
}

export default function AutoRefresh({ intervalMs = 3000 }: AutoRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => {
      router.refresh(); // Next.js App Router soft refresh — re-runs Server Component data fetching
    }, intervalMs);

    return () => clearInterval(timer);
  }, [router, intervalMs]);

  return null; // Renders nothing — purely functional
}
