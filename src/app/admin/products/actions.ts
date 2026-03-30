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

/** Keywords used to identify game-related products from Digiflazz. */
const GAME_KEYWORDS = ["game", "voucher", "mobile", "pc", "topup", "hiburan"] as const;

/**
 * The chunk size for batched database upserts.
 */
const DB_UPSERT_CHUNK_SIZE = 200;

/**
 * Transforms a raw Digiflazz product object into the shape needed by our database.
 */
function mapDigiflazzProductForDB(p: DigiflazzProduct) {
  const originalPrice = p.price;
  const sellingPrice = calculateSellingPrice(originalPrice);

  return {
    where: { sku: p.buyer_sku_code },
    update: {
      name: p.product_name,
      brand: p.brand,
      category: p.category,
      type: p.type,
      originalPrice,
      price: sellingPrice,
      isActive: true,
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
 *
 * A product is included if:
 * 1. Its category or type contains any of the GAME_KEYWORDS (case-insensitive).
 * 2. Its seller_product_status is true (Digiflazz has stock).
 *
 * @param products - The full raw product list from Digiflazz.
 * @returns Filtered array of active game products.
 */
function filterGameProducts(products: DigiflazzProduct[]): DigiflazzProduct[] {
  console.log(`[Admin] Filtering ${products.length} products from Digiflazz...`);
  
  const filtered = products.filter((p) => {
    const category = p.category.toLowerCase();
    const type = p.type.toLowerCase();
    const name = p.product_name.toLowerCase();

    // Check if category or type contains "game" or "voucher"
    const isGameRelated = 
      GAME_KEYWORDS.some(kw => category.includes(kw) || type.includes(kw)) ||
      (category === "hiburan"); // Hiburan is sometimes used for game vouchers

    return isGameRelated && p.seller_product_status === true;
  });

  console.log(`[Admin] Found ${filtered.length} matching game products.`);
  if (filtered.length > 0) {
    // Log unique categories found for debugging
    const categories = Array.from(new Set(filtered.map(p => p.category)));
    console.log(`[Admin] Categories found:`, categories.join(", "));
    
    // Log unique brands found
    const brands = Array.from(new Set(filtered.map(p => p.brand)));
    console.log(`[Admin] Brands found (${brands.length}):`, brands.slice(0, 10).join(", "), brands.length > 10 ? "..." : "");
  }

  return filtered;
}

/**
 * Main Server Action: Synchronizes product data from Digiflazz to our MongoDB database.
 *
 * Flow:
 * 1. Fetches the full price list from Digiflazz API.
 * 2. Filters to only active game products.
 * 3. Upserts each product in batches to avoid memory limits.
 * 4. Deactivates any products that are no longer in the Digiflazz list.
 * 5. Revalidates the product and storefront pages.
 *
 * @returns An object with `success` boolean and a `message` string for the UI toast.
 */
export async function runDigiflazzSync(): Promise<{ success: boolean; message: string }> {
  try {
    // Step 1: Fetch raw data from Digiflazz (may throw on API error)
    const allProducts = await getDigiflazzPriceList();

    // Step 2: Filter to game products
    const gameProducts = filterGameProducts(allProducts);

    if (gameProducts.length === 0) {
      return {
        success: false,
        message:
          "Tidak ada produk game yang ditemukan. Pastikan akun Digiflazz sudah terverifikasi dan produk sudah ditambahkan di dashboard Digiflazz.",
      };
    }

    // Step 3: Build and execute upsert operations in chunks
    const upsertOperations = gameProducts.map((p) => {
      const mapped = mapDigiflazzProductForDB(p);
      return prisma.topupProduct.upsert(mapped);
    });

    let syncedCount = 0;
    for (let i = 0; i < upsertOperations.length; i += DB_UPSERT_CHUNK_SIZE) {
      const chunk = upsertOperations.slice(i, i + DB_UPSERT_CHUNK_SIZE);
      await prisma.$transaction(chunk);
      syncedCount += chunk.length;
    }

    // Step 4: Deactivate products that no longer exist in the Digiflazz response
    // This handles products that Digiflazz has removed or that we no longer sell.
    // Step 4: Deactivate products that were not in this sync batch
    const activeSkus = gameProducts.map((p) => p.buyer_sku_code);
    const deactivatedResult = await prisma.topupProduct.updateMany({
      where: {
        sku: { notIn: activeSkus },
        isActive: true,
      },
      data: { isActive: false },
    });

    // Step 5: Revalidate all affected pages so the UI reflects the new data immediately
    revalidatePath("/admin/products");
    revalidatePath("/topup");
    revalidatePath("/");

    return {
      success: true,
      message: `✅ Berhasil! ${syncedCount} produk disinkronisasi. ${deactivatedResult.count} produk lama dinonaktifkan.`,
    };
  } catch (error: any) {
    console.error("[Admin] Digiflazz sync failed:", error);
    return {
      success: false,
      message: `❌ Gagal sinkronisasi: ${error.message ?? "Terjadi kesalahan tidak diketahui."}`,
    };
  }
}
