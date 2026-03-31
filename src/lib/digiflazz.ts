/**
 * @file src/lib/digiflazz.ts
 * @description Centralized Digiflazz API client for EterShop.
 *
 * This module is the SINGLE SOURCE OF TRUTH for all Digiflazz API interactions.
 * All other parts of the app MUST use these functions — do NOT call the Digiflazz
 * API directly from routes or actions to avoid duplicated logic.
 *
 * API Reference: https://documenter.getpostman.com/view/7508948/SWLfaVBg
 */

import { createDigiflazzSignature } from "@/lib/utils";
import fetch from "node-fetch";
import { HttpsProxyAgent } from "https-proxy-agent";
import { unstable_cache } from "next/cache";

// Custom fetch wrapper that automatically routes via Fixie proxy if the env proxy URL is set
async function fetchViaProxy(url: string, options: any) {
  const proxyUrl = process.env.FIXIE_URL;
  const isProd = process.env.NODE_ENV === "production";

  // ENFORCEMENT: In production, we MUST use a proxy to keep the IP static and avoid whitelisting issues.
  if (isProd && !proxyUrl) {
    throw new Error(
      "[Digiflazz Proxy] FATAL: FIXIE_URL is missing in Production! Direct request blocked to prevent IP Whitelist errors."
    );
  }

  // TIMEOUT: Prevent hanging requests by aborting after 30 seconds.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const fetchOptions = { ...options, signal: controller.signal };
    
    if (proxyUrl) {
      fetchOptions.agent = new HttpsProxyAgent(proxyUrl);
      // console.log(`[Fixie] Routing request to ${url} via Proxy`);
    }

    const response = await fetch(url, fetchOptions);
    return response;
    
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error("[Digiflazz Proxy] Request timed out (30s). Proxy is slow or Digiflazz is unreachable.");
    }
    console.error("[Digiflazz Proxy] Request failed:", err.message);
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────

const DIGIFLAZZ_BASE_URL = "https://api.digiflazz.com/v1";

/**
 * Reads Digiflazz credentials from environment variables at runtime.
 * Throws a clear error if credentials are missing to prevent silent failures.
 */
function getCredentials(): { username: string; apiKey: string } {
  const username = process.env.DIGIFLAZZ_USERNAME;
  const apiKey = process.env.DIGIFLAZZ_API_KEY;

  if (!username || !apiKey) {
    throw new Error(
      "[Digiflazz] Missing credentials. Please set DIGIFLAZZ_USERNAME and DIGIFLAZZ_API_KEY in your .env file."
    );
  }

  return { username, apiKey };
}

// ─────────────────────────────────────────────
// TYPE DEFINITIONS
// ─────────────────────────────────────────────

/** Represents a single product entry from the Digiflazz price list API. */
export interface DigiflazzProduct {
  product_name: string;
  category: string;
  brand: string;
  type: string;
  seller_name: string;
  price: number;
  buyer_sku_code: string;
  buyer_product_status: boolean;
  seller_product_status: boolean;
  unlimited_stock: boolean;
  stock: number;
  multi: boolean;
  start_cut_off: string;
  end_cut_off: string;
  desc: string;
}

/** Represents the Digiflazz balance response data. */
export interface DigiflazzBalance {
  deposit: number;
}

/** 
 * Represents the result of a Digiflazz topup transaction. 
 * Status: "Sukses" | "Gagal" | "Pending"
 */
export interface DigiflazzTransactionResult {
  ref_id: string;
  customer_no: string;
  buyer_sku_code: string;
  message: string;
  status: "Sukses" | "Gagal" | "Pending";
  rc: string;
  sn: string;
  buyer_last_saldo: number;
  price: number;
}

// ─────────────────────────────────────────────
// API FUNCTIONS
// ─────────────────────────────────────────────

/**
 * Internal function that actually hits the Digiflazz balance API.
 */
