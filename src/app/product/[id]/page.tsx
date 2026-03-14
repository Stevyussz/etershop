import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { AddToCartButton } from '@/components/product/AddToCartButton'
import { ShareButton } from '@/components/product/ShareButton'
import { WishlistButton } from '@/components/product/WishlistButton'
import { ProductCard } from '@/components/product/ProductCard'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2, ShieldCheck, Zap, ArrowLeft, Star, Package,
  BadgePercent, AlertCircle, Tag
} from 'lucide-react'

export const revalidate = 60

export async function generateMetadata(props: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const params = await props.params
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: { category: true }
  })

  if (!product) return { title: 'Produk Tidak Ditemukan' }

  return {
    title: product.title,
    description: product.description.substring(0, 160),
    openGraph: {
      title: `${product.title} | EterShop`,
      description: product.description.substring(0, 160),
      images: product.imageUrl ? [product.imageUrl] : ['/logo.jpg'],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.title,
      description: product.description.substring(0, 160),
      images: product.imageUrl ? [product.imageUrl] : ['/logo.jpg'],
    }
  }
}

export default async function ProductPage(props: {
  params: Promise<{ id: string }>
}) {
  const params = await props.params
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: { category: true }
  })

  if (!product || !product.isActive) notFound()

  const related = await prisma.product.findMany({
    where: { categoryId: product.categoryId, NOT: { id: product.id }, isActive: true },
    include: { category: true },
    take: 3,
  })

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0

  const isOutOfStock = product.stock === 0
  const isLowStock = product.stock > 0 && product.stock <= 5

  return (
    <div className="min-h-screen bg-[#080d18]">
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: product.title,
            description: product.description,
            image: product.imageUrl || 'https://etershop.vercel.app/logo.jpg',
            sku: product.id,
            offers: {
              '@type': 'Offer',
              price: product.price,
              priceCurrency: 'IDR',
              availability: product.stock === 0 ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
              url: `https://etershop.vercel.app/product/${product.id}`
            },
            brand: {
              '@type': 'Brand',
              name: 'EterShop'
            }
          })
        }}
      />
      <div className="pointer-events-none fixed top-0 right-1/3 h-[700px] w-[700px] rounded-full bg-cyan-500/8 blur-[180px]" />

      <div className="container relative z-10 mx-auto px-4 py-20 md:py-28">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-400 mb-10 flex-wrap">
          <Link href="/" className="hover:text-white transition-colors">Beranda</Link>
          <span>/</span>
          <Link href="/shop" className="hover:text-white transition-colors">Katalog</Link>
          <span>/</span>
          <Link href={`/shop?category=${product.category.slug}`} className="hover:text-white transition-colors">{product.category.name}</Link>
          <span>/</span>
          <span className="text-white line-clamp-1">{product.title}</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
          {/* Image */}
          <div className="w-full lg:w-1/2">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-cyan-500/20 bg-[#0c1526] shadow-2xl shadow-cyan-500/10">
              {product.imageUrl ? (
                <Image src={product.imageUrl} alt={product.title} fill className="object-cover" priority />
              ) : (
                <div className="flex h-full w-full items-center justify-center flex-col gap-3 text-slate-500">
                  <Package className="h-16 w-16 opacity-30" />
                  <p className="text-sm">Tidak ada gambar</p>
                </div>
              )}
              {/* Badges overlay */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                {product.isFeatured && (
                  <span className="inline-flex items-center gap-1 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                    <Star className="h-3 w-3" /> Produk Unggulan
                  </span>
                )}
                {discount > 0 && (
                  <span className="inline-flex items-center gap-1 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                    <BadgePercent className="h-3 w-3" /> Hemat {discount}%
                  </span>
                )}
                {isOutOfStock && (
                  <span className="inline-flex items-center bg-slate-700/90 text-slate-300 text-xs font-bold px-3 py-1.5 rounded-full">
                    Stok Habis
                  </span>
                )}
              </div>
              <div className="absolute inset-0 ring-1 ring-inset ring-cyan-500/10 rounded-2xl pointer-events-none" />
            </div>
            <Link href="/shop" className="mt-5 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="h-4 w-4" /> Kembali ke katalog
            </Link>
          </div>

          {/* Info */}
          <div className="w-full lg:w-1/2 flex flex-col">
            <Badge variant="outline" className="self-start mb-4 text-cyan-400 border-cyan-400/30 bg-cyan-400/10">
              <Tag className="h-3 w-3 mr-1" />{product.category.name}
            </Badge>

            <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4 leading-tight">
              {product.title}
            </h1>

            {/* Price block */}
            <div className="flex items-end gap-3 mb-6">
              <div className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
                Rp {product.price.toLocaleString('id-ID')}
              </div>
              {product.originalPrice && (
                <div className="mb-1">
                  <span className="text-slate-500 line-through text-base">Rp {product.originalPrice.toLocaleString('id-ID')}</span>
                  <span className="ml-2 text-sm text-red-400 font-bold">-{discount}%</span>
                </div>
              )}
            </div>

            {/* Stock indicator */}
            {isLowStock && (
              <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-orange-400">
                <AlertCircle className="h-4 w-4" />
                Hanya sisa {product.stock} lagi — segera pesan!
              </div>
            )}
            {isOutOfStock && (
              <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-slate-400">
                <AlertCircle className="h-4 w-4" />
                Stok sedang habis. Hubungi admin untuk pre-order.
              </div>
            )}

            <p className="text-slate-400 text-base leading-relaxed mb-8 border-l-2 border-cyan-500/30 pl-4">
              {product.description}
            </p>

            {/* Trust badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                <span className="text-xs font-semibold text-slate-300 leading-tight">Proses Cepat & Terverifikasi</span>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <ShieldCheck className="h-5 w-5 text-cyan-400 flex-shrink-0" />
                <span className="text-xs font-semibold text-slate-300 leading-tight">Garansi 100% S&K</span>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-teal-500/10 border border-teal-500/20">
                <Zap className="h-5 w-5 text-teal-400 flex-shrink-0" />
                <span className="text-xs font-semibold text-slate-300 leading-tight">Support WA & Discord</span>
              </div>
            </div>

            {/* Action row */}
            <div className="space-y-3 mt-auto">
              <AddToCartButton product={{ id: product.id, title: product.title, price: product.price, imageUrl: product.imageUrl }} />
              <div className="flex gap-3">
                <WishlistButton productId={product.id} />
                <ShareButton title={product.title} id={product.id} />
              </div>
              <p className="text-xs text-center text-slate-500">
                Pembayaran diproses melalui WhatsApp — aman dan dibantu admin.
              </p>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <section className="mt-20 pt-10 border-t border-cyan-500/10">
            <h2 className="text-2xl font-extrabold text-white mb-8">Produk Serupa</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p: any) => (
                <ProductCard key={p.id} product={{ ...p, stock: p.stock ?? -1 }} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
