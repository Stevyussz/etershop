'use client'

import { useWishlistStore } from '@/lib/wishlistStore'
import Link from 'next/link'
import { Heart, ShoppingCart, ArrowRight, Trash2 } from 'lucide-react'
import Image from 'next/image'

// NOTE: wishlist only stores IDs — we fetch from sessionStorage-persisted product data
// For simplicity, we show wishlist IDs with a link to each product page.
// ProductCard is a server boundary — wishlist page is client-rendered showing saved IDs.

export default function WishlistPage() {
  const ids = useWishlistStore(s => s.ids)
  const toggle = useWishlistStore(s => s.toggle)
  const clear = useWishlistStore(s => s.clear)

  return (
    <div className="min-h-[80vh] bg-[#080d18]">
      <div className="border-b border-cyan-500/10 py-12 pt-20">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-cyan-500 mb-2">Wishlist</p>
            <h1 className="text-4xl font-extrabold text-white tracking-tight">Produk Tersimpan</h1>
          </div>
          {ids.length > 0 && (
            <button
              onClick={clear}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-red-400 border border-transparent hover:border-red-500/20 px-4 py-2 rounded-xl transition-all"
            >
              <Trash2 className="h-4 w-4" /> Hapus Semua
            </button>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        {ids.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <div className="h-20 w-20 rounded-full bg-rose-500/10 flex items-center justify-center mb-5">
              <Heart className="h-9 w-9 text-rose-400 opacity-60" />
            </div>
            <p className="font-semibold text-white text-lg mb-2">Wishlist Kosong</p>
            <p className="text-sm text-slate-500 mb-6">Simpan produk favoritmu dengan menekan ikon hati.</p>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 text-sm font-bold text-cyan-400 border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 px-5 py-2.5 rounded-full transition-all"
            >
              <ShoppingCart className="h-4 w-4" /> Jelajahi Produk
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-400 mb-6">
              <span className="font-bold text-white">{ids.length}</span> produk tersimpan
            </p>
            {/* Since wishlist only stores IDs, we show compact cards with links */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {ids.map(id => (
                <div key={id} className="rounded-2xl border border-cyan-500/10 bg-[#0c1526] p-4 flex flex-col gap-3 hover:border-cyan-500/20 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
                      <Heart className="h-5 w-5 fill-rose-500 text-rose-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-500 font-mono truncate">{id.slice(0, 16)}…</p>
                      <p className="text-xs text-slate-400 mt-0.5">Produk Tersimpan</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/product/${id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold hover:bg-cyan-500/20 transition-all"
                    >
                      <ArrowRight className="h-3.5 w-3.5" /> Lihat Produk
                    </Link>
                    <button
                      onClick={() => toggle(id)}
                      className="h-9 w-9 flex items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-400 hover:bg-rose-500/20 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 text-sm font-bold text-cyan-400 border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 px-6 py-3 rounded-full transition-all"
              >
                <ShoppingCart className="h-4 w-4" /> Lanjut Belanja
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
