/**
 * @file src/lib/utils.ts
 * @description Centralized utility functions for the EterShop platform.
 * All helper/formatting/calculation logic should live here to avoid duplication.
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import crypto from "crypto";

// ─────────────────────────────────────────────
// 1. TAILWIND / CSS UTILITIES
// ─────────────────────────────────────────────

/**
 * Merges Tailwind CSS class names intelligently, resolving conflicts.
 * @example cn("p-4 text-sm", condition && "font-bold")
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─────────────────────────────────────────────
// 2. FORMATTING UTILITIES
// ─────────────────────────────────────────────

/**
 * Formats a number as Indonesian Rupiah currency string.
 * @param amount - The numeric value to format.
 * @returns Formatted string, e.g. "Rp 15.000"
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formats a Date object or ISO string into a human-readable Indonesian date-time.
 * @param date - The date to format.
 * @returns Formatted string, e.g. "28 Mar 2026, 22:30"
 */
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─────────────────────────────────────────────
// 3. STRING UTILITIES
// ─────────────────────────────────────────────

/**
 * Converts a brand name (e.g. "MOBILE LEGENDS") into a URL-safe slug (e.g. "mobile-legends").
 * This is the canonical slug algorithm used across the entire app.
 * Must be kept in sync with the reverse-lookup in the checkout page.
 * @param brand - The raw brand name from Digiflazz.
 * @returns URL-safe slug string.
 */
export function slugifyBrand(brand: string): string {
  return brand.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ─────────────────────────────────────────────
// 4. BUSINESS LOGIC UTILITIES
// ─────────────────────────────────────────────

/**
 * Calculates the final selling price based on the Digiflazz modal (cost) price.
 *
 * Margin Strategy:
 * - If cost < Rp 50.000 → Fixed margin of Rp 2.000
 * - If cost >= Rp 50.000 → 5% margin, rounded up to the nearest Rp 100
 *
 * This is the single source of truth for pricing. If the margin strategy changes,
 * only this function needs to be updated.
 *
 * @param cost - The original cost price from Digiflazz.
 * @returns The calculated selling price for the customer.
 */
export function calculateSellingPrice(cost: number): number {
  const FIXED_MARGIN = 2000;
  const PERCENTAGE_MARGIN = 0.05;
  const MODAL_THRESHOLD = 50_000;
  const ROUNDING_UNIT = 100;

  if (cost < MODAL_THRESHOLD) {
    return cost + FIXED_MARGIN;
  }

  const rawMargin = cost * PERCENTAGE_MARGIN;
  // Round up to the nearest ROUNDING_UNIT for cleaner pricing
  const roundedMargin = Math.ceil(rawMargin / ROUNDING_UNIT) * ROUNDING_UNIT;
  return cost + roundedMargin;
}

// ─────────────────────────────────────────────
// 5. CRYPTO / ID UTILITIES
// ─────────────────────────────────────────────

/**
 * Generates a unique, time-based order ID for a new transaction.
 * Format: TRX-{timestamp}-{6 random hex chars}
 * @example "TRX-1743220000000-A4F9C2"
 * @returns A unique order ID string.
 */
export function generateOrderId(): string {
  const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `TRX-${Date.now()}-${randomHex}`;
}

/**
 * Creates an MD5 signature for Digiflazz API requests.
 * Used for both price-list, balance check, and transaction execution.
 * @param username - Digiflazz account username.
 * @param apiKey - Digiflazz API key.
 * @param suffix - The suffix string appended before hashing ("pricelist", "depo", or the ref_id).
 * @returns MD5 hex digest string.
 */
export function createDigiflazzSignature(username: string, apiKey: string, suffix: string): string {
  return crypto.createHash("md5").update(username + apiKey + suffix).digest("hex");
}
