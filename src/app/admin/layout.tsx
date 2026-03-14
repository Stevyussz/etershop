import Link from 'next/link'
import { LayoutDashboard, Package, Tags, ArrowLeft, Store } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#060b15]">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 flex-shrink-0 flex-col border-r border-cyan-500/10 bg-[#080d18]">
        {/* Brand */}
        <div className="p-6 border-b border-cyan-500/10">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center">
              <Store className="h-4 w-4 text-white" />
            </div>
            <span className="font-extrabold text-white tracking-tight">
              Admin<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">Panel</span>
            </span>
          </div>
          <Link href="/" className="flex items-center gap-2 text-xs text-slate-400 hover:text-cyan-400 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Toko
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <Link href="/admin" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-cyan-500/10 hover:text-white transition-all">
            <LayoutDashboard className="h-4 w-4 text-cyan-400" />
            Dashboard
          </Link>
          <Link href="/admin/products" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-cyan-500/10 hover:text-white transition-all">
            <Package className="h-4 w-4 text-emerald-400" />
            Produk
          </Link>
          <Link href="/admin/categories" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-cyan-500/10 hover:text-white transition-all">
            <Tags className="h-4 w-4 text-teal-400" />
            Kategori
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 p-4 border-b border-cyan-500/10 bg-[#080d18]">
          <Link href="/admin" className="text-sm font-medium text-slate-300 hover:text-white flex items-center gap-1.5">
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </Link>
          <span className="text-slate-600">/</span>
          <Link href="/admin/products" className="text-sm font-medium text-slate-300 hover:text-white flex items-center gap-1.5">
            <Package className="h-4 w-4" /> Produk
          </Link>
          <span className="text-slate-600">/</span>
          <Link href="/admin/categories" className="text-sm font-medium text-slate-300 hover:text-white flex items-center gap-1.5">
            <Tags className="h-4 w-4" /> Kategori
          </Link>
        </div>

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
