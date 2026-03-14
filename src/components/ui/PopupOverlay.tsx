'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X, ExternalLink } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface PopupOverlayProps {
  imageUrl: string | null
  link: string | null
  active: boolean
}

export function PopupOverlay({ imageUrl, link, active }: PopupOverlayProps) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!active || !imageUrl) return

    // Show popup once per session
    const hasSeenPopup = sessionStorage.getItem('hasSeenPromoPopup')
    if (!hasSeenPopup) {
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, 1500) // Small delay for better UX
      return () => clearTimeout(timer)
    }
  }, [active, imageUrl])

  const closePopup = () => {
    setIsOpen(false)
    sessionStorage.setItem('hasSeenPromoPopup', 'true')
  }

  if (!active || !imageUrl) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closePopup}
            className="absolute inset-0 bg-[#080d18]/80 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-cyan-500/20 bg-[#0c1526] shadow-[0_0_50px_rgba(6,182,212,0.2)]"
          >
            {/* Close Button */}
            <button
              onClick={closePopup}
              className="absolute top-4 right-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition-all border border-white/10"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Image Link */}
            {link ? (
              <Link href={link} target="_blank" onClick={closePopup} className="block group">
                <div className="relative aspect-[4/5] w-full">
                  <Image
                    src={imageUrl}
                    alt="Promo Pengumuman"
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0c1526] via-transparent to-transparent opacity-60" />
                  
                  {/* Action Hint */}
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-cyan-500 text-white font-bold text-sm shadow-xl shadow-cyan-500/20 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                    Lihat Detail <ExternalLink className="h-4 w-4" />
                  </div>
                </div>
              </Link>
            ) : (
              <div className="relative aspect-[4/5] w-full">
                <Image
                  src={imageUrl}
                  alt="Promo Pengumuman"
                  fill
                  className="object-cover"
                />
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
