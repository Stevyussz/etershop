/**
 * @file src/app/admin/games/page.tsx
 * @description Admin page to manage Branding/Images for each game brand.
 */

import { getGameBrandsWithConfigs } from "./actions";
import GameBrandingClient from "./GameBrandingClient";
import { Gamepad2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminGamesPage() {
  const brands = await getGameBrandsWithConfigs();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black text-white flex items-center gap-3">
          <Gamepad2 className="w-8 h-8 text-blue-500" /> Branding Game
        </h2>
        <p className="text-slate-500 font-medium">
          Kelola judul tampilan, kategori, dan gambar cover untuk setiap brand game yang masuk dari Digiflazz.
        </p>
      </div>

      <GameBrandingClient initialBrands={brands} />
    </div>
  );
}
