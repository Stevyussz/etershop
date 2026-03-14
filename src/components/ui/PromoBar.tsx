'use client'

import { useState, useEffect } from 'react'
import { X, Tag } from 'lucide-react'

const promos = [
  { id: 1, text: 'Diskon hingga 44% untuk semua produk digital!' },
  { id: 2, text: 'Gratis ongkir (biaya layanan) — semua order!' },
  { id: 3, text: 'Garansi uang kembali S&K Berlaku' },
]

export function PromoBar() {
  const [visible, setVisible] = useState(false)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const dismissed = sessionStorage.getItem('promo-dismissed')
    if (!dismissed) setVisible(true)
  }, [])

  useEffect(() => {
    if (!visible) return
    const t = setInterval(() => setIndex(i => (i + 1) % promos.length), 4000)
    return () => clearInterval(t)
  }, [visible])

  const dismiss = () => {
    sessionStorage.setItem('promo-dismissed', '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="relative bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 text-white text-sm py-2 px-4 text-center font-medium">
      <span className="flex items-center justify-center gap-2">
        <Tag className="h-3.5 w-3.5 flex-shrink-0" />
        <span key={index} className="animate-fade-in">{promos[index].text}</span>
      </span>
      <button
        onClick={dismiss}
        aria-label="Tutup promo"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
