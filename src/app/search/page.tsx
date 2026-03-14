import prisma from '@/lib/prisma'
import { ProductCard } from '@/components/product/ProductCard'
import { Search, SlidersHorizontal } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function SearchPage(props: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await props.searchParams
  const query = q?.trim() ?? ''

  const products = query
    ? await prisma.product.findMany({
        where: {
          isActive: true,
          OR: [
            { title: { contains: query } },
            { description: { contains: query } },
            { category: { name: { contains: query } } },
          ],
        },
        include: { category: true },
        orderBy: { isFeatured: 'desc' },
      })
    : []

  return (
    <div className="min-h-[80vh] bg-[#080d18]">
      {/* Header */}
      <div className="border-b border-cyan-500/10 py-12 pt-20">
        <div className="container mx-auto px-4">
          <p className="text-sm font-bold uppercase tracking-widest text-cyan-500 mb-2">Pencarian</p>
          <h1 className="text-4xl font-extrabold text-white tracking-tight mb-6">
            {query ? (
              <>Hasil untuk &ldquo;<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">{query}</span>&rdquo;</>
            ) : (
              'Cari Produk'
            )}
          </h1>

          {/* Search form */}
          <form className="flex items-center gap-3 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
              <input
                name="q"
                defaultValue={query}
                placeholder="Cari produk, kategori…"
                autoFocus
                className="w-full h-12 pl-11 pr-4 rounded-xl bg-[#0c1526] border border-cyan-500/20 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 text-sm"
              />
            </div>
            <button
              type="submit"
              className="h-12 px-6 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 shadow-lg shadow-cyan-500/20 transition-all whitespace-nowrap"
            >
              Cari
            </button>
          </form>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        {!query ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Search className="h-14 w-14 mb-4 opacity-20" />
            <p className="text-white font-semibold">Ketik sesuatu untuk mencari</p>
            <p className="text-sm mt-1">Cari berdasarkan nama produk atau kategori</p>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <SlidersHorizontal className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-white font-semibold">Produk Tidak Ditemukan</p>
            <p className="text-sm mt-1">Coba kata kunci yang berbeda.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-400 mb-6">
              Ditemukan <span className="font-bold text-white">{products.length}</span> produk
            </p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((p: any) => (
                <ProductCard key={p.id} product={{ ...p, stock: p.stock ?? -1 }} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
