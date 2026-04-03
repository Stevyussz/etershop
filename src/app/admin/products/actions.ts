/**
 * @file src/app/admin/products/actions.ts
 * @description Server Actions for the Admin Products page.
 *
 * These actions are called from the ProductDashboardClient component
 * and run exclusively on the server (marked with "use server").
 */

"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getDigiflazzPriceList, type DigiflazzProduct } from "@/lib/digiflazz";
import { calculateSellingPrice } from "@/lib/utils";

/** Keywords to strictly EXCLUDE from the sync (Data packages, Utilities, etc.) */
const EXCLUDED_KEYWORDS = [
  "internet", "data", "pulsa", "pln", "token", "pasca", "pdam", 
  "bpjs", "telkom", "tv", "gas", "e-money", "pajak", "grab", "gojek"
] as const;

/** Keywords used to identify game-related products from Digiflazz. */
const GAME_KEYWORDS = ["game", "voucher", "mobile", "pc", "topup", "hiburan"] as const;

/** The chunk size for batched database upserts. */
const DB_UPSERT_CHUNK_SIZE = 200;

/**
 * Calculates the dynamic selling price based on global admin settings.
 */
function calculateDynamicPrice(cost: number, settings: any) {
  const type = settings?.globalMarkupType || "TIERED";
  const percent = settings?.globalMarkupPercent || 5.0;
  const fixed = settings?.globalMarkupFixed || 2000;
  const ROUNDING_UNIT = 100;

  let finalPrice = cost;

  if (type === "PERCENT") {
    const rawMargin = cost * (percent / 100);
    const roundedMargin = Math.ceil(rawMargin / ROUNDING_UNIT) * ROUNDING_UNIT;
    finalPrice = cost + roundedMargin;
  } else if (type === "FIXED") {
    finalPrice = cost + fixed;
  } else {
    // Legacy TIERED Logic
    const MODAL_THRESHOLD = 50_000;
    if (cost < MODAL_THRESHOLD) {
      finalPrice = cost + 2000;
    } else {
      const rawMargin = cost * 0.05;
      const roundedMargin = Math.ceil(rawMargin / ROUNDING_UNIT) * ROUNDING_UNIT;
      finalPrice = cost + roundedMargin;
    }
  }

  return finalPrice;
}

/**
 * Title cases a string gracefully (e.g., "MOBILE LEGENDS" -> "Mobile Legends")
 */
function toTitleCase(str: string): string {
  return str.replace(
    /\w\S*/g,
    function(txt) {
      if (txt.toUpperCase() === "PC") return "PC";
      if (txt.toUpperCase() === "PUBG") return "PUBG";
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    }
  );
}

/**
 * Transforms a raw Digiflazz product object into the shape needed by our database.
 */
function mapDigiflazzProductForDB(p: DigiflazzProduct, settings: any) {
  const originalPrice = p.price;
  const sellingPrice = calculateDynamicPrice(originalPrice, settings);
  
  // Format the brand nicely for accurate grouping in storefront/admin
  const aestheticBrand = toTitleCase(p.brand);

  return {
    where: { sku: p.buyer_sku_code },
    update: {
      name: p.product_name,
      brand: aestheticBrand,
      category: p.category,
      type: p.type,
      originalPrice,
      price: sellingPrice,
      // Note: We don't overwrite isActive on update to preserve manual deactivation settings
    },
    create: {
      sku: p.buyer_sku_code,
      name: p.product_name,
      brand: aestheticBrand,
      category: p.category,
      type: p.type,
      originalPrice,
      price: sellingPrice,
      isActive: true,
    },
  };
}

/**
 * Filters the raw Digiflazz product list to only include active game products.
 * Includes exclusion logic to prevent "leaking" of data/internet packages.
 */
