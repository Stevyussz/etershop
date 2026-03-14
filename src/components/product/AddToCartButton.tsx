'use client'

import { useState } from 'react'
import { useCartStore } from '@/lib/store'
import { ShoppingCart, CheckCheck } from 'lucide-react'

interface Props {
  product: {
    id: string
    title: string
    price: number
    imageUrl: string | null
  }
}

export function AddToCartButton({ product }: Props) {
  const [isAdded, setIsAdded] = useState(false)
  const addItem = useCartStore((state) => state.addItem)

  const handleAdd = () => {
    addItem({
      id: product.id,
      title: product.title,
      price: product.price,
      imageUrl: product.imageUrl,
    })
    setIsAdded(true)
    setTimeout(() => setIsAdded(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      className={`w-full flex items-center justify-center gap-2 h-14 rounded-xl font-bold text-base transition-all ${
        isAdded
          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          : 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02]'
      }`}
    >
      {isAdded ? (
        <><CheckCheck className="h-5 w-5" /> Ditambahkan ke Keranjang!</>
      ) : (
        <><ShoppingCart className="h-5 w-5" /> Tambah ke Keranjang</>
      )}
    </button>
  )
}
