'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ShoppingCart, Star, ArrowRight, Heart, BadgePercent } from 'lucide-react'
import { useWishlistStore } from '@/lib/wishlistStore'
import { useCartStore } from '@/lib/store'
import { useState } from 'react'
import { CheckCheck } from 'lucide-react'

interface Product {
  id: string
  title: string
  description: string
  price: number
  originalPrice?: number | null
  imageUrl?: string | null
  isFeatured: boolean
  stock: number
  category: { name: string; slug: string }
}

interface ProductCardProps {
  product: Product
  showQuickAdd?: boolean
}

export function ProductCard({ product, showQuickAdd = true }: ProductCardProps) {
  const toggle = useWishlistStore(s => s.toggle)
  const isWishlisted = useWishlistStore(s => s.has(product.id))
  const addItem = useCartStore(s => s.addItem)
  const [added, setAdded] = useState(false)

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0

  const isOutOfStock = product.stock === 0

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    if (isOutOfStock) return
    addItem({ id: product.id, title: product.title, price: product.price, imageUrl: product.imageUrl ?? null })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault()
    toggle(product.id)
  }

  return (
    <Link
      href={`/product/${product.id}`}
      className="group flex flex-col rounded-2xl border border-cyan-500/10 bg-[#0c1526] overflow-hidden hover:border-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-500/10 transition-all duration-300 hover:-translate-y-1"
    >
      {/* Image */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-800">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
            <ShoppingCart className="h-10 w-10 text-slate-600" />
          </div>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c1526] via-transparent to-transparent opacity-70" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.isFeatured && (
            <span className="inline-flex items-center gap-1 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">
              <Star className="h-3 w-3" /> Premium
            </span>
          )}
          {discount > 0 && (
            <span className="inline-flex items-center gap-1 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">
              <BadgePercent className="h-3 w-3" /> -{discount}%
            </span>
          )}
          {isOutOfStock && (
            <span className="inline-flex items-center bg-slate-700/90 text-slate-300 text-xs font-bold px-2.5 py-1 rounded-full">
              Habis
            </span>
          )}
        </div>

        {/* Wishlist button */}
        <button
          onClick={handleWishlist}
          aria-label={isWishlisted ? 'Hapus dari wishlist' : 'Tambah ke wishlist'}
          className="absolute top-3 right-3 h-8 w-8 flex items-center justify-center rounded-full bg-[#0c1526]/80 backdrop-blur-sm border border-cyan-500/20 hover:border-cyan-500/40 transition-all shadow"
        >
          <Heart
            className={`h-4 w-4 transition-colors ${isWishlisted ? 'fill-rose-500 text-rose-500' : 'text-slate-300 hover:text-rose-400'}`}
          />
        </button>
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col flex-1">
        <span className="text-xs text-cyan-400 font-bold tracking-widest uppercase mb-2">
          {product.category.name}
        </span>
        <h3 className="font-bold text-lg text-white mb-2 line-clamp-2 leading-tight">{product.title}</h3>
        <p className="text-slate-400 text-sm mb-4 line-clamp-2 leading-relaxed flex-1">{product.description}</p>

        {/* Price row */}
        <div className="pt-4 border-t border-cyan-500/10">
          <div className="flex items-end justify-between gap-2">
            <div>
              <span className="font-extrabold text-lg text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400 block">
                Rp {product.price.toLocaleString('id-ID')}
              </span>
              {product.originalPrice && (
                <span className="text-xs text-slate-500 line-through">
                  Rp {product.originalPrice.toLocaleString('id-ID')}
                </span>
              )}
            </div>
            {/* Stock indicator */}
            {product.stock > 0 && product.stock <= 5 && (
              <span className="text-xs text-orange-400 font-semibold">Sisa {product.stock}</span>
            )}
          </div>

          {/* Quick add button */}
          {showQuickAdd && (
            <button
              onClick={handleQuickAdd}
              disabled={isOutOfStock}
              className={`mt-3 w-full flex items-center justify-center gap-2 h-9 rounded-xl text-sm font-bold transition-all ${
                isOutOfStock
                  ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                  : added
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 border border-cyan-500/20 text-cyan-300 hover:from-cyan-500 hover:to-emerald-500 hover:text-white hover:border-transparent hover:shadow-lg hover:shadow-cyan-500/20'
              }`}
            >
              {isOutOfStock ? (
                'Stok Habis'
              ) : added ? (
                <><CheckCheck className="h-4 w-4" /> Ditambahkan!</>
              ) : (
                <><ShoppingCart className="h-4 w-4" /> Tambah ke Keranjang</>
              )}
            </button>
          )}
        </div>
      </div>
    </Link>
  )
}
