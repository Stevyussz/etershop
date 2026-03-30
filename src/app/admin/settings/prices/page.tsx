/**
 * @file src/app/admin/settings/prices/page.tsx
 */

import prisma from "@/lib/prisma";
import { getPriceSettings } from "../price-actions";
import PriceSettingsClient from "../PriceSettingsClient";

export default async function AdminPriceSettingsPage() {
  const settings = await getPriceSettings();
  
  // Fetch distinct brands for targeted updates
  const distinctBrands = await prisma.topupProduct.findMany({
    where: { isActive: true },
    select: { brand: true },
    distinct: ['brand'],
    orderBy: { brand: 'asc' }
  });
  const brands = distinctBrands.map(b => b.brand);

  return (
    <div className="container mx-auto px-6 py-10">
      <PriceSettingsClient initialSettings={settings as any} brands={brands} />
    </div>
  );
}
