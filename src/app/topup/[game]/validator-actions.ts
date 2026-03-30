/**
 * @file src/app/topup/[game]/validator-actions.ts
 * @description Robust multi-provider nickname validator for game IDs.
 */

"use server";

import prisma from "@/lib/prisma";

const GAME_SLUG_MAP: Record<string, string[]> = {
  "MOBILE LEGENDS": ["mobile-legends", "mobilelegends", "ml"],
  "FREE FIRE": ["free-fire", "ff", "freefire"],
  "VALORANT": ["valorant"],
  "GENSHIN IMPACT": ["genshin-impact", "genshin"],
  "PUBG MOBILE": ["pubg-mobile", "pubg"],
};

/**
 * List of backup providers for the Cek ID feature.
 */
const FALLBACK_PROVIDERS = [
  "https://api.vany.my.id/api/game/",
  "https://api.henscorp.site/api/game/",
  "https://api.caliph.dev/api/game/",
  "https://api.kuhaku.id/api/game/",
];

/**
 * Validates a game nickname with automatic failover across multiple providers and slug aliases.
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

    // Combine primary and fallbacks, ensuring uniqueness
    const providers = Array.from(new Set([primaryBaseUrl, ...FALLBACK_PROVIDERS])).filter(Boolean);

    for (const baseUrl of providers) {
      // For each provider, we try the most likely slugs
      for (const slug of slugs) {
        let url = `${baseUrl}${slug}?id=${cleanId}`;
        if (cleanZone && normalizedBrand === "MOBILE LEGENDS") {
          url += `&zone=${cleanZone}`;
        }

        console.log(`[Validator] Trying: ${url}`);

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

          const res = await fetch(url, {
            method: "GET",
            signal: controller.signal,
            next: { revalidate: 60 }
          });
          clearTimeout(timeoutId);

          if (!res.ok) continue;

          const data = await res.json();
          if (!data) continue;

          // Some APIs return 200 but have a 'status: false' or 'status: 404' in the body
          if (data.status === false || data.status === "404" || data.error) {
              console.warn(`[Validator] Provider returned error:`, data.message || "Unknown");
              continue;
          }

          // Handle varied JSON structures from different community APIs
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
        } catch (e) {
          console.warn(`[Validator] Request failed for ${url}:`, (e as Error).message);
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
