import prisma from '@/lib/prisma'
import { Package, Tags, Activity, TrendingUp, ShoppingCart } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const [productCount, categoryCount, featuredCount] = await Promise.all([
    prisma.product.count(),
    prisma.category.count(),
    prisma.product.count({ where: { isFeatured: true } }),
  ])

  const recentProducts = await prisma.product.findMany({
    include: { category: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  const stats = [
    { label: 'Total Produk', value: productCount, icon: Package, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', href: '/admin/products' },
    { label: 'Produk Unggulan', value: featuredCount, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', href: '/admin/products' },
    { label: 'Total Kategori', value: categoryCount, icon: Tags, color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20', href: '/admin/categories' },
    { label: 'Status Server', value: 'Online', icon: Activity, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', href: '#' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white mb-1 tracking-tight">Dashboard</h1>
        <p className="text-slate-400">Selamat datang kembali di panel admin EterShop.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-10">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className={`rounded-2xl border ${s.border} ${s.bg} p-5 hover:brightness-110 transition-all`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{s.label}</span>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <div className={`text-3xl font-extrabold ${s.color}`}>{s.value}</div>
          </Link>
        ))}
      </div>

      {/* Recent Products */}
      <div className="rounded-2xl border border-cyan-500/10 bg-[#0c1526] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/10">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-cyan-400" />
            <h2 className="font-bold text-white">Produk Terbaru</h2>
          </div>
          <Link href="/admin/products" className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
            Kelola semua →
          </Link>
        </div>
        <div className="divide-y divide-cyan-500/10">
          {recentProducts.length === 0 ? (
            <p className="text-center text-slate-400 py-10">Belum ada produk.</p>
          ) : (
            recentProducts.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-semibold text-white text-sm">{p.title}</p>
                  <p className="text-xs text-slate-400">{p.category.name}</p>
                </div>
                <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400 text-sm">
                  Rp {p.price.toLocaleString('id-ID')}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
