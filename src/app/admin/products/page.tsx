import prisma from "@/lib/prisma";
import ProductDashboardClient from "./ProductDashboardClient";

export default async function AdminProductsPage() {
  const products = await prisma.topupProduct.findMany({
    orderBy: [
      { isActive: "desc" },
      { brand: "asc" },
      { price: "asc" }
    ]
  });

  return (
    <ProductDashboardClient products={products} />
  );
}
