"use server";

import prisma from "@/lib/prisma";
import { executeDigiflazzTopup } from "@/lib/digiflazz";
import { revalidatePath } from "next/cache";
import { verifyAdmin } from "@/lib/auth";

/**
 * Executes a manual cash order via POS bypassing Midtrans.
 *
 * @param sku The digiflazz buyer_sku_code
 * @param customerNo The destination user ID/number
 * @returns { success, message, orderId? }
 */
export async function manualCreatePosOrder(sku: string, customerNo: string) {
  try {
    // 0. Security Check
    await verifyAdmin();

    if (!sku || !customerNo) {
      return { success: false, message: "SKU Produk dan ID Tujuan wajib diisi." };
    }

    // 1. Validate Product and Settings
    const [product, settings] = await Promise.all([
      prisma.topupProduct.findUnique({
        where: { sku },
      }),
      prisma.siteSettings.findUnique({
        where: { id: "main" },
      })
    ]);

    if (!product) {
      return { success: false, message: "Produk tidak ditemukan di database." };
    }
    if (!product.isActive) {
      return { success: false, message: "Produk sedang dinonaktifkan." };
    }
    if (product.isGangguan) {
      return { success: false, message: "Server penyedia sedang gangguan. Harap infokan ke pelanggan." };
    }

    // Flash Sale Logic for POS
    let finalPrice = product.price;
    const now = new Date();
    if (
      product.isFlashSale && 
      product.flashSalePrice && 
      settings?.countdownEnd && 
      new Date(settings.countdownEnd) > now
    ) {
      finalPrice = product.flashSalePrice;
    }

    // 2. Generate Internal Order ID
    const orderId = `POS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Idempotency: Verify uniqueness before proceeding (extremely rare but good practice)
    const existingOrder = await prisma.topupTransaction.findUnique({ where: { orderId } });
    if (existingOrder) {
       return { success: false, message: "Collision detect: Order ID sudah ada. Silakan coba lagi dlm 1 detik." };
    }

    // 3. Hit Digiflazz
    let digiResult;
    try {
      const response = await executeDigiflazzTopup(product.sku, customerNo, orderId);
      digiResult = response.data;
    } catch (apiErr: any) {
      console.error("[POS] Digiflazz API Error:", apiErr);
      return { success: false, message: apiErr.message || "Gagal terkoneksi ke server Digiflazz." };
    }
    
    // Digiflazz Result mapping
    let derivedStatus = "PENDING";
    if (digiResult.status === "Sukses") derivedStatus = "SUCCESS";
    if (digiResult.status === "Gagal") derivedStatus = "FAILED";

    // 4. Record the offline transaction internally
    await prisma.topupTransaction.create({
      data: {
        orderId,
        gameId: customerNo, // We store the full customerNo here
        zoneId: null, // For POS we just combine it raw in customerNo input
        sku: product.sku,
        productName: product.name,
        price: finalPrice,
        cost: digiResult.price || product.originalPrice, 
        discount: 0,
        status: derivedStatus,
        digiflazzNote: digiResult.sn || digiResult.message || "Manual cash order.",
        // No snap token since this bypassed Midtrans
      },
    });

    revalidatePath("/admin/transactions");
    revalidatePath("/admin");

    return { 
      success: true, 
      message: `Berhasil! Transaksi POS telah dikirim ke Digiflazz. Status saat ini: ${digiResult.status}`,
      digiflazzStatus: digiResult.status,
      sn: digiResult.sn || "-"
    };
  } catch (error: any) {
    console.error("[POS] Fatal error:", error);
    return { success: false, message: `Kesalahan sistem: ${error.message}` };
  }
}
