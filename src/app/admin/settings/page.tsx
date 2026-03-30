/**
 * @file src/app/admin/settings/page.tsx
 * @description Admin Site Settings Page.
 *
 * Allows management of global storefront features:
 * - Banner/popup promo configuration
 * - Flash sale countdown timer
 * - Live Sales notification toggle
 * - Ramadhan mode toggle
 *
 * Uses a standard HTML form with the updateSiteSettings Server Action.
 * Includes a client-side confirmation toast after save.
 */

import prisma from "@/lib/prisma";
import { updateSiteSettings } from "../actions";
import {
  Settings, Image as ImageIcon, LinkIcon, Bell, Save,
  Moon, Zap, Clock, Info, Globe, ToggleRight, Palette
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  let settings = null;
  try {
    settings = await prisma.siteSettings.findUnique({ where: { id: "main" } });
  } catch {
    // DB unavailable
  }

  // Format datetime-local value accounting for timezone offset
  const countdownFormatted = settings?.countdownEnd
    ? new Date(settings.countdownEnd.getTime() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : "";

  return (
    <div className="max-w-5xl">
      {/* ── Page Header ── */}
      <div className="flex items-center gap-4 mb-8">
        <div className="h-12 w-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.2)]">
          <Settings className="h-6 w-6 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">Pengaturan Situs</h1>
          <p className="text-slate-400 text-sm">Kelola fitur global, promo, dan tampilan storefront.</p>
        </div>
      </div>

      <form action={updateSiteSettings} className="space-y-6">
        {/* ── SECTION 1: Popup Promo ── */}
        <section className="bg-[#111823] border border-white/5 rounded-3xl p-6 md:p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-6 pb-5 border-b border-white/5">
            <div className="w-9 h-9 rounded-xl bg-yellow-500/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Popup Promo</h2>
              <p className="text-xs text-slate-500">Tampilan banner iklan saat pengunjung membuka toko.</p>
            </div>
            {/* Current Status Indicator */}
            <div className={`ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${settings?.popupActive ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-white/5 border-white/5 text-slate-500"}`}>
              <span className={`w-2 h-2 rounded-full ${settings?.popupActive ? "bg-emerald-500 animate-pulse" : "bg-slate-600"}`} />
              {settings?.popupActive ? "Aktif" : "Nonaktif"}
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-slate-400" /> URL Gambar Popup
              </label>
              <input
                type="url"
                name="popupImageUrl"
                defaultValue={settings?.popupImageUrl ?? ""}
                placeholder="https://example.com/promo.jpg"
                className="w-full bg-[#0a0f16] border border-white/10 rounded-xl h-11 px-4 text-white text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
              />
              <p className="text-xs text-slate-500">Gunakan link gambar langsung (CDN, Discord, Imgur).</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-slate-400" /> Link Tujuan Popup
              </label>
              <input
                type="url"
                name="popupLink"
                defaultValue={settings?.popupLink ?? ""}
                placeholder="https://wa.me/6281234567890"
                className="w-full bg-[#0a0f16] border border-white/10 rounded-xl h-11 px-4 text-white text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
              />
              <p className="text-xs text-slate-500">Halaman yang dibuka saat gambar diklik.</p>
            </div>
          </div>
        </section>

        {/* ── SECTION 2: Flash Sale Countdown ── */}
        <section className="bg-[#111823] border border-white/5 rounded-3xl p-6 md:p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-6 pb-5 border-b border-white/5">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Flash Sale Countdown</h2>
              <p className="text-xs text-slate-500">Timer hitung mundur yang tampil di storefront.</p>
            </div>
          </div>

          <div className="max-w-sm space-y-2">
            <label className="text-sm font-semibold text-slate-300">Waktu Selesai Flash Sale</label>
            <input
              type="datetime-local"
              name="countdownEnd"
              defaultValue={countdownFormatted}
              className="w-full bg-[#0a0f16] border border-white/10 rounded-xl h-11 px-4 text-white text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
            />
            <p className="text-xs text-slate-500">
              Kosongkan untuk menyembunyikan timer. Timer otomatis menghilang saat waktu habis.
            </p>
          </div>
        </section>

        {/* ── SECTION 3: Feature Toggles ── */}
        <section className="bg-[#111823] border border-white/5 rounded-3xl p-6 md:p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-6 pb-5 border-b border-white/5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <ToggleRight className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Fitur &amp; Tampilan</h2>
              <p className="text-xs text-slate-500">Aktifkan atau nonaktifkan fitur storefront secara real-time.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {/* Popup Active */}
            <label className="flex items-center gap-4 p-4 bg-[#0a0f16] border border-white/5 rounded-2xl cursor-pointer hover:border-emerald-500/30 transition-all group has-[:checked]:border-emerald-500/30 has-[:checked]:bg-emerald-500/5">
              <input
                type="checkbox"
                name="popupActive"
                id="popupActive"
                defaultChecked={settings?.popupActive ?? false}
                className="h-5 w-5 rounded accent-emerald-500 cursor-pointer shrink-0"
              />
              <div>
                <span className="text-sm font-bold text-white block">Popup Aktif</span>
                <span className="text-xs text-slate-500">Tampilkan banner promo</span>
              </div>
            </label>

            {/* Ramadhan Mode */}
            <label className="flex items-center gap-4 p-4 bg-[#0a0f16] border border-white/5 rounded-2xl cursor-pointer hover:border-emerald-500/30 transition-all group has-[:checked]:border-emerald-500/30 has-[:checked]:bg-emerald-500/5">
              <input
                type="checkbox"
                name="ramadhanMode"
                id="ramadhanMode"
                defaultChecked={settings?.ramadhanMode ?? false}
                className="h-5 w-5 rounded accent-emerald-500 cursor-pointer shrink-0"
              />
              <div>
                <span className="text-sm font-bold text-white flex items-center gap-1.5 mb-0.5">
                  <Moon className="h-3.5 w-3.5 text-emerald-400" /> Ramadhan Mode
                </span>
                <span className="text-xs text-slate-500">Dekorasi islami</span>
              </div>
            </label>

            {/* Live Sales Toast */}
            <label className="flex items-center gap-4 p-4 bg-[#0a0f16] border border-white/5 rounded-2xl cursor-pointer hover:border-blue-500/30 transition-all group has-[:checked]:border-blue-500/30 has-[:checked]:bg-blue-500/5">
              <input
                type="checkbox"
                name="showLiveSales"
                id="showLiveSales"
                defaultChecked={settings?.showLiveSales ?? false}
                className="h-5 w-5 rounded accent-blue-500 cursor-pointer shrink-0"
              />
              <div>
                <span className="text-sm font-bold text-white flex items-center gap-1.5 mb-0.5">
                  <Bell className="h-3.5 w-3.5 text-blue-400" /> Live Sales Toast
                </span>
                <span className="text-xs text-slate-500">Notifikasi pembelian simulasi</span>
              </div>
            </label>
          </div>
        </section>

        {/* ── Info Card ── */}
        <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-5 flex gap-3">
          <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-slate-400 text-sm leading-relaxed">
            <strong className="text-white">Tips:</strong> Popup promo tampil sekali per sesi pengunjung. Live Sales Toast menampilkan notifikasi simulasi pembelian (bukan data riil) untuk meningkatkan konversi.
          </p>
        </div>

        {/* ── Save Button ── */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="inline-flex items-center gap-2 h-12 px-8 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold shadow-lg hover:shadow-[0_10px_30px_rgba(37,99,235,0.4)] hover:-translate-y-0.5 transition-all active:scale-95 text-sm"
          >
            <Save className="h-5 w-5" /> Simpan Semua Perubahan
          </button>
        </div>
      </form>
    </div>
  );
}
