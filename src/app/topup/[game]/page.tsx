import prisma from "@/lib/prisma";
import CheckoutClient from "./CheckoutClient";
import { notFound } from "next/navigation";

export async function generateMetadata(props: { params: Promise<{ game: string }> }) {
  const params = await props.params;
  const gameSlug = params.game;

  let matchedBrand = "Game";
  try {
    const distinctBrands = await prisma.topupProduct.findMany({
      where: { isActive: true },
      select: { brand: true },
      distinct: ['brand']
    });
    matchedBrand = distinctBrands.find(p => p.brand.toLowerCase().replace(/[^a-z0-9]+/g, '-') === gameSlug)?.brand || "Game";
  } catch {
    // DB unavailable
  }
  
  const title = matchedBrand || "Game";
  return {
    title: `Topup ${title} - Cepat & Murah | EterShop`,
    description: `Beli Diamond ${title} instan via QRIS, GoPay, dan DANA. Harga termurah dan proses otomatis 1 detik.`,
  };
}

export default async function GameTopupPage(props: { params: Promise<{ game: string }> }) {
  // Wait for React to resolve params in modern App Router correctly if Next15
  const params = await props.params;
  const gameSlug = params.game;
  
  let products: any[] = [];
  let matchedBrand: string | undefined = undefined;

  try {
    // DYNAMIC REVERSE-LOOKUP: match the URL slug back to the exact Digiflazz Brand
    const distinctBrands = await prisma.topupProduct.findMany({
      where: { isActive: true },
      select: { brand: true },
      distinct: ['brand']
    });

    matchedBrand = distinctBrands.find(p => p.brand.toLowerCase().replace(/[^a-z0-9]+/g, '-') === gameSlug)?.brand;

    if (matchedBrand) {
      products = await prisma.topupProduct.findMany({
        where: { brand: matchedBrand, isActive: true },
        orderBy: { price: "asc" }
      });
    }
  } catch {
    // DB unavailable
  }

  if (!matchedBrand || products.length === 0) return notFound();

  return (
    <div className="min-h-screen bg-[#0a0f16] text-slate-200 pb-20">
      <main className="container mx-auto px-0 py-0 max-w-6xl relative z-10 w-full overflow-x-hidden">
        <CheckoutClient products={products} brand={matchedBrand} />
      </main>
    </div>
  );
}
