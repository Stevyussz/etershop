/**
 * @file src/app/admin/settings/price-actions.ts
 * @description Server Actions for managing global pricing calculations.
 */

"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { verifyAdmin } from "@/lib/auth";

// ─── Helpers ───────────────────────────────────────────────────────────────

function calculateDynamicPrice(cost: number, settings: any): number {
  const type = settings?.globalMarkupType || "TIERED";
  const percent = Number(settings?.globalMarkupPercent) || 5.0;
  const fixed = Number(settings?.globalMarkupFixed) || 2000;
  const ROUNDING = 100;

  if (type === "PERCENT") {
    return cost + Math.ceil((cost * percent / 100) / ROUNDING) * ROUNDING;
  } else if (type === "FIXED") {
    return cost + fixed;
  } else {
    // TIERED (legacy default)
    if (cost < 50_000) return cost + 2000;
    return cost + Math.ceil((cost * 0.05) / ROUNDING) * ROUNDING;
  }
}

// ─── Fetch ──────────────────────────────────────────────────────────────────

/** Fetches only the 4 pricing fields — serialized, safe for Client Components */
export async function getPriceSettings() {
  try {
    await verifyAdmin();
    const s = await prisma.siteSettings.findUnique({
      where: { id: "main" },
      select: {
        globalMarkupType: true,
        globalMarkupPercent: true,
        globalMarkupFixed: true,
        gameValidatorUrl: true,
      },
    });
    if (!s) return null;
    return {
      globalMarkupType: s.globalMarkupType ?? "TIERED",
      globalMarkupPercent: s.globalMarkupPercent ?? 5,
      globalMarkupFixed: s.globalMarkupFixed ?? 2000,
      gameValidatorUrl: s.gameValidatorUrl ?? "https://api.vany.my.id/api/game/",
    };
  } catch (error) {
    console.error("[PriceActions] Fetch failed:", error);
    return null;
  }
}

// ─── Save Settings ───────────────────────────────────────────────────────────

/**
 * Saves only the 4 pricing fields to avoid type crashes from unrelated
 * Date fields (countdownEnd, etc.) serialized as strings by the browser.
 */
export async function updatePriceSettings(data: any) {
  try {
    await verifyAdmin();
    const payload = {
      globalMarkupType: String(data.globalMarkupType ?? "TIERED"),
      globalMarkupPercent: Number(data.globalMarkupPercent ?? 5),
      globalMarkupFixed: Number(data.globalMarkupFixed ?? 2000),
      gameValidatorUrl: String(data.gameValidatorUrl ?? ""),
    };

    await prisma.siteSettings.upsert({
      where: { id: "main" },
      update: payload,
      create: { id: "main", ...payload },
    });

    revalidatePath("/admin/settings");
    revalidatePath("/admin/products");
    revalidatePath("/topup");
    revalidatePath("/");

    return { success: true };
  } catch (error: any) {
    console.error("[PriceActions] Update failed:", error);
    return { success: false, message: error.message };
  }
}

// ─── Targeted Apply ──────────────────────────────────────────────────────────

/**
 * Recalculates and updates selling prices WITHOUT touching Digiflazz.
 * Target options:
 *   - mode "all"   → all products
 *   - mode "brand" → only products matching the given brand
 *   - mode "sku"   → only the single product with the given SKU
 */
export async function applyPricingTarget(
  mode: "all" | "brand" | "sku",
  target?: string
): Promise<{ success: boolean; message: string }> {
  try {
    await verifyAdmin();
    // 1. Load current pricing settings
    const settings = await prisma.siteSettings.findUnique({
      where: { id: "main" },
      select: { globalMarkupType: true, globalMarkupPercent: true, globalMarkupFixed: true },
    });

    if (!settings) {
      return { success: false, message: "Pengaturan harga belum dikonfigurasi. Simpan dulu sebelum menerapkan." };
    }

    // 2. Build the where clause
    const whereClause: any =
      mode === "brand" && target ? { brand: target } :
      mode === "sku"   && target ? { sku: target }   :
      {};                                            // all

    // 3. Fetch products to update
    const products = await prisma.topupProduct.findMany({
      where: whereClause,
      select: { id: true, originalPrice: true },
    });

    if (products.length === 0) {
      return { success: false, message: "Tidak ada produk ditemukan untuk target ini." };
    }

    // 4. Batch update (200 per chunk to avoid DB pool exhaustion)
    const CHUNK = 200;
    let updated = 0;
    for (let i = 0; i < products.length; i += CHUNK) {
      const chunk = products.slice(i, i + CHUNK);
      const updates = chunk.map((p) =>
        prisma.topupProduct.update({
          where: { id: p.id },
          data: { price: calculateDynamicPrice(p.originalPrice, settings) },
        }).catch((e) => {
          console.warn(`Failed to update price for product ${p.id}:`, e.message);
        })
      );
      
      await Promise.all(updates);
      updated += chunk.length;
    }

    revalidatePath("/admin/products");
    revalidatePath("/topup");
    revalidatePath("/");

    const label =
      mode === "brand" ? `game "${target}"` :
      mode === "sku"   ? `SKU "${target}"` :
      "semua produk";

    return { success: true, message: `✅ Berhasil terapkan harga ke ${updated} produk (${label}).` };
  } catch (err: any) {
    console.error("[PriceActions] applyPricingTarget error:", err);
    return { success: false, message: `Gagal: ${err.message}` };
  }
}

// ─── Search Products (for SKU picker) ────────────────────────────────────────

/** Returns up to 10 products matching the query by name or SKU. MongoDB-safe (no mode: insensitive). */
export async function searchProducts(query: string): Promise<
  { sku: string; name: string; brand: string; price: number; originalPrice: number }[]
> {
  if (!query || query.trim().length < 2) return [];
  try {
    const results = await prisma.topupProduct.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { sku:  { contains: query } },
        ],
        isActive: true,
      },
      select: { sku: true, name: true, brand: true, price: true, originalPrice: true },
      take: 10,
    });
    return results;
  } catch (err) {
    console.error("[PriceActions] searchProducts error:", err);
    return [];
  }
}

