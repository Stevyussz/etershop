export default function ShopLoading() {
  return (
    <div className="min-h-[80vh] bg-[#080d18] animate-pulse">
      {/* Page header skeleton */}
      <div className="border-b border-cyan-500/10 bg-[#080d18] py-12 pt-20">
        <div className="container mx-auto px-4 space-y-3">
          <div className="h-3 w-16 rounded-full bg-slate-700" />
          <div className="h-10 w-56 rounded-xl bg-slate-800" />
          <div className="h-4 w-72 rounded-full bg-slate-700" />
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar skeleton */}
          <aside className="w-full md:w-56 flex-shrink-0 space-y-2">
            <div className="h-4 w-28 rounded-full bg-slate-700 mb-4" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 rounded-xl bg-slate-800" />
            ))}
          </aside>

          {/* Grid skeleton */}
          <main className="flex-1">
            <div className="h-4 w-32 rounded-full bg-slate-700 mb-5" />
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-cyan-500/10 bg-[#0c1526] overflow-hidden">
                  <div className="aspect-video bg-slate-800" />
                  <div className="p-5 space-y-3">
                    <div className="h-3 w-20 rounded-full bg-slate-700" />
                    <div className="h-5 w-3/4 rounded-xl bg-slate-700" />
                    <div className="h-3 w-full rounded-full bg-slate-800" />
                    <div className="h-3 w-2/3 rounded-full bg-slate-800" />
                    <div className="pt-4 border-t border-cyan-500/10 flex items-center justify-between">
                      <div className="h-5 w-28 rounded-full bg-slate-700" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
