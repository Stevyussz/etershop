/**
 * @file src/app/admin/settings/price-actions.ts
 * @description Server Actions for managing global pricing calculations.
 */

"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/** Fetches global pricing settings */
export async function getPriceSettings() {
  try {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: "main" }
    });
    return settings;
  } catch (error) {
    console.error("[PriceActions] Fetch failed:", error);
    return null;
  }
}

/** Updates global pricing settings */
export async function updatePriceSettings(data: any) {
  try {
    const settings = await prisma.siteSettings.upsert({
      where: { id: "main" },
      update: data,
      create: { id: "main", ...data }
    });
    
    revalidatePath("/admin/settings");
    revalidatePath("/admin/products");
    revalidatePath("/topup");
    revalidatePath("/");

    return { success: true, settings };
  } catch (error: any) {
    console.error("[PriceActions] Update failed:", error);
    return { success: false, message: error.message };
  }
}
