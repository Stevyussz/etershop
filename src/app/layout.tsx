import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { ScrollToTop } from '@/components/ui/ScrollToTop'
import { PromoBar } from '@/components/ui/PromoBar'
import { PopupOverlay } from '@/components/ui/PopupOverlay'
import prisma from '@/lib/prisma'

const font = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://etershop.vercel.app'), // Replace with actual domain if different
  title: {
    default: 'EterShop | Toko Digital Pelajar & Gamer Terpercaya',
    template: '%s | EterShop'
  },
  description: 'EterShop adalah toko digital high-tier: hosting server Minecraft, skin custom, desain logo, dan pembuatan website profesional. Aman, cepat, dan terpercaya sejak rilis. Harga mulai Rp 10rb!',
  keywords: [
    'etershop', 'toko digital', 'minecraft hosting indonesia', 'jasa desain logo', 
    'jasa pembuatan website', 'skin minecraft custom', 'hosting murah', 'digital shop gamer',
    'etershop minecraft', 'jasa website ramadhan'
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
    title: 'EterShop — Empowering Your Digital World',
    description: 'Solusi kebutuhan digital Anda: Hosting, Desain, dan Website dengan kualitas terbaik dan harga pelajar.',
    url: 'https://etershop.vercel.app',
    siteName: 'EterShop',
    images: [
      {
        url: '/logo.jpg',
        width: 1200,
        height: 630,
        alt: 'EterShop Logo Branding',
      },
    ],
    locale: 'id_ID',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EterShop | Toko Digital Pelajar & Gamer',
    description: 'Hosting Minecraft, Desain Logo, & Jasa Website. Kualitas premium harga minimum.',
    images: ['/logo.jpg'],
  },
  icons: {
    icon: '/logo.jpg',
    apple: '/logo.jpg',
  },
  manifest: '/manifest.json', // We will create this next
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
  category: 'technology',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'main' }
  })

  return (
    <html lang="id" className="dark scroll-smooth">
      <body className={`${font.variable} font-sans bg-[#080d18] text-slate-100 min-h-screen flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200 antialiased`}>
        <PromoBar ramadhanMode={settings?.ramadhanMode} />
        <Navbar />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
        <ScrollToTop />
        <PopupOverlay 
          imageUrl={settings?.popupImageUrl || null} 
          link={settings?.popupLink || null}
          active={settings?.popupActive || false}
        />
      </body>
    </html>
  )
}

