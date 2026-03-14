import prisma from '@/lib/prisma'
import { createCategory, deleteCategory } from '../actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Trash2, Tags, Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { products: true } } }
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white mb-1 tracking-tight">Manajemen Kategori</h1>
        <p className="text-slate-400">Tambah atau hapus kategori untuk mengelompokkan produk.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {/* Add Form */}
        <div className="col-span-1 rounded-2xl border border-cyan-500/10 bg-[#0c1526] p-6 h-fit">
          <div className="flex items-center gap-2 mb-6">
            <Plus className="h-5 w-5 text-teal-400" />
            <h2 className="text-lg font-bold text-white">Tambah Kategori</h2>
          </div>
          <form action={createCategory} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-slate-300 text-sm font-medium">Nama Kategori</Label>
              <Input id="name" name="name" required placeholder="Contoh: Server Hosting" className="bg-[#080d18] border-cyan-500/20 text-white placeholder:text-slate-600 focus:border-cyan-400 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slug" className="text-slate-300 text-sm font-medium">Slug (URL)</Label>
              <Input id="slug" name="slug" required placeholder="Contoh: server-hosting" className="bg-[#080d18] border-cyan-500/20 text-white placeholder:text-slate-600 focus:border-cyan-400 rounded-xl" />
              <p className="text-xs text-slate-500">Huruf kecil, tanpa spasi, gunakan tanda hubung.</p>
            </div>
            <button type="submit" className="w-full h-11 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 transition-all shadow-lg shadow-cyan-500/20">
              Simpan Kategori
            </button>
          </form>
        </div>

        {/* List */}
        <div className="md:col-span-2 rounded-2xl border border-cyan-500/10 bg-[#0c1526] overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-cyan-500/10">
            <Tags className="h-5 w-5 text-teal-400" />
            <h2 className="font-bold text-white">Daftar Kategori</h2>
            <span className="ml-auto text-xs font-bold text-slate-400 bg-slate-800 px-2 py-1 rounded-full">{categories.length} kategori</span>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-cyan-500/10 hover:bg-transparent">
                  <TableHead className="text-slate-400 font-medium">Nama</TableHead>
                  <TableHead className="text-slate-400 font-medium">Slug</TableHead>
                  <TableHead className="text-slate-400 font-medium">Produk</TableHead>
                  <TableHead className="text-slate-400 font-medium text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-slate-500 py-10">
                      <Tags className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      Belum ada kategori
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((cat: any) => (
                    <TableRow key={cat.id} className="border-cyan-500/10 hover:bg-cyan-500/5 transition-colors">
                      <TableCell className="font-semibold text-slate-200">{cat.name}</TableCell>
                      <TableCell>
                        <code className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">{cat.slug}</code>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-semibold text-emerald-400">{cat._count.products} produk</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <form action={async () => {
                          'use server'
                          await deleteCategory(cat.id)
                        }}>
                          <button type="submit" className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </form>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
}
