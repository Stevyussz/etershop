/**
 * @file src/app/admin/actions.ts
 * @description Server Actions for general Admin panel operations.
 *
 * These actions handle CRUD for Categories, Products (non-topup), and Site Settings.
 * All public-facing actions include input validation to prevent bad data from
 * being persisted to the database.
 */

"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import prisma from "@/lib/prisma";

// ─────────────────────────────────────────────
// HELPER: VALIDATION
// ─────────────────────────────────────────────

/**
 * Validates that a required string field is present and non-empty.
 * Throws a descriptive error if validation fails.
 * @param value - The value to validate.
 * @param fieldName - The name of the field (for the error message).
 */
function requireField(value: string | null | undefined, fieldName: string): string {
  if (!value || value.trim() === "") {
    throw new Error(`Field '${fieldName}' wajib diisi dan tidak boleh kosong.`);
  }
  return value.trim();
}

// ─────────────────────────────────────────────
// CATEGORY ACTIONS
// ─────────────────────────────────────────────

/**
 * Creates a new product category.
 *
 * @param formData - Must contain: `name` (string), `slug` (string, URL-safe).
 * @throws If name or slug is missing, or if the slug is already in use.
 */
export async function createCategory(formData: FormData): Promise<void> {
  const name = requireField(formData.get("name") as string, "Nama Kategori");
  const slug = requireField(formData.get("slug") as string, "Slug");

  // Ensure slug is URL-safe (lowercase, hyphens only)
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error("Slug hanya boleh mengandung huruf kecil, angka, dan tanda hubung (-).");
  }

  try {
    await prisma.category.create({ data: { name, slug } });
  } catch (err: any) {
    // Prisma throws a specific error code for unique constraint violations
    if (err.code === "P2002") {
      throw new Error(`Slug '${slug}' sudah dipakai. Gunakan slug yang berbeda.`);
    }
    throw err;
  }

  revalidatePath("/admin/categories");
  revalidatePath("/shop");
}

/**
 * Deletes a category by its ID.
 * Prevents deletion if the category still has associated products.
 *
 * @param id - The MongoDB ObjectId of the category to delete.
 * @throws If the category has active products.
 */
export async function deleteCategory(id: string): Promise<void> {
  const productCount = await prisma.product.count({ where: { categoryId: id } });

  if (productCount > 0) {
    throw new Error(
      `Tidak bisa menghapus kategori yang masih memiliki ${productCount} produk. Hapus atau pindahkan produknya terlebih dahulu.`
    );
  }

  await prisma.category.delete({ where: { id } });

  revalidatePath("/admin/categories");
  revalidatePath("/shop");
}

// ─────────────────────────────────────────────
// PRODUCT ACTIONS (General e-commerce products)
// ─────────────────────────────────────────────

/**
 * Creates a new general product (non-topup).
 *
 * @param formData - Must contain: `title`, `description`, `price`, `categoryId`.
 *                   Optional: `originalPrice`, `imageUrl`, `isFeatured`, `isActive`, `stock`.
 * @throws If required fields are missing or price is not a valid number.
 */
export async function createProduct(formData: FormData): Promise<void> {
  const title = requireField(formData.get("title") as string, "Judul Produk");
  const description = requireField(formData.get("description") as string, "Deskripsi");
  const categoryId = requireField(formData.get("categoryId") as string, "Kategori");

  const price = parseFloat(formData.get("price") as string);
  if (isNaN(price) || price < 0) {
    throw new Error("Harga tidak valid. Masukkan angka yang benar.");
  }

  const originalPriceRaw = formData.get("originalPrice") as string;
  const originalPrice = originalPriceRaw ? parseFloat(originalPriceRaw) : null;

  const imageUrl = (formData.get("imageUrl") as string) || null;
  const isFeatured = formData.get("isFeatured") === "on";
  const isActive = formData.get("isActive") !== "off"; // Default to active

  const stockRaw = formData.get("stock") as string;
  const stock = stockRaw ? parseInt(stockRaw, 10) : -1; // -1 = unlimited

  await prisma.product.create({
    data: { title, description, price, originalPrice, imageUrl, isFeatured, isActive, stock, categoryId },
  });

  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath("/");
}

/**
 * Deletes a product by ID.
 *
 * @param id - The MongoDB ObjectId of the product to delete.
 */
export async function deleteProduct(id: string): Promise<void> {
  await prisma.product.delete({ where: { id } });

  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath("/");
}

/**
 * Updates the stock quantity of a product.
 * Use -1 to indicate unlimited stock.
 *
 * @param id - The MongoDB ObjectId of the product.
 * @param stock - The new stock count. Use -1 for unlimited.
 */
export async function updateProductStock(id: string, stock: number): Promise<void> {
  if (!Number.isInteger(stock) || stock < -1) {
    throw new Error("Nilai stok tidak valid. Gunakan -1 untuk stok tidak terbatas.");
  }

  await prisma.product.update({ where: { id }, data: { stock } });

  revalidatePath("/admin/products");
  revalidatePath("/shop");
}

/**
 * Toggles a product's active status (visible/hidden in the storefront).
 *
 * @param id - The MongoDB ObjectId of the product.
 * @param isActive - The new active state.
 */
export async function toggleProductActive(id: string, isActive: boolean): Promise<void> {
  await prisma.product.update({ where: { id }, data: { isActive } });

  revalidatePath("/admin/products");
  revalidatePath("/shop");
}

