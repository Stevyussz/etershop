/**
 * @file src/app/topup/[game]/validator-actions.ts
 * @description Robust multi-provider nickname validator for game IDs.
 */

"use server";

import prisma from "@/lib/prisma";

const GAME_SLUG_MAP: Record<string, string> = {
  "MOBILE LEGENDS": "mobile-legends",
  "FREE FIRE": "free-fire",
  "VALORANT": "valorant",
  "GENSHIN IMPACT": "genshin-impact",
  "PUBG MOBILE": "pubg-mobile",
};

/**
 * List of backup providers for the Cek ID feature.
 * Most Indonesian dev community APIs follow the /api/game/[slug]?id=...&zone=... format.
 */
const FALLBACK_PROVIDERS = [
  "https://api.vany.my.id/api/game/",
  "https://api.henscorp.site/api/game/",
  "https://api.caliph.dev/api/game/",
];

/**
 * Validates a game nickname with automatic failover across multiple providers.
 */
export async function validateNickname(brand: string, gameId: string, zoneId?: string) {
  try {
    const slug = GAME_SLUG_MAP[brand.trim().toUpperCase()];
    if (!slug) return { success: false, message: "Validasi tidak tersedia untuk game ini." };

    // Primary URL from settings
    const settings = await prisma.siteSettings.findUnique({ where: { id: "main" } }) as any;
    const primaryBaseUrl = settings?.gameValidatorUrl || FALLBACK_PROVIDERS[0];

    // Combine primary and fallbacks, ensuring uniqueness
    const providers = Array.from(new Set([primaryBaseUrl, ...FALLBACK_PROVIDERS]));

    for (let i = 0; i < providers.length; i++) {
      const baseUrl = providers[i];
      let url = `${baseUrl}${slug}?id=${gameId}`;
      if (zoneId && slug === "mobile-legends") {
        url += `&zone=${zoneId}`;
      }

      console.log(`[Validator] Attempt ${i + 1} using: ${url}`);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout per provider
        
        const res = await fetch(url, { 
          method: "GET",
          signal: controller.signal,
          next: { revalidate: 30 } 
        });
        clearTimeout(timeoutId);

        if (!res.ok) continue; // Try next provider

        const data = await res.json();
        
        // Handle varied JSON structures from different community APIs
        const nickname = 
          data.nickname || 
          data.name || 
          data.username || 
          data.name_user || 
          data.data?.name || 
          data.data?.nickname ||
          data.result?.nickname;

        if (nickname) {
          return { success: true, nickname, providerIndex: i };
        }
      } catch (e) {
        console.warn(`[Validator] Provider ${i + 1} failed:`, (e as Error).message);
        continue; // Try next provider
      }
    }

    return { success: false, message: "Seluruh server validasi sedang sibuk atau ID salah. Silakan lanjut transaksi." };
  } catch (error) {
    console.error("[Validator] Nickname check critical failure:", error);
    return { success: false, message: "Gagal menghubungkan ke sistem validasi." };
  }
}
