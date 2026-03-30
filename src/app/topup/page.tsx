/**
 * @file src/app/topup/page.tsx
 * @description Server Component — Topup Game Catalog page.
 *
 * Fetches the list of distinct active brands from the database and
 * passes them to the interactive client-side catalog component.
 *
 * Revalidation: Data is revalidated every 60 seconds (ISR) to reflect
 * any product sync the admin performs without requiring a full deploy.
 */

import prisma from "@/lib/prisma";
import TopupCatalogClient from "./TopupCatalogClient";
import type { Metadata } from "next";

export const revalidate = 60; // ISR: re-fetch data at most once per minute

export const metadata: Metadata = {
  title: "Top Up Game — Murah & Instan | EterShop",
  description:
    "Top up game favoritmu — Mobile Legends, Free Fire, Valorant, dan banyak lagi. Harga terbaik, proses otomatis 1 detik via QRIS, GoPay, DANA & ShopeePay.",
  keywords: "top up game, beli diamond, topup ml, topup ff, topup valorant, QRIS game",
  openGraph: {
    title: "Top Up Game — EterShop",
    description: "Platform top up game terpercaya. Murah, cepat, aman.",
    type: "website",
  },
};

export default async function TopupPage() {
  let brands: { brand: string }[] = [];
  let configs: any[] = [];

  try {
    // 1. Get all active brands from products
    brands = await prisma.topupProduct.findMany({
      where: { isActive: true },
      select: { brand: true },
      distinct: ["brand"],
      orderBy: { brand: "asc" },
    });

    // 2. Get all branding configs
    configs = await prisma.gameConfig.findMany();
  } catch (error) {
    console.error("[TopupPage] Database access failed during prerender:", error);
  }

  return (
    <div className="min-h-screen bg-[#0a0f16] text-slate-200">
      <TopupCatalogClient games={brands} configs={configs} />
    </div>
  );
}
