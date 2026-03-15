'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Clock } from 'lucide-react'

interface CountdownTimerProps {
  targetDate: string | Date | null
}

export function CountdownTimer({ targetDate }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    if (!targetDate) return

    const target = new Date(targetDate).getTime()

    const calculate = () => {
      const now = new Date().getTime()
      const diff = target - now

      if (diff <= 0) {
        setTimeLeft(null)
        return
      }

      setTimeLeft({
        d: Math.floor(diff / (1000 * 60 * 60 * 24)),
        h: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        s: Math.floor((diff % (1000 * 60)) / 1000),
      })
    }

    calculate()
    const timer = setInterval(calculate, 1000)
    return () => clearInterval(timer)
  }, [targetDate])

  if (!isMounted || !timeLeft) return null

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-2 text-yellow-400 font-black text-sm uppercase tracking-[0.2em] animate-pulse">
        <Clock className="h-4 w-4" /> Flash Sale Berakhir Dalam
      </div>
      
      <div className="flex gap-3 md:gap-4">
        {[
          { label: 'Hari', value: timeLeft.d },
          { label: 'Jam', value: timeLeft.h },
          { label: 'Menit', value: timeLeft.m },
          { label: 'Detik', value: timeLeft.s },
        ].map((unit, i) => (
          <div key={i} className="flex flex-col items-center">
            <motion.div
              key={unit.value}
              initial={{ y: 5, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="flex h-12 w-12 md:h-16 md:w-16 items-center justify-center rounded-2xl bg-[#0c1526] border border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.1)] text-xl md:text-3xl font-black text-white"
            >
              {unit.value.toString().padStart(2, '0')}
            </motion.div>
            <span className="mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {unit.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
