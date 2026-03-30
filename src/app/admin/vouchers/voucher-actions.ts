/**
 * @file src/app/admin/vouchers/voucher-actions.ts
 * @description Server Actions for managing promotional vouchers.
 */

"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/** Fetches all vouchers sorted by creation date, serialized for Client Components */
export async function getVouchers() {
  try {
    const vouchers = await prisma.voucher.findMany({
      orderBy: { createdAt: "desc" }
    });
    // Serialize to prevent Next.js Server Component date passing errors
    return JSON.parse(JSON.stringify(vouchers));
  } catch (error) {
    console.error("[VoucherActions] Fetch failed:", error);
    return [];
  }
}

/** Creates or updates a voucher */
export async function upsertVoucher(data: any) {
  try {
    const { id, createdAt, updatedAt, ...rest } = data;
    
    // Auto-trim and uppercase code to prevent whitespace mismatch bugs
    if (rest.code) {
      rest.code = rest.code.trim().toUpperCase();
    }
    
    // Handle specific type conversions
    rest.discountValue = Number(rest.discountValue) || 0;
    rest.minPurchase = Number(rest.minPurchase) || 0;
    rest.usageLimit = Number(rest.usageLimit);
    if (isNaN(rest.usageLimit)) rest.usageLimit = -1;
    
    // Handle nullable maxDiscount
    if (rest.discountType === "PERCENT" && rest.maxDiscount) {
      rest.maxDiscount = Number(rest.maxDiscount) || null;
    } else {
      rest.maxDiscount = null;
    }

    // Handle expiryDate conversion
    if (rest.expiryDate) {
      rest.expiryDate = new Date(rest.expiryDate);
    } else {
      rest.expiryDate = null;
    }

    if (id) {
      await prisma.voucher.update({ where: { id }, data: rest });
    } else {
      // Prevent duplicate code creation
      const existing = await prisma.voucher.findUnique({ where: { code: rest.code } });
      if (existing) {
        return { success: false, message: "Kode voucher sudah digunakan!" };
      }
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
    if (!code || !code.trim()) return { success: false, message: "Kode kosong." };
    
    const cleanCode = code.trim().toUpperCase();
    
    const voucher = await prisma.voucher.findFirst({
      where: { code: cleanCode, isActive: true }
    });

    if (!voucher) return { success: false, message: "Kode voucher tidak valid atau sudah nonaktif." };

    // Expiry check
    if (voucher.expiryDate && new Date(voucher.expiryDate).getTime() < new Date().getTime()) {
      return { success: false, message: "Kode voucher sudah kadaluarsa." };
    }

    // Usage limit check (-1 is unlimited)
    if (voucher.usageLimit !== -1 && voucher.usedCount >= voucher.usageLimit) {
      return { success: false, message: "Kuota voucher sudah habis." };
    }

    // Min purchase check
    if (amount < voucher.minPurchase) {
      return { success: false, message: `Minimal pembelian Rp ${voucher.minPurchase.toLocaleString()} untuk voucher ini.` };
    }

    // Calculate discount
    let discount = 0;
    if (voucher.discountType === "PERCENT") {
      discount = (amount * voucher.discountValue) / 100;
      if (voucher.maxDiscount && voucher.maxDiscount > 0) {
        discount = Math.min(discount, voucher.maxDiscount);
      }
    } else {
      discount = voucher.discountValue;
    }

    // Don't discount more than the product price
    discount = Math.floor(Math.min(discount, amount));

    return { success: true, discount, voucherId: voucher.id };
  } catch (error: any) {
    console.error("[VoucherActions] Validate error:", error);
    return { success: false, message: "Terjadi kesalahan sistem saat validasi." };
  }
}
