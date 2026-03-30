import { MetadataRoute } from 'next'
import prisma from '@/lib/prisma'

/**
 * @file src/app/sitemap.ts
 * @description Dynamic Sitemap generator for Top Global SEO.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://etershop.vercel.app'

  // Fetch all unique game brands from the DB
  let brands: string[] = []
  try {
    const distinctBrands = await prisma.topupProduct.findMany({
      where: { isActive: true },
      select: { brand: true },
      distinct: ['brand']
    })
    brands = distinctBrands.map(p => p.brand)
  } catch (error) {
    console.error('[Sitemap] Failed to fetch brands:', error)
  }

  const gameUrls = brands.map((brand) => {
    const slug = brand.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    return {
      url: `${baseUrl}/topup/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }
  })

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'always' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/topup`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    ...gameUrls,
  ]
}
