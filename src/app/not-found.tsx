import Link from 'next/link'
import { FileQuestion, Home, LayoutGrid, Zap } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-[85vh] flex items-center justify-center bg-[#080d18] relative overflow-hidden px-4">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-cyan-500/6 blur-[140px]" />
        <div className="absolute top-2/3 right-1/4 h-[300px] w-[300px] rounded-full bg-emerald-500/5 blur-[120px]" />
        {/* Subtle grid lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#06b6d405_1px,transparent_1px),linear-gradient(to_bottom,#06b6d405_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <div className="relative z-10 text-center max-w-lg mx-auto">
        {/* Icon badge */}
        <div className="mx-auto mb-8 h-24 w-24 rounded-3xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/10 border border-cyan-500/20 flex items-center justify-center shadow-[0_0_60px_-15px_rgba(6,182,212,0.3)]">
          <FileQuestion className="h-12 w-12 text-cyan-400" />
        </div>

        {/* 404 code */}
        <p className="text-[7rem] sm:text-[9rem] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 leading-none mb-2 select-none">
          404
        </p>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-4">
          Halaman Tidak Ditemukan
        </h1>
        <p className="text-slate-400 mb-10 leading-relaxed max-w-sm mx-auto">
          Halaman yang kamu cari tidak ada atau telah dipindahkan. Yuk kembali atau telusuri layanan kami yang lain.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full font-bold text-sm text-white bg-gradient-to-r from-cyan-500 to-emerald-500 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-0.5 active:scale-95 transition-all"
          >
            <Home className="h-4 w-4" /> Ke Beranda
          </Link>
          <Link
            href="/topup"
            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full font-bold text-sm text-white border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 hover:-translate-y-0.5 transition-all"
          >
            <Zap className="h-4 w-4 text-cyan-400" /> Top Up Sekarang
          </Link>
          <Link
            href="/shop"
            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full font-bold text-sm text-slate-300 border border-white/10 bg-white/5 hover:bg-white/10 transition-all"
          >
            <LayoutGrid className="h-4 w-4" /> Katalog
          </Link>
        </div>

        {/* Help tip */}
        <p className="mt-10 text-xs text-slate-600">
          Butuh bantuan? Hubungi kami lewat{' '}
          <Link href="https://dsc.gg/etershop" target="_blank" className="text-cyan-600 hover:text-cyan-400 transition-colors">
            Discord
          </Link>{' '}
          atau{' '}
          <Link href="https://wa.me/c/6285175224481" target="_blank" className="text-cyan-600 hover:text-cyan-400 transition-colors">
            WhatsApp
          </Link>.
        </p>
      </div>
    </div>
  )
}
