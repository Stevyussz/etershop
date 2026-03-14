export default function ProductLoading() {
  return (
    <div className="min-h-screen bg-[#080d18] animate-pulse">
      <div className="container mx-auto px-4 py-20 md:py-28">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-10">
          {[80, 20, 64, 20, 96, 20, 140].map((w, i) => (
            <div key={i} className={`h-3 w-${w < 30 ? '4' : `[${w}px]`} rounded-full bg-slate-700`} style={{ width: w }} />
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
          {/* Image */}
          <div className="w-full lg:w-1/2">
            <div className="aspect-[4/3] rounded-2xl bg-slate-800" />
            <div className="mt-5 h-3 w-32 rounded-full bg-slate-700" />
          </div>

          {/* Info */}
          <div className="w-full lg:w-1/2 flex flex-col gap-4">
            <div className="h-6 w-24 rounded-full bg-slate-800" />
            <div className="h-12 w-4/5 rounded-xl bg-slate-700" />
            <div className="h-10 w-44 rounded-xl bg-slate-800" />
            <div className="space-y-2">
              <div className="h-3 w-full rounded-full bg-slate-800" />
              <div className="h-3 w-5/6 rounded-full bg-slate-800" />
              <div className="h-3 w-3/4 rounded-full bg-slate-800" />
            </div>
            <div className="grid grid-cols-3 gap-3 mt-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-slate-800" />
              ))}
            </div>
            <div className="h-14 rounded-xl bg-slate-700 mt-4" />
          </div>
        </div>
      </div>
    </div>
  )
}
