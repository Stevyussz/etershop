import prisma from '@/lib/prisma'
import { createProduct, deleteProduct } from '../actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Trash2, Package, Plus, Star, AlertCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ProductsPage() {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({ include: { category: true }, orderBy: { createdAt: 'desc' } }),
    prisma.category.findMany({ orderBy: { name: 'asc' } })
  ])

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white mb-1 tracking-tight">Manajemen Produk</h1>
        <p className="text-slate-400">Tambah, hapus, dan kelola semua produk EterShop.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Add Form */}
        <div className="col-span-1 rounded-2xl border border-cyan-500/10 bg-[#0c1526] p-6 h-fit">
          <div className="flex items-center gap-2 mb-6">
            <Plus className="h-5 w-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">Tambah Produk Baru</h2>
          </div>
          <form action={createProduct} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-slate-300 text-sm font-medium">Nama Produk</Label>
              <Input id="title" name="title" required placeholder="Contoh: Paket VPS Basic" className="bg-[#080d18] border-cyan-500/20 text-white placeholder:text-slate-600 focus:border-cyan-400 rounded-xl" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="categoryId" className="text-slate-300 text-sm font-medium">Kategori</Label>
              <Select name="categoryId" required>
                <SelectTrigger className="bg-[#080d18] border-cyan-500/20 text-white rounded-xl">
                  <SelectValue placeholder="Pilih Kategori" />
                </SelectTrigger>
                <SelectContent className="bg-[#0c1526] border-cyan-500/20 text-white">
                  {categories.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="price" className="text-slate-300 text-sm font-medium">Harga (Rp)</Label>
                <Input id="price" name="price" type="number" required placeholder="50000" className="bg-[#080d18] border-cyan-500/20 text-white placeholder:text-slate-600 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="originalPrice" className="text-slate-300 text-sm font-medium">Harga Coret <span className="text-slate-500">(opsional)</span></Label>
                <Input id="originalPrice" name="originalPrice" type="number" placeholder="75000" className="bg-[#080d18] border-cyan-500/20 text-white placeholder:text-slate-600 rounded-xl" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="stock" className="text-slate-300 text-sm font-medium">Stok <span className="text-slate-500">(-1 = tidak terbatas)</span></Label>
              <Input id="stock" name="stock" type="number" defaultValue="-1" className="bg-[#080d18] border-cyan-500/20 text-white rounded-xl" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="imageUrl" className="text-slate-300 text-sm font-medium">URL Gambar <span className="text-slate-500">(opsional)</span></Label>
              <Input id="imageUrl" name="imageUrl" placeholder="https://..." className="bg-[#080d18] border-cyan-500/20 text-white placeholder:text-slate-600 rounded-xl" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-slate-300 text-sm font-medium">Deskripsi</Label>
              <Textarea id="description" name="description" required placeholder="Deskripsi lengkap produk..." className="bg-[#080d18] border-cyan-500/20 text-white placeholder:text-slate-600 rounded-xl min-h-[100px]" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-cyan-500/10 bg-[#080d18] hover:border-cyan-500/30 transition-colors">
                <input type="checkbox" name="isFeatured" className="h-4 w-4 rounded border-cyan-500/30 bg-[#080d18] accent-cyan-500" />
                <div>
                  <p className="text-sm font-medium text-slate-300">Produk Unggulan</p>
                  <p className="text-xs text-slate-500">Tampil di beranda</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-cyan-500/10 bg-[#080d18] hover:border-cyan-500/30 transition-colors">
                <input type="checkbox" name="isActive" defaultChecked className="h-4 w-4 rounded border-cyan-500/30 bg-[#080d18] accent-cyan-500" />
                <div>
                  <p className="text-sm font-medium text-slate-300">Aktif / Tampil di Toko</p>
                  <p className="text-xs text-slate-500">Hilangkan centang untuk sembunyikan</p>
                </div>
              </label>
            </div>

            <button type="submit" className="w-full h-11 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 transition-all shadow-lg shadow-cyan-500/20 mt-2">
              Simpan Produk
            </button>
          </form>
        </div>

        {/* List */}
        <div className="lg:col-span-2 rounded-2xl border border-cyan-500/10 bg-[#0c1526] overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-cyan-500/10">
            <Package className="h-5 w-5 text-emerald-400" />
            <h2 className="font-bold text-white">Daftar Produk</h2>
            <span className="ml-auto text-xs font-bold text-slate-400 bg-slate-800 px-2 py-1 rounded-full">{products.length} item</span>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-cyan-500/10 hover:bg-transparent">
                  <TableHead className="text-slate-400 font-medium">Produk</TableHead>
                  <TableHead className="text-slate-400 font-medium">Kategori</TableHead>
                  <TableHead className="text-slate-400 font-medium">Harga</TableHead>
                  <TableHead className="text-slate-400 font-medium">Stok</TableHead>
                  <TableHead className="text-slate-400 font-medium text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-500 py-10">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      Belum ada produk
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((p: any) => (
                    <TableRow key={p.id} className={`border-cyan-500/10 transition-colors ${!p.isActive ? 'opacity-50' : 'hover:bg-cyan-500/5'}`}>
                      <TableCell className="font-medium text-slate-200">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={p.isActive ? '' : 'line-through text-slate-500'}>{p.title}</span>
                          {p.isFeatured && <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 flex-shrink-0" />}
                          {!p.isActive && <span className="text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded-full">Nonaktif</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">{p.category.name}</span>
                      </TableCell>
                      <TableCell className="font-semibold text-slate-300">
                        <div>
                          Rp {p.price.toLocaleString('id-ID')}
                          {p.originalPrice && (
                            <div className="text-xs text-slate-500 line-through">Rp {p.originalPrice.toLocaleString('id-ID')}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {p.stock === -1 ? (
                          <span className="text-xs text-emerald-400">Tidak terbatas</span>
                        ) : p.stock === 0 ? (
                          <span className="flex items-center gap-1 text-xs text-red-400"><AlertCircle className="h-3 w-3" />Habis</span>
                        ) : (
                          <span className={`text-xs font-semibold ${p.stock <= 5 ? 'text-orange-400' : 'text-slate-300'}`}>{p.stock} unit</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <form action={async () => {
                          'use server'
                          await deleteProduct(p.id)
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
