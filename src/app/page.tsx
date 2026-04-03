import Link from 'next/link'
import Image from 'next/image'
import prisma from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import {
  ShoppingCart, Server, Palette, Layers, ArrowRight,
  ShieldCheck, Zap, MessageCircle, Star, Users, Clock,
  Gamepad2, Smartphone, Wallet
} from 'lucide-react'
import { RamadhanSection } from '@/components/home/RamadhanSection'
import { CountdownTimer } from '@/components/ui/CountdownTimer'

export const revalidate = 60

export default async function Home() {
  let settings = null;
  let featuredProducts: any[] = [];
  try {
    settings = await prisma.siteSettings.findUnique({
      where: { id: 'main' }
    });
    featuredProducts = await prisma.product.findMany({
      where: { isFeatured: true },
      include: { category: true },
      take: 6,
    });
  } catch {
    // DB unavailable during static prerender — safe to ignore
  }

  const stats = [
    { icon: ShieldCheck, label: 'Garansi & Aman', color: 'text-emerald-400' },
    { icon: Zap, label: '470+ Order Sukses', color: 'text-cyan-400' },
    { icon: MessageCircle, label: 'Support Aktif 24/7', color: 'text-teal-400' },
    { icon: Star, label: 'Rated 4.9/5', color: 'text-yellow-400' },
  ]

  const features = [
    {
      title: 'Server Hosting',
      desc: 'Performa Ryzen tinggi dan uptime 99.9% untuk server Minecraft dan game lainnya.',
      icon: Server,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
      glow: 'group-hover:shadow-cyan-500/20',
    },
    {
      title: 'Karya Desain',
      desc: 'Logo kustom, banner YouTube, skin Minecraft, dan identitas visual yang berkesan.',
      icon: Palette,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      glow: 'group-hover:shadow-emerald-500/20',
    },
    {
      title: 'Pembuatan Website',
      desc: 'Landing page dan e-commerce modern yang cepat, responsif, dan ramah SEO.',
      icon: Layers,
      color: 'text-teal-400',
      bg: 'bg-teal-500/10',
      border: 'border-teal-500/20',
      glow: 'group-hover:shadow-teal-500/20',
    },
  ]

  const testimonials = [
    { name: 'Ahmad R.', role: 'Server Admin', text: 'Server Minecraft saya sekarang jauh lebih stabil. Support-nya juga cepat banget!', rating: 5 },
    { name: 'Dini P.', role: 'Content Creator', text: 'Desain banner dari Etershop keren banget, banyak yang nanya siapa yang bikin.', rating: 5 },
    { name: 'Budi S.', role: 'Pelajar', text: 'Harganya murah terjangkau tapi kualitasnya gak main-main. Recommended!', rating: 5 },
  ]

  return (
    <div className="min-h-screen bg-[#080d18]">
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'OnlineStore',
            name: 'EterShop',
            description: 'Toko Digital Pelajar & Gamer Terpercaya',
            url: 'https://etershop.vercel.app',
            logo: 'https://etershop.vercel.app/logo.jpg',
            sameAs: [
              'https://dsc.gg/etershop',
              'https://wa.me/6285175224481'
            ],
            potentialAction: {
              '@type': 'SearchAction',
              target: 'https://etershop.vercel.app/search?q={search_term_string}',
              'query-input': 'required name=search_term_string'
            }
          })
        }}
      />
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-[#080d18] pb-20 pt-12 md:pt-20">
        {/* Grid overlay - softened */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#06b6d405_1px,transparent_1px),linear-gradient(to_bottom,#06b6d405_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,#000_40%,transparent_100%)]" />
        
        {/* Glow blobs - more natural/organic blend */}
        <div className="pointer-events-none absolute -top-40 -left-20 h-[600px] w-[600px] rounded-full bg-cyan-600/10 blur-[130px]" />
        <div className="pointer-events-none absolute top-1/4 -right-10 h-[500px] w-[500px] rounded-full bg-emerald-600/5 blur-[120px]" />

        <div className="container relative z-10 mx-auto px-4 text-center">
          <Badge variant="outline" className="mb-6 inline-flex items-center gap-2 border-cyan-500/20 bg-cyan-500/5 text-cyan-400 backdrop-blur-sm px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full">
            <Zap className="h-3 w-3" />
            Promo Spesial Pelajar & Gamer
          </Badge>

          <h1 className="mx-auto max-w-5xl text-5xl font-extrabold tracking-tight text-white sm:text-7xl lg:text-[5.5rem] leading-[1.08]">
            Your Premium{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400">
              Digital Hub
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base text-slate-400 md:text-lg leading-relaxed px-4">
            Solusi terlengkap untuk Top Up Games Instan, PPOB, Server Minecraft, dan Jasa Kreatif. Kualitas bintang lima dengan harga ramah kantong pelajar.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/shop"
              className="inline-flex items-center justify-center gap-2 h-14 px-10 rounded-full font-bold text-base text-white bg-gradient-to-r from-cyan-500 to-emerald-500 shadow-[0_10px_30px_-10px_rgba(6,182,212,0.5)] hover:shadow-[0_20px_40px_-10px_rgba(6,182,212,0.6)] hover:-translate-y-0.5 active:scale-95 transition-all"
            >
              Mulai Belanja <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="https://dsc.gg/etershop"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 h-14 px-10 rounded-full font-semibold text-base text-white border border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10 hover:-translate-y-0.5 transition-all"
            >
              <Users className="h-5 w-5" /> Komunitas Discord
            </Link>
          </div>

          {/* ── Countdown Timer ── */}
          {settings?.countdownEnd && (
            <div className="mt-16">
              <CountdownTimer targetDate={settings.countdownEnd} />
            </div>
          )}

          {/* Trust bar */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-6 md:gap-16 border-t border-white/5 pt-10">
            {stats.map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-widest text-slate-500">
                <Icon className={`h-4 w-4 ${color}`} />
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* ── PPOB & TOPUP BRANDING ── */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#080d18] via-cyan-950/10 to-[#080d18]" />
        <div className="container relative z-10 mx-auto px-4">
          <div className="mb-16 text-center">
            <Badge variant="outline" className="mb-4 border-emerald-500/20 bg-emerald-500/5 text-emerald-400 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
              Layanan PPOB & Top Up
            </Badge>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">Kebutuhan Digital <span className="text-cyan-400">Serba Instan</span></h2>
            <p className="mt-4 text-slate-400 text-lg max-w-2xl mx-auto">
              Proses otomatis 24 jam dengan harga termurah. Saldo masuk dalam hitungan detik setelah pembayaran berhasil.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            {[
              { 
                title: "Top Up Game", 
                desc: "Diamond, UC, & Gems", 
                icon: Gamepad2, 
                color: "from-blue-500 to-indigo-600",
                shadow: "shadow-blue-500/20"
              },
              { 
                title: "Pulsa & Data", 
                desc: "Seluruh Operator", 
                icon: Smartphone, 
                color: "from-rose-500 to-orange-500",
                shadow: "shadow-rose-500/20"
              },
              { 
                title: "Token PLN", 
                desc: "Listrik 24 Jam", 
                icon: Zap, 
                color: "from-yellow-500 to-amber-600",
                shadow: "shadow-yellow-500/20"
              },
              { 
                title: "E-Wallet", 
                desc: "Top Up Saldo Instan", 
                icon: Wallet, 
                color: "from-emerald-500 to-teal-600",
                shadow: "shadow-emerald-500/20"
              }
            ].map((item, idx) => (
              <Link 
                key={idx} 
                href="/topup"
                className={`group relative p-8 rounded-[2.5rem] bg-[#0c1526] border border-white/5 overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:border-white/10 ${item.shadow} hover:shadow-2xl`}
              >
                <div className={`absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br ${item.color} opacity-10 group-hover:opacity-20 blur-2xl transition-opacity animate-pulse`} />
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white mb-6 shadow-lg rotate-3 group-hover:rotate-0 transition-transform duration-500`}>
                  <item.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-white mb-2">{item.title}</h3>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">{item.desc}</p>
                <div className="mt-6 flex items-center gap-2 text-xs font-black text-white/40 group-hover:text-white transition-colors uppercase tracking-widest">
                  Mulai Sekarang <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 bg-[#080d18] border-t border-cyan-500/10">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-cyan-500 mb-3">Layanan Kami</p>
            <h2 className="text-3xl font-extrabold text-white md:text-4xl tracking-tight">
              Keahlian & Layanan Digital
            </h2>
            <p className="mt-4 text-slate-400 text-lg max-w-xl mx-auto">
              Semua yang kamu butuhkan untuk membangun kehadiran digital yang kuat, tersedia di sini.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {features.map((feat, i) => (
              <div
                key={i}
                className={`group relative rounded-2xl border ${feat.border} bg-[#0c1526] p-8 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${feat.glow}`}
              >
                <div className={`absolute top-0 right-0 -mr-10 -mt-10 h-40 w-40 rounded-full ${feat.bg} blur-3xl opacity-50 group-hover:opacity-100 transition-opacity`} />
                <div className={`relative mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl ${feat.bg}`}>
                  <feat.icon className={`h-7 w-7 ${feat.color}`} />
                </div>
                <h3 className="mb-3 text-xl font-bold text-white">{feat.title}</h3>
                <p className="text-slate-400 leading-relaxed text-sm">{feat.desc}</p>
                <div className={`mt-6 flex items-center gap-1.5 text-sm font-semibold ${feat.color}`}>
                  <ArrowRight className="h-4 w-4" /> Lihat produk
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Ramadhan Special ── */}
      {settings?.ramadhanMode && <RamadhanSection />}

      {/* ── Featured Products ── */}
      <section className="py-24 bg-[#060b15] border-t border-cyan-500/10">
        <div className="container mx-auto px-4">
          <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-cyan-500 mb-3">Pilihan Terbaik</p>
              <h2 className="text-3xl font-extrabold text-white md:text-4xl tracking-tight">Produk Unggulan</h2>
              <p className="mt-3 text-slate-400 text-lg">Pilihan favorit paling populer dari pelanggan EterShop.</p>
            </div>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-400 border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 px-5 py-2.5 rounded-full transition-all self-start md:self-auto flex-shrink-0"
            >
              Semua Produk <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {featuredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 rounded-2xl border border-cyan-500/10 bg-[#0c1526] text-slate-400">
              <ShoppingCart className="h-12 w-12 mb-4 opacity-40" />
              <p>Belum ada produk unggulan.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featuredProducts.map((product: any) => (
                <Link
                  href={`/product/${product.id}`}
                  key={product.id}
                  className="group flex flex-col rounded-2xl border border-cyan-500/10 bg-[#0c1526] overflow-hidden hover:border-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-500/10 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-slate-800">
                    {product.imageUrl ? (
                      <Image src={product.imageUrl} alt={product.title} fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-800">
                        <ShoppingCart className="h-10 w-10 text-slate-600" />
                      </div>
                    )}
                    {product.isFeatured && (
                      <div className="absolute top-3 left-3">
                        <span className="inline-flex items-center gap-1 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">
                          <Star className="h-3 w-3" /> Premium
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0c1526] via-transparent to-transparent opacity-80" />
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <span className="text-xs text-cyan-400 font-bold tracking-widest uppercase mb-2">{product.category.name}</span>
                    <h3 className="font-bold text-lg text-white mb-2 line-clamp-2 leading-tight">{product.title}</h3>
                    <p className="text-slate-400 text-sm mb-5 line-clamp-2 leading-relaxed flex-1">{product.description}</p>
                    <div className="flex items-center justify-between pt-4 border-t border-cyan-500/10">
                      <span className="font-extrabold text-lg text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
                        Rp {product.price.toLocaleString('id-ID')}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-bold text-cyan-400 bg-cyan-500/10 px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        Lihat <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-24 bg-[#080d18] border-t border-cyan-500/10">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-cyan-500 mb-3">Testimoni</p>
            <h2 className="text-3xl font-extrabold text-white md:text-4xl tracking-tight">Kata Pelanggan Kami</h2>
            <p className="mt-4 text-slate-400 text-lg">Bergabung dengan ratusan pelanggan yang sudah merasakan manfaatnya.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <div key={i} className="rounded-2xl border border-cyan-500/10 bg-[#0c1526] p-6 flex flex-col gap-4">
                <div className="flex items-center gap-1">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed italic">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3 mt-auto pt-4 border-t border-cyan-500/10">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{t.name}</p>
                    <p className="text-slate-500 text-xs">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-20 bg-[#060b15] border-t border-cyan-500/10">
        <div className="container mx-auto px-4 text-center">
          <div className="relative rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-[#0c1526] to-[#081018] p-12 overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-emerald-500/5" />
            <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />

            <Clock className="mx-auto h-10 w-10 text-cyan-400 mb-6" />
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4 tracking-tight">Siap Mulai Sekarang?</h2>
            <p className="text-slate-400 text-lg mb-8 max-w-xl mx-auto">
              Jangan tunda lagi! Mulai perjalanan digitalmu bersama EterShop dan rasakan perbedaannya.
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center justify-center gap-2 h-14 px-10 rounded-full font-bold text-base text-white bg-gradient-to-r from-cyan-500 to-emerald-500 shadow-[0_0_40px_rgba(6,182,212,0.3)] hover:shadow-[0_0_60px_rgba(6,182,212,0.5)] hover:scale-105 transition-all"
            >
              Mulai Belanja <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
