import { MetadataRoute } from 'next'
import prisma from '@/lib/prisma'

/**
 * @file src/app/sitemap.ts
 * @description Dynamic Sitemap generator — maximizes Google indexing coverage.
 *              Includes all static pages, game topup pages, and shop products.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://etershop.vercel.app'

  let brands: string[] = []
  let productIds: string[] = []

  try {
    const [distinctBrands, products] = await Promise.all([
      prisma.topupProduct.findMany({
        where: { isActive: true },
        select: { brand: true },
        distinct: ['brand']
      }),
      prisma.product.findMany({
        where: { isPublished: true },
        select: { id: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' }
      })
    ])
    brands = distinctBrands.map(p => p.brand)
    productIds = products.map(p => p.id)
  } catch (error) {
    console.error('[Sitemap] Failed to fetch data:', error)
  }

  // Game/PPOB topup pages
  const gameUrls = brands.map((brand) => ({
    url: `${baseUrl}/topup/${brand.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  // Shop product pages
  const productUrls = productIds.map((id) => ({
    url: `${baseUrl}/product/${id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  // Static pages
  const staticPages = [
    { url: baseUrl, priority: 1.0, changeFrequency: 'always' as const },
    { url: `${baseUrl}/topup`, priority: 0.95, changeFrequency: 'hourly' as const },
    { url: `${baseUrl}/shop`, priority: 0.9, changeFrequency: 'daily' as const },
    { url: `${baseUrl}/topup/track`, priority: 0.7, changeFrequency: 'weekly' as const },
    { url: `${baseUrl}/wishlist`, priority: 0.5, changeFrequency: 'monthly' as const },
    { url: `${baseUrl}/search`, priority: 0.5, changeFrequency: 'monthly' as const },
  ].map(p => ({ ...p, lastModified: new Date() }))

  return [...staticPages, ...gameUrls, ...productUrls]
}
