import prisma from '@/lib/prisma'
import { updateSiteSettings } from '../actions'
import { Settings, Image as ImageIcon, Link as LinkIcon, Bell, Save, Moon, Zap, Clock } from 'lucide-react'

export default async function SettingsPage() {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'main' }
  })

  // Format date for input datetime-local
  const countdownFormatted = settings?.countdownEnd 
    ? new Date(settings.countdownEnd.getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16)
    : ''

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
            <Zap className="h-5 w-5 text-yellow-400" />
            <h2 className="text-xl font-bold text-white">Fitur Konversi & Promo</h2>
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
                  <Clock className="h-4 w-4" /> Countdown Flash Sale (Waktu Selesai)
                </label>
                <input
                  type="datetime-local"
                  name="countdownEnd"
                  defaultValue={countdownFormatted}
                  className="w-full bg-[#0c1526] border border-cyan-500/20 rounded-xl h-11 px-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all"
                />
                <p className="text-xs text-slate-500">Kosongkan jika tidak ada flash sale aktif.</p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
               <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" /> Link Tujuan Popup
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

            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center gap-3 p-4 bg-cyan-500/5 rounded-xl border border-cyan-500/10">
                <input
                  type="checkbox"
                  name="popupActive"
                  id="popupActive"
                  defaultChecked={settings?.popupActive}
                  className="h-5 w-5 rounded border-cyan-500/30 bg-[#0c1526] text-cyan-500 focus:ring-cyan-500/30 cursor-pointer"
                />
                <label htmlFor="popupActive" className="text-xs font-bold text-white cursor-pointer select-none">
                  Popup Aktif
                </label>
              </div>

              <div className="flex items-center gap-3 p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                <input
                  type="checkbox"
                  name="ramadhanMode"
                  id="ramadhanMode"
                  defaultChecked={settings?.ramadhanMode}
                  className="h-5 w-5 rounded border-emerald-500/30 bg-[#0c1526] text-emerald-500 focus:ring-emerald-500/30 cursor-pointer"
                />
                <label htmlFor="ramadhanMode" className="text-xs font-bold text-emerald-400 flex items-center gap-1 cursor-pointer select-none">
                  <Moon className="h-3 w-3" /> Ramadhan Mode
                </label>
              </div>

              <div className="flex items-center gap-3 p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
                <input
                  type="checkbox"
                  name="showLiveSales"
                  id="showLiveSales"
                  defaultChecked={settings?.showLiveSales}
                  className="h-5 w-5 rounded border-indigo-500/30 bg-[#0c1526] text-indigo-500 focus:ring-indigo-500/30 cursor-pointer"
                />
                <label htmlFor="showLiveSales" className="text-xs font-bold text-indigo-400 cursor-pointer select-none">
                  Live Sales Toast
                </label>
              </div>
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
