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

/** Categories from Digiflazz that are considered "Games" for this platform. */
const GAME_CATEGORIES = ["Games", "Voucher Game", "Voucher"] as const;

/**
 * The chunk size for batched database upserts.
 * Kept at 200 to respect Vercel's serverless function memory limits on the Hobby plan.
 * For Pro/Business plans, this can safely be increased to 500.
 */
const DB_UPSERT_CHUNK_SIZE = 200;

/**
 * Transforms a raw Digiflazz product object into the shape needed by our database.
 * This is the canonical mapping between Digiflazz's schema and ours.
 *
 * @param p - Raw product data from the Digiflazz API.
 * @returns An object ready to be used in a Prisma `upsert` call.
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
 * 1. Its category is one of the defined GAME_CATEGORIES.
 * 2. Its seller_product_status is true (Digiflazz has stock).
 *
 * Note: We intentionally do NOT filter on `buyer_product_status` because
 * Digiflazz requires manual activation per-product on their dashboard,
 * which is an extra step that resellers often skip. The seller status
 * is the reliable source of truth for product availability.
 *
 * @param products - The full raw product list from Digiflazz.
 * @returns Filtered array of active game products.
 */
function filterGameProducts(products: DigiflazzProduct[]): DigiflazzProduct[] {
  return products.filter(
    (p) =>
      (GAME_CATEGORIES as readonly string[]).includes(p.category) &&
      p.seller_product_status === true
  );
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
    const activeSkus = gameProducts.map((p) => p.buyer_sku_code);
    const deactivatedResult = await prisma.topupProduct.updateMany({
      where: {
        category: { in: [...GAME_CATEGORIES] },
        sku: { notIn: activeSkus },
        isActive: true, // Only update ones that were previously active
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
