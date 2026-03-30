/**
 * @file src/app/admin/vouchers/voucher-actions.ts
 * @description Server Actions for managing promotional vouchers.
 */

"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/** Fetches all vouchers sorted by creation date */
export async function getVouchers() {
  try {
    return await prisma.voucher.findMany({
      orderBy: { createdAt: "desc" }
    });
  } catch (error) {
    console.error("[VoucherActions] Fetch failed:", error);
    return [];
  }
}

/** Creates or updates a voucher */
export async function upsertVoucher(data: any) {
  try {
    const { id, ...rest } = data;
    if (id) {
      await prisma.voucher.update({ where: { id }, data: rest });
    } else {
      await prisma.voucher.create({ data: rest });
    }
    revalidatePath("/admin/vouchers");
    revalidatePath("/topup");
    return { success: true };
  } catch (error: any) {
    console.error("[VoucherActions] Upsert failed:", error);
    return { success: false, message: error.message };
  }
}

/** Deletes a voucher */
export async function deleteVoucher(id: string) {
  try {
    await prisma.voucher.delete({ where: { id } });
    revalidatePath("/admin/vouchers");
    return { success: true };
  } catch (error: any) {
    console.error("[VoucherActions] Delete failed:", error);
    return { success: false, message: error.message };
  }
}

/** Validates a voucher code on the storefront */
export async function validateVoucher(code: string, amount: number) {
  try {
    const voucher = await prisma.voucher.findUnique({
      where: { code: code.toUpperCase(), isActive: true }
    });

    if (!voucher) return { success: false, message: "Kode voucher tidak valid." };

    // Expiry check
    if (voucher.expiryDate && new Date(voucher.expiryDate) < new Date()) {
      return { success: false, message: "Kode voucher sudah kadaluarsa." };
    }

    // Usage limit check
    if (voucher.usageLimit !== -1 && voucher.usedCount >= voucher.usageLimit) {
      return { success: false, message: "Kuota voucher sudah habis." };
    }

    // Min purchase check
    if (amount < voucher.minPurchase) {
      return { success: false, message: `Minimal pembelian Rp ${voucher.minPurchase.toLocaleString()} untuk kode ini.` };
    }

    // Calculate discount
    let discount = 0;
    if (voucher.discountType === "PERCENT") {
      discount = (amount * voucher.discountValue) / 100;
      if (voucher.maxDiscount) discount = Math.min(discount, voucher.maxDiscount);
    } else {
      discount = voucher.discountValue;
    }

    return { success: true, discount, voucherId: voucher.id };
  } catch (error: any) {
    return { success: false, message: "Terjadi kesalahan saat validasi." };
  }
}
