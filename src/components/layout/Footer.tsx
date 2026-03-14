import Link from 'next/link'
import Image from 'next/image'
import { Github, MessageSquare, Phone, Home, LayoutGrid, ShieldCheck, Store } from 'lucide-react'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-cyan-500/10 bg-[#060b15]">
      <div className="container mx-auto px-4 pt-12 pb-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2">
            <Link href="/" className="flex items-center space-x-2.5 mb-4">
              <div className="relative h-8 w-8 overflow-hidden rounded-lg ring-1 ring-cyan-500/30">
                <Image src="/logo.jpg" alt="Etershop Logo" fill className="object-cover" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-white">
                Eter<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">Shop</span>
              </span>
            </Link>
            <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
              Toko Digital Pelajar & Gamer. Hosting server Minecraft, Skin Custom, Desain Web & Logo — dengan harga terjangkau dan kualitas tinggi.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
                <ShieldCheck className="h-3.5 w-3.5" />
                Garansi S&K
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-full">
                <Store className="h-3.5 w-3.5" />
                470+ Order
              </div>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold text-white mb-4 text-sm tracking-wide uppercase">Navigasi</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors">
                  <Home className="h-3.5 w-3.5" /> Beranda
                </Link>
              </li>
              <li>
                <Link href="/shop" className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors">
                  <LayoutGrid className="h-3.5 w-3.5" /> Katalog Produk
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-white mb-4 text-sm tracking-wide uppercase">Kontak</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="https://dsc.gg/etershop" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors">
                  <MessageSquare className="h-3.5 w-3.5" /> Discord Server
                </Link>
              </li>
              <li>
                <Link href="https://bit.ly/EterShopGrupWa" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors">
                  <Phone className="h-3.5 w-3.5" /> Grup WhatsApp
                </Link>
              </li>
              <li>
                <Link href="https://wa.me/c/6285175224481" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors">
                  <Phone className="h-3.5 w-3.5" /> WhatsApp Admin
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-cyan-500/10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <p>&copy; {year} EterShop. All rights reserved.</p>
          <p className="flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Transaksi Aman & Bergaransi
          </p>
        </div>
      </div>
    </footer>
  )
}
