import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { ScrollToTop } from '@/components/ui/ScrollToTop'
import { PromoBar } from '@/components/ui/PromoBar'

const font = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'EterShop | Toko Digital Pelajar & Gamer',
  description: 'Toko digital terpercaya: hosting server Minecraft, skin custom, desain logo, dan pembuatan website. Diskon hingga 44% — harga mulai Rp 10.000.',
  keywords: ['etershop', 'toko digital', 'minecraft hosting', 'skin minecraft', 'desain logo', 'pembuatan website'],
  openGraph: {
    title: 'EterShop — Toko Digital Pelajar & Gamer',
    description: 'Produk digital berkualitas tinggi dengan harga terjangkau. Garansi & support aktif.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="dark scroll-smooth">
      <body className={`${font.variable} font-sans bg-[#080d18] text-slate-100 min-h-screen flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200 antialiased`}>
        <PromoBar />
        <Navbar />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
        <ScrollToTop />
      </body>
    </html>
  )
}