function filterGameProducts(products: DigiflazzProduct[]): DigiflazzProduct[] {
  console.log(`[Admin] Filtering ${products.length} products from Digiflazz...`);
  
  const filtered = products.filter((p) => {
    const category = p.category.toLowerCase();
    const type = p.type.toLowerCase();
    const name = p.product_name.toLowerCase();

    // 1. Strict Inclusion by Digiflazz Primary Category
    // Digiflazz correctly defines Game Vouchers as "Games" or "Voucher". 
    // Sometimes entertainment is useful, but only if we explicitely define it to avoid false positives.
    const isGameCategory = category === "games" || category === "voucher";
    
    // 2. Exclusion (Blacklist) to cover corner cases where Digiflazz categorization leaks
    const isExcluded = EXCLUDED_KEYWORDS.some(kw => 
      category.includes(kw) || type.includes(kw) || name.includes(kw)
    );
    if (isExcluded) return false;

    // 3. Fallback Keyword Matching if it's not strictly "Games" or "Voucher"
    const isGameRelated = isGameCategory || GAME_KEYWORDS.some(kw => category.includes(kw) || type.includes(kw));

    return isGameRelated && p.seller_product_status === true;
  });

  console.log(`[Admin] Found ${filtered.length} matching game products.`);
  return filtered;
}

/**
 * Toggles the isActive status of a single product.
 * Used for manual manual deactivation from the Admin dashboard.
 */
export async function toggleProductStatus(id: string, currentStatus: boolean) {
  try {
    await prisma.topupProduct.update({
      where: { id },
      data: { isActive: !currentStatus }
    });
    
    revalidatePath("/admin/products");
    revalidatePath("/topup");
    return { success: true };
  } catch (error: any) {
    console.error("[Admin] Toggle status failed:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Main Server Action: Synchronizes product data from Digiflazz to our MongoDB database.
 */
export async function runDigiflazzSync(): Promise<{ success: boolean; message: string }> {
  try {
    console.log("[Admin Sync] Starting full Digiflazz synchronization...");
    
    // Step 0: Fetch global pricing settings
    const settings = await prisma.siteSettings.findUnique({ where: { id: "main" } }) as any;
    console.log(`[Admin Sync] Using pricing strategy: ${settings?.globalMarkupType || "TIERED"}`);

    const allProducts = await getDigiflazzPriceList();
    if (!allProducts || allProducts.length === 0) {
       throw new Error("Gagal mengambil data dari Digiflazz (Data Kosong).");
    }

    const gameProducts = filterGameProducts(allProducts);
    if (gameProducts.length === 0) {
      return {
        success: false,
        message: "Tidak ada produk game yang ditemukan. Cek filter pencarian Anda.",
      };
    }

    // Step 1: Batched Upserts without Prisma $transaction mapping
    // We execute upsert concurrency manually to completely bypass the 5-second Prisma
    // transaction timeout mechanism, which is what causes the "aborted" error during massive chunk syncs.
    let syncedCount = 0;
    
    // Process chunks to limit concurrent DB connections preventing pool exhaustion
    for (let i = 0; i < gameProducts.length; i += DB_UPSERT_CHUNK_SIZE) {
      const chunk = gameProducts.slice(i, i + DB_UPSERT_CHUNK_SIZE);
      const chunkOps = chunk.map((p) => {
        const mapped = mapDigiflazzProductForDB(p, settings);
        return prisma.topupProduct.upsert(mapped).catch((err) => {
           console.warn(`[Admin Sync] Failed to upsert ${p.buyer_sku_code}:`, err.message);
        });
      });
      
      console.log(`[Admin Sync] Syncing chunk ${Math.floor(i / DB_UPSERT_CHUNK_SIZE) + 1} (${chunk.length} items)...`);
      await Promise.all(chunkOps);
      syncedCount += chunk.length;
    }

    // Step 2: Intelligent Deactivation
    // Deactivate products that no longer exist in the total sync batch.
    // For large catalogs, we do this in batches if needed.
    const activeSkus = gameProducts.map((p) => p.buyer_sku_code);
    const deactivatedResult = await prisma.topupProduct.updateMany({
      where: {
        sku: { notIn: activeSkus },
        isActive: true,
      },
      data: { isActive: false },
    });

    revalidatePath("/admin/products");
    revalidatePath("/topup");
    revalidatePath("/");

    return {
      success: true,
      message: `✅ Berhasil! ${syncedCount} produk disinkronisasi. ${deactivatedResult.count} produk lama dinonaktifkan secara otomatis.`,
    };
  } catch (error: any) {
    console.error("[Admin Sync] FATAL ERROR:", error);
    return {
      success: false,
      message: `❌ Gagal: ${error.message ?? "Terjadi kesalahan sistem saat sinkronisasi."}`,
    };
  }
}
