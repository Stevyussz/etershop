'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'

// Categories
export async function createCategory(formData: FormData) {
  const name = formData.get('name') as string
  const slug = formData.get('slug') as string
  await prisma.category.create({ data: { name, slug } })
  revalidatePath('/admin/categories')
  revalidatePath('/shop')
}

export async function deleteCategory(id: string) {
  const products = await prisma.product.count({ where: { categoryId: id } })
  if (products > 0) throw new Error('Cannot delete category with active products')
  await prisma.category.delete({ where: { id } })
  revalidatePath('/admin/categories')
  revalidatePath('/shop')
}

// Products
export async function createProduct(formData: FormData) {
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const price = parseFloat(formData.get('price') as string)
  const originalPriceRaw = formData.get('originalPrice') as string
  const originalPrice = originalPriceRaw ? parseFloat(originalPriceRaw) : null
  const imageUrl = (formData.get('imageUrl') as string) || null
  const isFeatured = formData.get('isFeatured') === 'on'
  const isActive = formData.get('isActive') === 'on'
  const stockRaw = formData.get('stock') as string
  const stock = stockRaw ? parseInt(stockRaw, 10) : -1
  const categoryId = formData.get('categoryId') as string

  await prisma.product.create({
    data: { title, description, price, originalPrice, imageUrl, isFeatured, isActive, stock, categoryId }
  })

  revalidatePath('/admin/products')
  revalidatePath('/shop')
  revalidatePath('/')
}

export async function deleteProduct(id: string) {
  await prisma.product.delete({ where: { id } })
  revalidatePath('/admin/products')
  revalidatePath('/shop')
  revalidatePath('/')
}

export async function updateProductStock(id: string, stock: number) {
  await prisma.product.update({ where: { id }, data: { stock } })
  revalidatePath('/admin/products')
  revalidatePath('/shop')
}

export async function toggleProductActive(id: string, isActive: boolean) {
  await prisma.product.update({ where: { id }, data: { isActive } })
  revalidatePath('/admin/products')
  revalidatePath('/shop')
}
