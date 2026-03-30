import { MetadataRoute } from 'next'

/**
 * @file src/app/robots.ts
 * @description Search Engine Optimization (SEO) Rules for EterShop.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/'],
      },
    ],
    sitemap: 'https://etershop.vercel.app/sitemap.xml',
  }
}
