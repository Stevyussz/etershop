/**
 * @file src/app/admin/games/actions.ts
 * @description Server Actions for managing Game Branding (GameConfig model).
 */

"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Fetches all unique brands currently present in the TopupProduct table,
 * and joins them with their corresponding GameConfig if it exists.
 */
export async function getGameBrandsWithConfigs() {
  try {
    // 1. Get all unique brands from products
    const brands = await prisma.topupProduct.findMany({
      select: { brand: true },
      distinct: ["brand"],
      orderBy: { brand: "asc" },
    });

    // 2. Get all existing game configs
    const configs = await prisma.gameConfig.findMany();

    // 3. Merge them
    return brands.map((b) => {
      const config = configs.find((c) => c.brand === b.brand);
      return {
        brand: b.brand,
        config: config || null,
      };
    });
  } catch (error) {
    console.error("[AdminGames] Failed to fetch brands:", error);
    return [];
  }
}

/**
 * Updates or creates a branding configuration for a specific game brand.
 */
export async function upsertGameConfig(data: {
  brand: string;
  title?: string;
  imageUrl?: string;
  category?: string;
  isPopular?: boolean;
}) {
  try {
    const { brand, ...rest } = data;

    const result = await prisma.gameConfig.upsert({
      where: { brand },
      update: rest,
      create: { brand, ...rest },
    });

    revalidatePath("/admin/games");
    revalidatePath("/topup");
    revalidatePath("/");

    return { success: true, data: result };
  } catch (error: any) {
    console.error("[AdminGames] Upsert failed:", error);
    return { success: false, message: error.message };
  }
}
