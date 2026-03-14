import Link from 'next/link'
import { FileQuestion, Home, LayoutGrid, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-[#080d18] relative overflow-hidden px-4">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-cyan-500/8 blur-[150px]" />
      </div>

      <div className="relative z-10 text-center max-w-md mx-auto">
        {/* Icon */}
        <div className="mx-auto mb-8 h-24 w-24 rounded-3xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/20 flex items-center justify-center">
          <FileQuestion className="h-12 w-12 text-cyan-400" />
        </div>

        {/* Code */}
        <p className="text-8xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400 mb-4 leading-none">
          404
        </p>

        <h1 className="text-2xl font-extrabold text-white mb-3">Halaman Tidak Ditemukan</h1>
        <p className="text-slate-400 mb-10 leading-relaxed">
          Halaman yang kamu cari tidak ada atau telah dipindahkan. Yuk kembali ke beranda atau cari produk yang kamu butuhkan.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full font-bold text-sm text-white bg-gradient-to-r from-cyan-500 to-emerald-500 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-105 transition-all"
          >
            <Home className="h-4 w-4" /> Ke Beranda
          </Link>
          <Link
            href="/shop"
            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full font-bold text-sm text-white border-2 border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 transition-all"
          >
            <LayoutGrid className="h-4 w-4" /> Lihat Katalog
          </Link>
        </div>
      </div>
    </div>
  )
}
