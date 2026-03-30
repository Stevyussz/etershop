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
 * Transforms a raw Digiflazz product object into the shape needed by our database.
 */
function mapDigiflazzProductForDB(p: DigiflazzProduct, settings: any) {
  const originalPrice = p.price;
  const sellingPrice = calculateDynamicPrice(originalPrice, settings);

  return {
    where: { sku: p.buyer_sku_code },
    update: {
      name: p.product_name,
      brand: p.brand,
      category: p.category,
      type: p.type,
      originalPrice,
      price: sellingPrice,
      // Note: We don't overwrite isActive on update to preserve manual deactivation settings
    },
    create: {
      sku: p.buyer_sku_code,
      name: p.product_name,
      brand: p.brand,
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

    // 1. Check for exclusions (Blacklist)
    const isExcluded = EXCLUDED_KEYWORDS.some(kw => 
      category.includes(kw) || type.includes(kw) || name.includes(kw)
    );
    if (isExcluded) return false;

    // 2. Check for inclusions (Whitelist)
    const isGameRelated = 
      GAME_KEYWORDS.some(kw => category.includes(kw) || type.includes(kw)) ||
      (category === "hiburan");

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
    // Step 0: Fetch global pricing settings
    const settings = await prisma.siteSettings.findUnique({ where: { id: "main" } });

    const allProducts = await getDigiflazzPriceList();
    const gameProducts = filterGameProducts(allProducts);

    if (gameProducts.length === 0) {
      return {
        success: false,
        message: "Tidak ada produk game yang ditemukan. Filter terlalu ketat atau data API kosong.",
      };
    }

    const upsertOperations = gameProducts.map((p) => {
      const mapped = mapDigiflazzProductForDB(p, settings);
      return prisma.topupProduct.upsert(mapped);
    });

    let syncedCount = 0;
    for (let i = 0; i < upsertOperations.length; i += DB_UPSERT_CHUNK_SIZE) {
      const chunk = upsertOperations.slice(i, i + DB_UPSERT_CHUNK_SIZE);
      await prisma.$transaction(chunk);
      syncedCount += chunk.length;
    }

    // Deactivate products that no longer exist in the sync batch
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
      message: `✅ Berhasil! ${syncedCount} produk disinkronisasi dengan strategi ${settings?.globalMarkupType || "TIERED"}. ${deactivatedResult.count} produk lama dinonaktifkan secara sistem.`,
    };
  } catch (error: any) {
    console.error("[Admin] Digiflazz sync failed:", error);
    return {
      success: false,
      message: `❌ Gagal sinkronisasi: ${error.message ?? "Terjadi kesalahan tidak diketahui."}`,
    };
  }
}
