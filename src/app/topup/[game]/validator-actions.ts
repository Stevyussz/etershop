/**
 * @file src/app/topup/[game]/validator-actions.ts
 * @description Server Action to validate game nicknames via free community APIs.
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
 * Validates a game nickname by calling a free community API.
 */
export async function validateNickname(brand: string, gameId: string, zoneId?: string) {
  try {
    const slug = GAME_SLUG_MAP[brand.trim().toUpperCase()];
    if (!slug) return { success: false, message: "Validasi tidak tersedia untuk game ini." };

    // Fetch the validator URL from settings
    const settings = await prisma.siteSettings.findUnique({ where: { id: "main" } });
    const baseUrl = settings?.gameValidatorUrl || "https://api.vany.my.id/api/game/";

    // Build the query
    let url = `${baseUrl}${slug}?id=${gameId}`;
    if (zoneId && slug === "mobile-legends") {
      url += `&zone=${zoneId}`;
    }

    const res = await fetch(url, { 
      method: "GET",
      next: { revalidate: 60 } // Cache for 1 minute
    });

    if (!res.ok) {
      return { success: false, message: "Layanan validasi sedang sibuk. Silakan lanjut transaksi." };
    }

    const data = await res.json();
    
    // Different community APIs return different payload structures (name, nickname, username)
    const nickname = data.nickname || data.name || data.username || data.name_user || data.data?.name || data.data?.nickname;

    if (!nickname) {
      return { success: false, message: "ID tidak ditemukan. Pastikan data benar." };
    }

    return { success: true, nickname };
  } catch (error) {
    console.error("[Validator] Nickname check failed:", error);
    return { success: false, message: "Gagal menghubungkan ke validator." };
  }
}
