/**
 * @file src/app/admin/settings/prices/page.tsx
 */

import { getPriceSettings } from "../price-actions";
import PriceSettingsClient from "../PriceSettingsClient";

export default async function AdminPriceSettingsPage() {
  const settings = await getPriceSettings();

  return (
    <div className="container mx-auto px-6 py-10">
      <PriceSettingsClient initialSettings={settings as any} />
    </div>
  );
}
