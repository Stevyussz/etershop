'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, CheckCircle2 } from 'lucide-react'

const names = ['Andi', 'Budi', 'Chandra', 'Dika', 'Eko', 'Fajar', 'Gani', 'Hadi', 'Irfan', 'Joko', 'Kevin', 'Lutfi', 'Mamat', 'Novan', 'Oki', 'Putra']
const products = [
  'Hosting Minecraft Pro',
  'Skin Minecraft Custom',
  'Logo Server Minecraft',
  'Website Starter Paket',
  'Website Pro Plan',
  'Hosting VPS Gaming',
  'Jasa Setup Plugin',
  'Website Portfolio'
]

export function LiveSalesToast({ active }: { active: boolean }) {
  const [sale, setSale] = useState<{ name: string; product: string; time: string } | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    if (!active) return

    const showRandomSale = () => {
      const name = names[Math.floor(Math.random() * names.length)]
      const product = products[Math.floor(Math.random() * products.length)]
      const time = 'Baru saja'
      
      setSale({ name, product, time })
      
      // Hide after 5 seconds
      setTimeout(() => setSale(null), 5000)
    }

    // Initial delay
    const initialTimer = setTimeout(showRandomSale, 3000)
    
    // Interval for random popups
    const interval = setInterval(() => {
      if (Math.random() > 0.4) { // 60% chance to show
        showRandomSale()
      }
    }, 15000)

    return () => {
      clearTimeout(initialTimer)
      clearInterval(interval)
    }
  }, [active])

  if (!isMounted || !active) return null

  return (
    <div className="fixed bottom-6 left-6 z-[60] pointer-events-none">
      <AnimatePresence>
        {sale && (
          <motion.div
            initial={{ opacity: 0, x: -50, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="flex items-center gap-4 p-4 rounded-2xl bg-[#0c1526]/90 backdrop-blur-xl border border-cyan-500/20 shadow-[0_10px_40px_rgba(0,0,0,0.5)] max-w-sm"
          >
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/20">
              <ShoppingCart className="h-5 w-5 text-white" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">
                {sale.name} <span className="text-slate-400 font-normal">baru saja memesan</span>
              </p>
              <p className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5 mt-0.5">
                <CheckCircle2 className="h-3 w-3" /> {sale.product}
              </p>
            </div>
            
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter whitespace-nowrap">
              {sale.time}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
