'use client'

import { useState } from 'react'
import { useCartStore } from '@/lib/store'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ShoppingCart, Trash2, Plus, Minus, Send,
  PackageOpen, ShieldCheck, X, ArrowRight
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export function CartSheet() {
  const { items, removeItem, updateQuantity, clearCart, totalPrice } = useCartStore()
  const [isOpen, setIsOpen] = useState(false)

  const handleCheckout = () => {
    if (items.length === 0) return

    const orderLines = items
      .map((item) => `- ${item.title} (x${item.quantity}) — Rp ${(item.price * item.quantity).toLocaleString('id-ID')}`)
      .join('\n')

    const message =
      `Halo EterShop! Saya ingin memesan:\n\n${orderLines}\n\n` +
      `*Total: Rp ${totalPrice().toLocaleString('id-ID')}*\n\n` +
      `Mohon info metode pembayarannya. Terima kasih!`

    const whatsappUrl = `https://wa.me/6285175224481?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  const itemCount = items.reduce((total, item) => total + item.quantity, 0)
  const subtotal = totalPrice()

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger
        aria-label={`Keranjang (${itemCount} item)`}
        className="inline-flex items-center justify-center relative rounded-xl border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/15 transition-colors h-9 w-9 text-cyan-400 hover:text-cyan-300 shrink-0"
      >
        <ShoppingCart className="h-5 w-5" />
        {itemCount > 0 && (
          <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 text-[11px] font-bold text-white flex items-center justify-center shadow-lg">
            {itemCount}
          </span>
        )}
      </SheetTrigger>

      <SheetContent className="flex w-full flex-col bg-[#0c1526] border-l border-cyan-500/10 text-white p-0 sm:max-w-md">
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b border-cyan-500/10 flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2.5">
            <ShoppingCart className="h-5 w-5 text-cyan-400" />
            <SheetTitle className="text-white text-base font-bold">
              Keranjang Belanja
            </SheetTitle>
            {itemCount > 0 && (
              <span className="text-xs font-bold bg-cyan-500/15 border border-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full">
                {itemCount} item
              </span>
            )}
          </div>
          {items.length > 0 && (
            <button
              onClick={() => clearCart()}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-400 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Hapus Semua
            </button>
          )}
        </SheetHeader>
        <SheetDescription className="sr-only">Daftar produk di keranjang belanja kamu</SheetDescription>

        {/* Items */}
        <ScrollArea className="flex-1 px-6 py-4">
          {items.length === 0 ? (
            <div className="flex h-[55vh] flex-col items-center justify-center gap-4 text-slate-400">
              <div className="h-24 w-24 rounded-full bg-cyan-500/10 flex items-center justify-center">
                <PackageOpen className="h-10 w-10 text-cyan-400/50" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-white mb-1">Keranjang Kosong</p>
                <p className="text-sm text-slate-500">Tambahkan produk untuk mulai belanja.</p>
              </div>
              <Link
                href="/shop"
                onClick={() => setIsOpen(false)}
                className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-400 border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 px-4 py-2 rounded-full transition-all mt-2"
              >
                Jelajahi Produk <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-xl border border-cyan-500/10 bg-[#080d18] p-3 group hover:border-cyan-500/20 transition-colors"
                >
                  {/* Thumbnail */}
                  <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-slate-800 flex-shrink-0">
                    {item.imageUrl ? (
                      <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ShoppingCart className="h-6 w-6 text-slate-600" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-white line-clamp-2 leading-tight mb-1">{item.title}</p>
                    <p className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
                      Rp {item.price.toLocaleString('id-ID')}
                    </p>

                    {/* Qty control */}
                    <div className="flex items-center gap-2 mt-2.5">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="h-6 w-6 rounded-lg flex items-center justify-center border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/15 text-white disabled:opacity-30 transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-sm font-bold w-5 text-center tabular-nums">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="h-6 w-6 rounded-lg flex items-center justify-center border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/15 text-white transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <span className="ml-auto text-xs text-slate-500 font-medium">
                        Subtotal: <span className="text-slate-300">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</span>
                      </span>
                    </div>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeItem(item.id)}
                    className="flex-shrink-0 h-7 w-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all mt-0.5"
                    aria-label={`Hapus ${item.title}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-6 py-5 border-t border-cyan-500/10 space-y-4 bg-[#080d18]">
            {/* Price breakdown */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-slate-400">
                <span>{itemCount} item</span>
                <span>Rp {subtotal.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-400">
                <span>Biaya layanan</span>
                <span className="text-emerald-400 font-semibold">Gratis</span>
              </div>
              <div className="border-t border-cyan-500/10" />
              <div className="flex justify-between font-extrabold text-base">
                <span className="text-white">Total</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
                  Rp {subtotal.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Checkout CTA */}
            <button
              onClick={handleCheckout}
              className="w-full flex items-center justify-center gap-2 h-12 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:scale-[1.01]"
            >
              <Send className="h-4 w-4" />
              Checkout via WhatsApp
            </button>

            {/* Trust note */}
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Pembayaran aman, dibantu langsung oleh admin
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
