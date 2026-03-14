'use client'

import { Share2, Check, Link as LinkIcon } from 'lucide-react'
import { useState } from 'react'

export function ShareButton({ title, id }: { title: string; id: string }) {
  const [copied, setCopied] = useState(false)

  const share = async () => {
    const url = `${window.location.origin}/product/${id}`
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
      } catch {}
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      onClick={share}
      className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-cyan-400 border border-cyan-500/10 hover:border-cyan-500/30 bg-[#0c1526] px-4 py-2.5 rounded-xl transition-all"
    >
      {copied ? (
        <><Check className="h-4 w-4 text-emerald-400" /> Link disalin!</>
      ) : (
        <><Share2 className="h-4 w-4" /> Bagikan</>
      )}
    </button>
  )
}
