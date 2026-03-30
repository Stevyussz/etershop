/**
 * @file src/app/admin/categories/page.tsx
 * @description Admin Categories Management Page.
 *
 * Allows the admin to create and delete product categories.
 * Categories group general (non-topup) products in the storefront.
 *
 * NOTE: Topup game products are NOT grouped by categories — they use
 * the "brand" field from Digiflazz directly. Categories here apply
 * to physical/digital products in the general shop section.
 */

import prisma from "@/lib/prisma";
import { createCategory, deleteCategory } from "../actions";
import { Tags, Plus, Trash2, FolderOpen, Hash } from "lucide-react";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  let categories: any[] = [];
  try {
    categories = await prisma.category.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { products: true } } },
    });
  } catch {
    // DB unavailable
  }

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="flex items-center gap-4 mb-8">
        <div className="h-12 w-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
          <Tags className="h-6 w-6 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">Manajemen Kategori</h1>
          <p className="text-slate-400 text-sm">
            Kelola kategori untuk mengelompokkan produk di halaman Shop.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Add Category Form ── */}
        <div className="lg:col-span-1">
          <div className="bg-[#111823] border border-white/5 rounded-3xl p-6 shadow-xl sticky top-6">
            <div className="flex items-center gap-2 mb-5">
              <Plus className="h-5 w-5 text-blue-400" />
              <h2 className="text-base font-bold text-white">Tambah Kategori</h2>
            </div>

            <form action={createCategory} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="name" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Nama Kategori
                </label>
                <input
                  id="name"
                  name="name"
                  required
                  placeholder="Cth: Server Hosting"
                  className="w-full bg-[#0a0f16] border border-white/10 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-slate-600"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="slug" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Slug (URL)
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    id="slug"
                    name="slug"
                    required
                    placeholder="server-hosting"
                    className="w-full bg-[#0a0f16] border border-white/10 text-white pl-9 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all font-mono placeholder:text-slate-600 placeholder:font-sans"
                  />
                </div>
                <p className="text-xs text-slate-500">Huruf kecil, angka, dan tanda hubung saja.</p>
              </div>

              <button
                type="submit"
                className="w-full h-11 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-500 hover:shadow-[0_8px_20px_rgba(37,99,235,0.4)] hover:-translate-y-0.5 transition-all active:scale-95"
              >
                + Simpan Kategori
              </button>
            </form>
          </div>
        </div>

        {/* ── Categories List ── */}
        <div className="lg:col-span-2">
          <div className="bg-[#111823] border border-white/5 rounded-3xl overflow-hidden shadow-xl">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5">
              <FolderOpen className="h-5 w-5 text-slate-400" />
              <h2 className="font-bold text-white">Daftar Kategori</h2>
              <span className="ml-auto text-xs font-bold text-slate-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                {categories.length} kategori
              </span>
            </div>

            {/* List */}
            {categories.length === 0 ? (
              <div className="py-16 text-center">
                <Tags className="h-10 w-10 mx-auto mb-3 text-slate-700" />
                <p className="font-bold text-white">Belum ada kategori</p>
                <p className="text-slate-500 text-sm mt-1">Tambah kategori pertama menggunakan form di sebelah kiri.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {categories.map((cat: any) => (
                  <div
                    key={cat.id}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.03] transition-colors group"
                  >
                    {/* Icon */}
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                      <Tags className="h-4 w-4 text-purple-400" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm leading-tight">{cat.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-[10px] text-slate-400 bg-black/30 border border-white/5 px-2 py-0.5 rounded-md font-mono">
                          /{cat.slug}
                        </code>
                        <span className="text-xs text-blue-400 font-semibold">
                          {cat._count.products} produk
                        </span>
                      </div>
                    </div>

                    {/* Date */}
                    <span className="text-xs text-slate-600 hidden sm:block shrink-0">
                      {formatDate(cat.createdAt)}
                    </span>

                    {/* Delete — server action form */}
                    <form
                      action={async () => {
                        "use server";
                        await deleteCategory(cat.id);
                      }}
                    >
                      <button
                        type="submit"
                        title={cat._count.products > 0 ? "Tidak bisa hapus: masih ada produk" : "Hapus Kategori"}
                        disabled={cat._count.products > 0}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Note */}
          <p className="text-xs text-slate-600 mt-4 px-2">
            Kategori dengan produk aktif tidak dapat dihapus. Pindahkan atau hapus produknya terlebih dahulu.
          </p>
        </div>
      </div>
    </div>
  );
}