// ─────────────────────────────────────────────
// SITE SETTINGS ACTIONS
// ─────────────────────────────────────────────

/**
 * Upserts the global site settings (popup, countdown, live sales notification).
 * There is always exactly one settings document with id="main".
 *
 * @param formData - All optional settings fields from the settings form.
 */
export async function updateSiteSettings(formData: FormData): Promise<void> {
  const popupImageUrl = (formData.get("popupImageUrl") as string) || null;
  const popupLink = (formData.get("popupLink") as string) || null;
  const popupActive = formData.get("popupActive") === "on";
  const ramadhanMode = formData.get("ramadhanMode") === "on";
  const showLiveSales = formData.get("showLiveSales") === "on";

  const countdownEndStr = formData.get("countdownEnd") as string;
  let countdownEnd: Date | null = null;
  if (countdownEndStr) {
    const parsed = new Date(countdownEndStr);
    if (!isNaN(parsed.getTime())) {
      countdownEnd = parsed;
    }
  }

  await prisma.siteSettings.upsert({
    where: { id: "main" },
    update: { popupImageUrl, popupLink, popupActive, ramadhanMode, countdownEnd, showLiveSales },
    create: { id: "main", popupImageUrl, popupLink, popupActive, ramadhanMode, countdownEnd, showLiveSales },
  });

  // Revalidate all pages that might render settings-dependent components
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/admin");
  revalidatePath("/topup");
}

// ─────────────────────────────────────────────
// EMERGENCY TOPUP ACTIONS
// ─────────────────────────────────────────────

/**
 * Manually retries a stuck topup transaction via Digiflazz.
 * Used by admins when Midtrans webhook succeeds but Digiflazz fails/pending.
 *
 * @param orderId - The TRX order ID to retry.
 */
export async function manualProcessOrder(orderId: string): Promise<{ success: boolean; message: string }> {
  try {
    const transaction = await prisma.topupTransaction.findUnique({
      where: { orderId },
    });

    if (!transaction) return { success: false, message: "Transaksi tidak ditemukan." };
    if (transaction.status === "SUCCESS") return { success: false, message: "Transaksi ini sudah berhasil, tidak perlu diproses ulang." };
    if (transaction.status !== "PAID" && transaction.status !== "PENDING") {
      return { success: false, message: `Tidak dapat memproses transaksi dengan status ${transaction.status}.` };
    }

    const { executeDigiflazzTopup, checkDigiflazzTransactionStatus } = await import("@/lib/digiflazz");

    const customerNo = transaction.zoneId
      ? `${transaction.gameId}${transaction.zoneId}`
      : transaction.gameId;

    let finalStatus: "SUCCESS" | "FAILED" | "PAID" = "FAILED";
    let digiflazzNote = "No response from Digiflazz";

    try {
      // 1. FIRST: Check current status from Digiflazz (in case it already succeeded)
      console.log(`[ManualProcess] Checking status for ref_id: ${orderId}`);
      const checkResult = await checkDigiflazzTransactionStatus(orderId, transaction.sku, customerNo);
      let digiStatus = checkResult?.data?.status;

      // 2. SECOND: If not success, try to pay/execute if allowed
      if (digiStatus !== "Sukses" && digiStatus !== "Pending") {
         console.log(`[ManualProcess] Status is ${digiStatus} — attempting re-order for ref_id: ${orderId}`);
         const payResult = await executeDigiflazzTopup(
           transaction.sku,
           customerNo,
           transaction.orderId
         );
         // Support both root payload and nested .data payload for flexibility
         const payload = payResult.data || payResult;
         if (!payload || !payload.ref_id || !payload.status) {
           console.warn("[DigiflazzWebhook] Invalid payload format received:", payResult);
         }
         digiStatus = payResult?.data?.status;
         var resultData = payResult.data;
      } else {
         var resultData = checkResult.data;
      }

      if (digiStatus === "Sukses") {
        finalStatus = "SUCCESS";
        digiflazzNote = resultData?.sn ? `SN: ${resultData.sn}` : resultData?.message || "Manual status check/retry berhasil";
        
        // INCREMENT VOUCHER USAGE (CRITICAL)
        if (transaction.voucherId) {
          try {
            await prisma.voucher.update({
              where: { id: transaction.voucherId },
              data: { usedCount: { increment: 1 } },
            });
          } catch (vErr) {
            console.error(`[ManualProcess] Failed to increment voucher count on order ${orderId}:`, vErr);
          }
        }
      } else if (digiStatus === "Pending") {
        finalStatus = "PAID";
        digiflazzNote = resultData?.message || "Masih diproses Digiflazz (Pending)";
      } else {
        finalStatus = "FAILED";
        digiflazzNote = resultData?.message || `Topup gagal (status: ${digiStatus})`;
      }
    } catch (digiErr: any) {
      finalStatus = "FAILED";
      digiflazzNote = `Manual retry Digiflazz error: ${digiErr?.message}`;
    }

    await prisma.topupTransaction.update({
      where: { orderId },
      data: { status: finalStatus, digiflazzNote },
    });

    revalidatePath("/admin/transactions");
    return { success: true, message: `Status diperbarui menjadi: ${finalStatus}. Note: ${digiflazzNote}` };

  } catch (error: any) {
    console.error("[ManualProcess] Failed:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Manually revalidates the Digiflazz balance cache.
 * This triggers a fresh API call via the Fixie proxy.
 */
export async function refreshDigiflazzBalance(): Promise<void> {
  revalidateTag("digiflazz-balance", "default");
}

