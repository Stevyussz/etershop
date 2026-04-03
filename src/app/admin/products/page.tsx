import prisma from "@/lib/prisma";
import ProductDashboardClient from "./ProductDashboardClient";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function AdminProductsPage() {
  let products: any[] = [];
  try {
    products = await prisma.topupProduct.findMany({
      orderBy: [
        { isActive: "desc" },
        { brand: "asc" },
        { price: "asc" }
      ]
    });
  } catch {
    // DB unavailable — render empty state
  }

  return (
    <ProductDashboardClient products={products} />
  );
}
