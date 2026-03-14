import prisma from '@/lib/prisma'
import { updateSiteSettings } from '../actions'
import { Settings, Image as ImageIcon, Link as LinkIcon, Bell, Save } from 'lucide-react'

export default async function SettingsPage() {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'main' }
  })

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-10 w-10 rounded-xl bg-slate-500/10 flex items-center justify-center">
          <Settings className="h-6 w-6 text-slate-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Pengaturan Situs</h1>
          <p className="text-slate-400 text-sm">Kelola fitur global dan pengumuman website.</p>
        </div>
      </div>

      <div className="grid gap-8">
        {/* Banner Popup Section */}
        <section className="bg-[#080d18] border border-cyan-500/10 rounded-2xl p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="h-5 w-5 text-cyan-400" />
            <h2 className="text-xl font-bold text-white">Popup Pengumuman</h2>
          </div>

          <form action={updateSiteSettings} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" /> URL Gambar Popup
                </label>
                <input
                  type="url"
                  name="popupImageUrl"
                  defaultValue={settings?.popupImageUrl || ''}
                  placeholder="https://example.com/promo.jpg"
                  className="w-full bg-[#0c1526] border border-cyan-500/20 rounded-xl h-11 px-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all"
                />
                <p className="text-xs text-slate-500">Gunakan URL gambar (Unsplash, Discord, atau host gambar lainnya).</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" /> Link Tujuan (Opsional)
                </label>
                <input
                  type="url"
                  name="popupLink"
                  defaultValue={settings?.popupLink || ''}
                  placeholder="https://wa.me/..."
                  className="w-full bg-[#0c1526] border border-cyan-500/20 rounded-xl h-11 px-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all"
                />
                <p className="text-xs text-slate-500">Halaman yang dibuka saat gambar di-klik.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-cyan-500/5 rounded-xl border border-cyan-500/10">
              <input
                type="checkbox"
                name="popupActive"
                id="popupActive"
                defaultChecked={settings?.popupActive}
                className="h-5 w-5 rounded border-cyan-500/30 bg-[#0c1526] text-cyan-500 focus:ring-cyan-500/30 transition-all cursor-pointer"
              />
              <label htmlFor="popupActive" className="text-sm font-bold text-white cursor-pointer select-none">
                Aktifkan Popup Pengumuman
              </label>
            </div>

            <div className="pt-4 border-t border-cyan-500/10 flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-2 h-12 px-8 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-bold hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all active:scale-95"
              >
                <Save className="h-5 w-5" /> Simpan Perubahan
              </button>
            </div>
          </form>
        </section>

        {/* Info card */}
        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-6">
          <h3 className="text-emerald-400 font-bold mb-2 flex items-center gap-2 text-sm">
            <Save className="h-4 w-4" /> Tips:
          </h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Popup akan muncul satu kali setiap sesi kunjungan pengunjung di Beranda atau Shop untuk memberikan info promo terbaru tanpa mengganggu kenyamanan.
          </p>
        </div>
      </div>
    </div>
  )
}
