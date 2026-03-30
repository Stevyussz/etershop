import Link from 'next/link'
import prisma from '@/lib/prisma'
import { ProductCard } from '@/components/product/ProductCard'
import { SlidersHorizontal, ShoppingCart, ArrowRight } from 'lucide-react'

export const revalidate = 60

type SortKey = 'newest' | 'price_asc' | 'price_desc' | 'featured'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Terbaru' },
  { value: 'featured', label: 'Unggulan' },
  { value: 'price_asc', label: 'Harga: Terendah' },
  { value: 'price_desc', label: 'Harga: Tertinggi' },
]

export default async function ShopPage(props: {
  searchParams: Promise<{ category?: string; sort?: string; min?: string; max?: string }>
}) {
  const searchParams = await props.searchParams
  const category = searchParams.category
  const sort = (searchParams.sort as SortKey) || 'newest'
  const minPrice = searchParams.min ? parseFloat(searchParams.min) : undefined
  const maxPrice = searchParams.max ? parseFloat(searchParams.max) : undefined

  const orderBy =
    sort === 'price_asc' ? { price: 'asc' as const } :
    sort === 'price_desc' ? { price: 'desc' as const } :
    sort === 'featured' ? { isFeatured: 'desc' as const } :
    { createdAt: 'desc' as const }

  let categories: any[] = [];
  let products: any[] = [];
  let activeCategory: any = undefined;
  try {
    categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    products = await prisma.product.findMany({
      where: {
        isActive: true,
        ...(category ? { category: { slug: category } } : {}),
        ...(minPrice !== undefined || maxPrice !== undefined
          ? { price: { ...(minPrice !== undefined ? { gte: minPrice } : {}), ...(maxPrice !== undefined ? { lte: maxPrice } : {}) } }
          : {}),
      },
      include: { category: true },
      orderBy,
    });
    activeCategory = categories.find(c => c.slug === category);
  } catch {
    // DB unavailable during prerender
  }

  // Build helper to keep existing params when changing one
  function buildHref(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams()
    const base = { category, sort, min: searchParams.min, max: searchParams.max, ...overrides }
    Object.entries(base).forEach(([k, v]) => { if (v !== undefined) params.set(k, v) })
    return `/shop?${params.toString()}`
  }

  return (
    <div className="min-h-[80vh] bg-[#080d18]">
      {/* Page Header */}
      <div className="border-b border-cyan-500/10 py-12 pt-20">
        <div className="container mx-auto px-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-cyan-500 mb-2">Katalog</p>
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              {activeCategory ? activeCategory.name : 'Semua Produk'}
            </h1>
            <p className="mt-2 text-slate-400">
              {products.length} produk ditemukan
            </p>
          </div>
          {/* Sort */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-sm text-slate-500">Urutkan:</span>
            <div className="flex gap-1.5 flex-wrap">
              {SORT_OPTIONS.map(opt => (
                <Link
                  key={opt.value}
                  href={buildHref({ sort: opt.value })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${sort === opt.value ? 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-300' : 'bg-[#0c1526] border border-cyan-500/10 text-slate-400 hover:text-white hover:border-cyan-500/20'}`}
                >
                  {opt.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full md:w-56 flex-shrink-0">
            <div className="sticky top-24 space-y-6">
              {/* Category filter */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <SlidersHorizontal className="h-4 w-4 text-cyan-400" />
                  <span className="font-bold text-white text-sm">Kategori</span>
                </div>
                <div className="space-y-1">
                  <Link
                    href={buildHref({ category: undefined })}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${!category ? 'bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 text-cyan-300' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                  >
                    <span>Semua</span>
                    {!category && <ArrowRight className="h-3.5 w-3.5" />}
                  </Link>
                  {categories.map(cat => (
                    <Link
                      key={cat.id}
                      href={buildHref({ category: cat.slug })}
                      className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${category === cat.slug ? 'bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 text-cyan-300' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                      <span>{cat.name}</span>
                      {category === cat.slug && <ArrowRight className="h-3.5 w-3.5" />}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Price range */}
              <div>
                <h3 className="font-bold text-white text-sm mb-3">Rentang Harga</h3>
                <form className="space-y-2">
                  {/* Pass hidden params */}
                  {category && <input type="hidden" name="category" value={category} />}
                  {sort && sort !== 'newest' && <input type="hidden" name="sort" value={sort} />}
                  <div className="flex items-center gap-2">
                    <input
                      name="min"
                      type="number"
                      defaultValue={searchParams.min}
                      placeholder="Min"
                      className="w-full h-9 px-3 rounded-xl bg-[#0c1526] border border-cyan-500/20 text-white placeholder:text-slate-600 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                    />
                    <span className="text-slate-500 text-xs">–</span>
                    <input
                      name="max"
                      type="number"
                      defaultValue={searchParams.max}
                      placeholder="Max"
                      className="w-full h-9 px-3 rounded-xl bg-[#0c1526] border border-cyan-500/20 text-white placeholder:text-slate-600 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                    />
                  </div>
                  <button
                    type="submit"
                    formAction="/shop"
                    className="w-full h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold hover:bg-cyan-500/20 transition-all"
                  >
                    Terapkan Filter
                  </button>
                  {(searchParams.min || searchParams.max) && (
                    <Link
                      href={buildHref({ min: undefined, max: undefined })}
                      className="block text-center text-xs text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      Reset harga
                    </Link>
                  )}
                </form>
              </div>
            </div>
          </aside>

          {/* Product Grid */}
          <main className="flex-1">
            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-72 rounded-2xl border border-cyan-500/10 bg-[#0c1526] text-slate-400">
                <ShoppingCart className="h-12 w-12 mb-4 opacity-30" />
                <p className="font-semibold text-white">Produk Tidak Ditemukan</p>
                <p className="text-sm mt-1">Coba ubah filter atau kategori.</p>
                <Link href="/shop" className="mt-6 text-sm text-cyan-400 hover:underline flex items-center gap-1">
                  <ArrowRight className="h-3.5 w-3.5" /> Lihat semua produk
                </Link>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {products.map((p: any) => (
                  <ProductCard key={p.id} product={{ ...p, stock: p.stock ?? -1 }} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
