/**
 * @file src/app/topup/loading.tsx
 * @description Skeleton loading UI for the Topup Catalog page.
 *              Uses a shimmer pattern to indicate content is being loaded.
 */

export default function TopupLoading() {
  return (
    <div className="min-h-screen bg-[#0a0f16] text-slate-200 pb-32 overflow-hidden">
      {/* ── HERO SLIDER SKELETON ── */}
      <div className="relative w-full h-[40vh] md:h-[55vh] max-h-[600px] bg-[#111823] overflow-hidden">
        <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-[#111823] via-[#1a2535] to-[#111823] bg-[length:200%_100%]" />
        {/* Banner text skeleton */}
        <div className="absolute bottom-0 left-0 w-full p-8 md:p-20 space-y-4">
          <div className="h-5 w-24 rounded-full bg-white/5 animate-pulse" />
          <div className="h-12 md:h-16 w-64 md:w-96 rounded-xl bg-white/5 animate-pulse" />
          <div className="h-4 w-48 md:w-72 rounded-full bg-white/5 animate-pulse" />
        </div>
      </div>

      {/* ── FILTER BAR SKELETON ── */}
      <div className="container mx-auto px-4 max-w-7xl mt-12 mb-12">
        <div className="bg-[#111823]/80 border border-white/5 rounded-3xl p-4 md:p-6 flex flex-col lg:flex-row gap-4 items-center justify-between">
          {/* Category pills skeleton */}
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-10 w-24 rounded-xl bg-white/5 animate-pulse flex-shrink-0"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>
          {/* Search skeleton */}
          <div className="h-12 w-full lg:w-80 rounded-2xl bg-white/5 animate-pulse" />
        </div>
      </div>

      {/* ── CATALOG SKELETON ── */}
      <div className="container mx-auto px-4 max-w-7xl space-y-16">
        {/* 3 category rows */}
        {Array.from({ length: 3 }).map((_, rowIdx) => (
          <div key={rowIdx}>
            {/* Row title */}
            <div className="flex items-center justify-between px-2 mb-6">
              <div className="h-8 w-40 rounded-xl bg-white/5 animate-pulse" />
              <div className="h-5 w-20 rounded-full bg-white/5 animate-pulse" />
            </div>
            {/* Horizontal card row */}
            <div className="flex gap-4 md:gap-6 overflow-hidden">
              {Array.from({ length: 8 }).map((_, cardIdx) => (
                <div
                  key={cardIdx}
                  className="shrink-0 w-[140px] sm:w-[160px] md:w-[200px]"
                  style={{ animationDelay: `${cardIdx * 60}ms` }}
                >
                  <div className="aspect-[3/4] w-full rounded-[1.5rem] md:rounded-[2.5rem] bg-[#111823] animate-pulse relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent animate-shimmer bg-[length:200%_100%]" />
                    {/* Card bottom text skeleton */}
                    <div className="absolute bottom-0 w-full p-4 space-y-2">
                      <div className="h-2 w-16 rounded-full bg-white/10" />
                      <div className="h-4 w-24 rounded-full bg-white/10" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
