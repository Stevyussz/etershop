'use client'

import { Heart } from 'lucide-react'
import { useWishlistStore } from '@/lib/wishlistStore'

export function WishlistButton({ productId }: { productId: string }) {
  const toggle = useWishlistStore(s => s.toggle)
  const isWishlisted = useWishlistStore(s => s.has(productId))

  return (
    <button
      onClick={() => toggle(productId)}
      aria-label={isWishlisted ? 'Hapus dari wishlist' : 'Simpan ke wishlist'}
      className={`flex items-center gap-2 text-sm font-medium border px-4 py-2.5 rounded-xl transition-all ${
        isWishlisted
          ? 'text-rose-400 border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20'
          : 'text-slate-400 border-cyan-500/10 bg-[#0c1526] hover:text-rose-400 hover:border-rose-500/20 hover:bg-rose-500/10'
      }`}
    >
      <Heart className={`h-4 w-4 transition-all ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
      {isWishlisted ? 'Disimpan' : 'Simpan'}
    </button>
  )
}
