/**
 * @file src/app/admin/settings/prices/page.tsx
 */

import prisma from "@/lib/prisma";
import { getPriceSettings } from "../price-actions";
import PriceSettingsClient from "../PriceSettingsClient";

export const dynamic = "force-dynamic";

export default async function AdminPriceSettingsPage() {
  // Fetch settings and brand list in parallel
  const [settings, distinctBrands] = await Promise.all([
    getPriceSettings(),
    prisma.topupProduct
      .findMany({
        where: { isActive: true },
        select: { brand: true },
        distinct: ["brand"],
        orderBy: { brand: "asc" },
      })
      .catch(() => []),
  ]);

  const brands = distinctBrands.map((b) => b.brand);

  return (
    <div className="container mx-auto px-6 py-10">
      <PriceSettingsClient initialSettings={settings} brands={brands} />
    </div>
  );
}
