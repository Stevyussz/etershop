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
  title: "Top Up Game & PPOB Termurah — Teraman Se-Isekai | EterShop",
  description:
    "Top up game favoritmu sekarang! Mobile Legends, Free Fire, Valorant, Token PLN, Pulsa, E-Wallet — harga paling murah se-isekai. Proses otomatis 1 detik, 24 jam, via QRIS, GoPay, DANA & ShopeePay.",
  keywords: [
    "top up game termurah", "beli diamond ml murah", "topup ff murah", "topup valorant murah",
    "token pln instan", "pulsa murah semua operator", "top up ewallet", "topup gopay murah",
    "topup dana murah", "topup shopeepay murah", "isi pulsa online", "teraman termurah isekai",
    "EterShop topup", "beli diamond online", "top up game 1 detik", "PPOB instan online"
  ],
  openGraph: {
    title: "Top Up Game & PPOB — Teraman, Termurah Se-Isekai | EterShop",
    description: "Platform top up terpercaya. Mario, ML, FF, PLN, Pulsa, E-Wallet — harga paling miring se-jagad. Proses otomatis 1 detik.",
    type: "website",
    url: "https://etershop.vercel.app/topup",
    images: [{ url: "/logo.jpg", width: 1200, height: 630, alt: "EterShop Top Up PPOB" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Top Up & PPOB Termurah Se-Isekai | EterShop",
    description: "Topup game, PLN, Pulsa, E-Wallet paling murah dan instan. Cuma di EterShop!",
    images: ["/logo.jpg"],
  },
  alternates: {
    canonical: "https://etershop.vercel.app/topup",
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
