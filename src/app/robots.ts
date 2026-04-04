import { MetadataRoute } from 'next'

/**
 * @file src/app/robots.ts
 * @description Optimized search engine crawl rules for EterShop.
 *              - Allows all public storefronts.
 *              - Blocks admin, API, checkout & success pages from indexing.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/topup',
          '/topup/',
          '/shop',
          '/product/',
          '/search',
          '/wishlist',
        ],
        disallow: [
          '/api/',
          '/admin/',
          '/topup/success',
          '/topup/*/checkout',
        ],
      },
    ],
    sitemap: 'https://etershop.vercel.app/sitemap.xml',
    host: 'https://etershop.vercel.app',
  }
}
