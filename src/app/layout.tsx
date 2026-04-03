import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import ConditionalLayout from '@/components/layout/ConditionalLayout'
import prisma from '@/lib/prisma'

const font = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://etershop.vercel.app'),
  title: {
    default: 'EterShop | Teraman, Termurah Se-Isekai',
    template: '%s | EterShop'
  },
  description: 'EterShop adalah platform digital termurah se-isekai: Diamond FF, ML, Voucher Game, dan PPOB Instan 1 detik. Terpercaya, aman, dan bergaransi.',
  keywords: [
    'etershop', 'topup game termurah', 'topup game isekai', 'diamond ff termurah', 
    'diamond ml termurah', 'token pln murah', 'pulsa murah 24 jam', 'topup game instan'
  ],
  authors: [{ name: 'EterShop Team' }],
  creator: 'EterShop',
  publisher: 'EterShop',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: 'EterShop — Teraman, Termurah Se-Isekai',
    description: 'Topup Game & PPOB Tercepat dengan harga paling miring se-jagad raya. Proses otomatis 1 detik 24 jam.',
    url: 'https://etershop.vercel.app',
    siteName: 'EterShop',
    images: [{ url: '/logo.jpg', width: 1200, height: 630, alt: 'EterShop Branding' }],
    locale: 'id_ID',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EterShop | Teraman, Termurah Se-Isekai',
    description: 'Beli Diamond/Voucher Game termurah dan tercepat hanya di EterShop.',
    images: ['/logo.jpg'],
  },
  icons: {
    icon: '/logo.jpg',
    shortcut: '/logo.jpg',
    apple: '/logo.jpg',
  },
  manifest: '/manifest.json',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://etershop.vercel.app',
  },
  category: 'technology',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Graceful fallback: if DATABASE_URL is not set (e.g. during Vercel build prerender),
  // return null settings so the layout still renders without crashing.
  let settings = null;
  try {
    settings = await prisma.siteSettings.findUnique({
      where: { id: 'main' }
    });
  } catch {
    // DB unavailable during static prerender — safe to ignore, defaults will be used
  }

  return (
    <html lang="id" className="dark scroll-smooth">
      <body className={`${font.variable} font-sans bg-[#080d18] text-slate-100 min-h-screen flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200 antialiased`}>
         <ConditionalLayout settings={settings}>
            {children}
         </ConditionalLayout>
      </body>
    </html>
  )
}
