'use client'

import { motion } from 'framer-motion'
import { Moon, Star, Gift, CheckCircle2, ArrowRight, MessageCircle } from 'lucide-react'
import Link from 'next/link'

export function RamadhanSection() {
  const packages = [
    {
      name: 'Starter Website',
      price: 'Rp30.000 – Rp150.000',
      features: ['1 Halaman Utama', 'Desain Clean & Mobile Friendly', 'Revisi sampai 2x', 'Website Siap Dipakai'],
      color: 'border-slate-400/20 bg-slate-500/5',
      icon: '🥉'
    },
    {
      name: 'Pro Website',
      price: 'Rp350.000 – Rp750.000',
      features: ['Hingga 3 Halaman', 'Desain Lebih Profesional', 'Integrasi WA / Sosmed', 'Revisi sampai 4x', 'Support Pasca Project'],
      color: 'border-amber-400/30 bg-amber-500/5 shadow-[0_0_30px_rgba(251,191,36,0.1)]',
      icon: '🥈',
      popular: true
    },
    {
      name: 'Premium Website',
      price: 'Custom Sesuai Kebutuhan',
      features: ['Desain Eksklusif', 'SEO Basic & Optimasi Speed', 'Fitur Custom Sesuai Request', 'Support Prioritas'],
      color: 'border-cyan-400/20 bg-cyan-500/5',
      icon: '🥇'
    }
  ]

  return (
    <section className="relative py-24 overflow-hidden bg-[#080d18] border-t border-amber-500/20">
      {/* Decorative Elements */}
      <div className="absolute top-10 left-10 pointer-events-none opacity-20">
        <Moon className="h-20 w-20 text-amber-400/50" />
      </div>
      <div className="absolute bottom-10 right-10 pointer-events-none opacity-20">
        <Star className="h-16 w-16 text-amber-400/40" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-bold uppercase tracking-widest mb-6"
          >
            🌙 Event Spesial Ramadhan
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight"
          >
            Upgrade Websitemu <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500">
              Makin Pro di Bulan Suci
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed"
          >
            Dapatkan diskon hingga <span className="text-amber-400 font-bold">78%</span> untuk jasa pembuatan website kustom. 
            Bonus konsultasi gratis & prioritas pengerjaan selama Ramadhan!
          </motion.p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-16">
          {packages.map((pkg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative flex flex-col p-8 rounded-3xl border ${pkg.color} group hover:-translate-y-2 transition-all duration-300`}
            >
              {pkg.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg">
                  Terpopuler ⭐
                </div>
              )}
              <div className="text-4xl mb-4">{pkg.icon}</div>
              <h3 className="text-xl font-black text-white mb-1 uppercase tracking-tight">{pkg.name}</h3>
              <div className="text-amber-400 font-black text-lg mb-6">{pkg.price}</div>
              
              <ul className="space-y-3 mb-8 flex-1">
                {pkg.features.map((feat, j) => (
                  <li key={j} className="flex items-start gap-3 text-sm text-slate-400 leading-tight">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    {feat}
                  </li>
                ))}
              </ul>

              <Link
                href="https://wa.me/p/25299306269734091/6285175224481"
                target="_blank"
                className={`flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm transition-all ${
                  pkg.popular 
                  ? 'bg-amber-500 text-[#080d18] hover:bg-amber-400 shadow-[0_10px_20px_-5px_rgba(245,158,11,0.3)]' 
                  : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
                }`}
              >
                Pesan Sekarang <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Bonus Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-wrap items-center justify-center gap-8 md:gap-16 p-8 rounded-3xl bg-amber-500/5 border border-amber-500/10"
        >
          <div className="flex items-center gap-3">
            <Gift className="h-6 w-6 text-amber-400" />
            <div>
              <p className="text-white font-bold text-sm">Gratis Konsultasi</p>
              <p className="text-slate-500 text-xs">Diskusi konsep website impianmu</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MessageCircle className="h-6 w-6 text-amber-400" />
            <div>
              <p className="text-white font-bold text-sm">EterShop Community</p>
              <p className="text-slate-500 text-xs">Diskon tambahan anggota grup</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 flex items-center justify-center rounded-full bg-amber-500/20 text-amber-400 font-bold">78%</div>
            <div>
              <p className="text-white font-bold text-sm">Maksimal Hemat</p>
              <p className="text-slate-500 text-xs">Selama masa promo Ramadhan</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
