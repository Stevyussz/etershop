/**
 * @file src/app/topup/[game]/validator-actions.ts
 * @description Robust multi-provider nickname validator for game IDs with browser simulation.
 */

"use server";

import prisma from "@/lib/prisma";

const GAME_SLUG_MAP: Record<string, string[]> = {
  "MOBILE LEGENDS": ["mobile-legends", "mobilelegends", "ml", "mlbb"],
  "FREE FIRE": ["free-fire", "ff", "freefire"],
  "VALORANT": ["valorant", "val"],
  "GENSHIN IMPACT": ["genshin-impact", "genshin"],
  "PUBG MOBILE": ["pubg-mobile", "pubg", "pubgm"],
};

/**
 * List of backup providers for the Cek ID feature.
 */
const FALLBACK_PROVIDERS = [
  "https://api.vany.my.id/api/game/",
  "https://api.henscorp.site/api/game/",
  "https://api.caliph.dev/api/game/",
  "https://api.kuhaku.id/api/game/",
  "https://api.razu.my.id/api/game/",
];

/**
 * Browser-like headers to bypass Cloudflare and simple anti-bot protections.
 * Some free community APIs block headless requests.
 */
const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
  "Referer": "https://www.google.com/",
};

/**
 * Validates a game nickname with automatic failover across multiple providers and browser simulation.
 */
export async function validateNickname(brand: string, gameId: string, zoneId?: string) {
  try {
    const normalizedBrand = brand.trim().toUpperCase();
    const slugs = GAME_SLUG_MAP[normalizedBrand];
    
    if (!slugs || slugs.length === 0) {
      return { success: false, message: "Validasi tidak tersedia untuk game ini." };
    }

    // Sanitize gameId (remove spaces/special chars)
    const cleanId = gameId.replace(/\s+/g, "").trim();
    const cleanZone = zoneId ? zoneId.replace(/\s+/g, "").trim() : "";

    // Primary URL from settings
    const settings = await prisma.siteSettings.findUnique({ where: { id: "main" } }) as any;
    const primaryBaseUrl = settings?.gameValidatorUrl || FALLBACK_PROVIDERS[0];

    // Combine primary and fallbacks, ensuring uniqueness and removing nulls
    const providers = Array.from(new Set([primaryBaseUrl, ...FALLBACK_PROVIDERS])).filter(Boolean);

    for (const baseUrl of providers) {
      // For each provider, we try the most likely slugs
      for (const slug of slugs) {
        let url = `${baseUrl}${slug}?id=${cleanId}`;
        if (cleanZone && normalizedBrand === "MOBILE LEGENDS") {
          url += `&zone=${cleanZone}`;
        }

        console.log(`[Validator] Attemping reach: ${url}`);

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 7000); // 7s timeout

          const res = await fetch(url, {
            method: "GET",
            headers: BROWSER_HEADERS, // Key Fix: Simulate Browser
            signal: controller.signal,
            next: { revalidate: 60 }
          });
          clearTimeout(timeoutId);

          if (!res.ok) {
            console.warn(`[Validator] Provider ${baseUrl} returned status ${res.status}`);
            continue;
          }

          const data = await res.json();
          if (!data) continue;

          // Some APIs return 200 but have error flags in JSON
          if (data.status === false || data.status === "404" || data.status === 404 || data.error) {
              continue;
          }

          // Handle varied JSON structures
          const nickname = 
            data.nickname || 
            data.name || 
            data.username || 
            data.name_user || 
            data.data?.name || 
            data.data?.nickname ||
            data.result?.nickname ||
            data.result?.name;

          if (nickname && typeof nickname === 'string' && nickname.length > 0) {
            console.log(`[Validator] SUCCESS! Nickname: ${nickname} via ${baseUrl}`);
            return { success: true, nickname };
          }
        } catch (e: any) {
          console.warn(`[Validator] Request failed for ${url}:`, e.message);
          continue;
        }
      }
    }

    return { 
      success: false, 
      message: "Server validasi sedang sibuk. Silakan pastikan ID benar dan lanjut transaksi." 
    };
  } catch (error) {
    console.error("[Validator] Nickname check critical failure:", error);
    return { success: false, message: "Gagal menghubungkan ke sistem validasi." };
  }
}