async function fetchDigiflazzBalanceLive(): Promise<number | null> {
  try {
    const { username, apiKey } = getCredentials();
    const sign = createDigiflazzSignature(username, apiKey, "depo");

    const res = await fetchViaProxy(`${DIGIFLAZZ_BASE_URL}/cek-saldo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cmd: "deposit", username, sign }),
    });

    if (!res.ok) return null;

    const json = (await res.json()) as any;
    return json.data?.deposit ?? null;
  } catch (error) {
    console.error("[Digiflazz] Failed to fetch balance:", error);
    return null;
  }
}

/**
 * Fetches the current account deposit balance from Digiflazz.
 * Used for real-time balance monitoring in the Admin Dashboard.
 * 
 * CRITICAL QUOTA OPTIMIZATION: 
 * Cached aggressively for 24 hours to prevent draining Fixie Proxy monthly limits 
 * (500 requests/month) when the admin frequently reloads the dashboard.
 * Use revalidateTag("digiflazz-balance") in an action to force refresh.
 *
 * @returns The current deposit balance in IDR, or null if the request fails.
 */
export const getDigiflazzBalance = unstable_cache(
  async () => fetchDigiflazzBalanceLive(),
  ["digiflazz-balance-cache"],
  { revalidate: 86400, tags: ["digiflazz-balance"] } // 86400s = 24 hours
);

/**
 * Fetches the full prepaid product price list from Digiflazz.
 * Results are cached briefly on the server to avoid hammering the API on every sync.
 *
 * @returns Array of all Digiflazz products, or an empty array on failure.
 */
export async function getDigiflazzPriceList(): Promise<DigiflazzProduct[]> {
  try {
    const { username, apiKey } = getCredentials();
    const sign = createDigiflazzSignature(username, apiKey, "pricelist");

    const res = await fetchViaProxy(`${DIGIFLAZZ_BASE_URL}/price-list`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cmd: "prepaid", username, sign }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`Digiflazz price-list returned HTTP ${res.status}: ${errorBody}`);
    }

    const json = (await res.json()) as any;

    if (!Array.isArray(json.data)) {
      // Digiflazz may return an object with a message on auth/IP errors
      const errorMsg = json.data?.message || json.message || JSON.stringify(json);
      throw new Error(`Digiflazz API rejected request: ${errorMsg}`);
    }

    return json.data as DigiflazzProduct[];
  } catch (error) {
    console.error("[Digiflazz] Failed to fetch price list:", error);
    throw error; // Re-throw so the caller (sync action) can surface the error to the admin UI
  }
}

/**
 * Executes a prepaid top-up transaction via the Digiflazz API.
 *
 * This function includes a retry mechanism (up to MAX_RETRIES attempts) to handle
 * transient network errors. It will NOT retry if Digiflazz explicitly returns a
 * "Gagal" status (which indicates a product/account issue, not a network issue).
 *
 * @param sku - The Digiflazz buyer_sku_code for the product.
 * @param customerNo - The destination account number (Game ID or phone number).
 *                     For games with Zone ID (e.g., Mobile Legends), this should
 *                     be the combined string: `${gameId}${zoneId}`.
 * @param refId - A unique reference ID (our internal order ID). Used for idempotency.
 * @returns The Digiflazz transaction result object.
 * @throws If the request fails after all retries.
 */
export async function executeDigiflazzTopup(
  sku: string,
  customerNo: string,
  refId: string
): Promise<{ data: DigiflazzTransactionResult }> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 1500;

  const { username, apiKey } = getCredentials();
  // IMPORTANT: The signature for transactions uses the refId (not a fixed string)
  const sign = createDigiflazzSignature(username, apiKey, refId);

  const payload = {
    username,
    buyer_sku_code: sku,
    customer_no: customerNo,
    ref_id: refId,
    sign,
  };

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[Digiflazz] Topup attempt ${attempt}/${MAX_RETRIES} for refId: ${refId}`);

      const response = await fetchViaProxy(`${DIGIFLAZZ_BASE_URL}/transaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { data: DigiflazzTransactionResult };
      const resultData = data?.data;
      const digiStatus = resultData?.status;

      // If Digiflazz explicitly marks it as "Gagal", the product has an issue.
      // No point in retrying — it will fail again.
      if (digiStatus === "Gagal") {
        console.warn(`[Digiflazz] Transaction explicitly FAILED for ${refId}:`, resultData?.message);
        return data;
      }

      // Success or Pending — return the result
      return data;

    } catch (err: any) {
      lastError = err;
      console.error(`[Digiflazz] Attempt ${attempt} failed for ${refId}:`, err.message);

      if (attempt < MAX_RETRIES) {
        // Wait before retrying to give transient issues time to resolve
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }

  throw new Error(`[Digiflazz] Transaction failed after ${MAX_RETRIES} attempts for ${refId}. Last error: ${lastError?.message}`);
}
