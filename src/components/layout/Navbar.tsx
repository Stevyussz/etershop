'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { CartSheet } from '@/components/cart/CartSheet'
import { Menu, X, Home, LayoutGrid, Users, Search, Heart, Zap } from 'lucide-react'
import { useWishlistStore } from '@/lib/wishlistStore'

const navLinks = [
  { href: '/', label: 'Beranda', icon: Home },
  { href: '/topup', label: 'Top Up', icon: Zap },
  { href: '/shop', label: 'Katalog', icon: LayoutGrid },
  { href: '/topup/track', label: 'Lacak Pesanan', icon: Search },
  { href: 'https://dsc.gg/etershop', label: 'Komunitas', icon: Users, external: true },
]

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const wishlistCount = useWishlistStore(s => s.ids.length)

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    setSearchOpen(false)
    setQuery('')
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-cyan-500/10 bg-[#080d18]/80 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="h-16 flex items-center justify-between gap-3">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2.5 flex-shrink-0" onClick={() => setMobileOpen(false)}>
            <div className="relative h-8 w-8 overflow-hidden rounded-lg ring-1 ring-cyan-500/30">
              <Image src="/logo.jpg" alt="Etershop Logo" fill className="object-cover" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white flex items-center">
              Eter<span className="script-font soft-glow bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-emerald-400 ml-1">Topup</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {navLinks.map(({ href, label, icon: Icon, external }) => (
              <Link
                key={href}
                href={href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-all"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>

          {/* Search Bar (inline desktop) */}
          {searchOpen ? (
            <form onSubmit={handleSearch} className="hidden md:flex items-center gap-2 flex-1 max-w-xs">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Cari produk…"
                  className="w-full h-9 pl-9 pr-3 rounded-xl bg-[#0c1526] border border-cyan-500/30 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => { setSearchOpen(false); setQuery('') }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </form>
          ) : null}

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Search toggle (desktop) */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              aria-label="Cari produk"
              className="hidden md:flex items-center justify-center h-9 w-9 rounded-xl border border-cyan-500/20 bg-cyan-500/5 text-slate-300 hover:text-white hover:bg-cyan-500/15 transition-colors"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Wishlist */}
            <Link
              href="/wishlist"
              aria-label="Wishlist"
              className="relative hidden md:flex items-center justify-center h-9 w-9 rounded-xl border border-cyan-500/20 bg-cyan-500/5 text-slate-300 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 transition-colors"
            >
              <Heart className="h-4 w-4" />
              {wishlistCount > 0 && (
                <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-rose-500 text-[11px] font-bold text-white flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </Link>

            <CartSheet />

            {/* Mobile toggle */}
            <button
              className="md:hidden flex items-center justify-center h-9 w-9 rounded-xl border border-cyan-500/20 bg-cyan-500/5 text-slate-300 hover:text-white transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-cyan-500/10 py-3 pb-4 space-y-1">
            {/* Mobile Search */}
            <form onSubmit={handleSearch} className="flex items-center gap-2 px-1 mb-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Cari produk…"
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#0c1526] border border-cyan-500/20 text-white placeholder:text-slate-500 focus:outline-none text-sm"
                />
              </div>
              <button type="submit" className="h-10 px-4 rounded-xl bg-cyan-500/20 text-cyan-300 text-sm font-bold hover:bg-cyan-500/30 transition-all">
                Cari
              </button>
            </form>

            {navLinks.map(({ href, label, icon: Icon, external }) => (
              <Link
                key={href}
                href={href}
                target={external ? '_blank' : undefined}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-all"
              >
                <Icon className="h-4 w-4 text-cyan-400" />
                {label}
              </Link>
            ))}

            <Link
              href="/wishlist"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-rose-300 hover:bg-rose-500/5 transition-all"
            >
              <Heart className="h-4 w-4 text-rose-400" />
              Wishlist
              {wishlistCount > 0 && (
                <span className="ml-auto text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">{wishlistCount}</span>
              )}
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
