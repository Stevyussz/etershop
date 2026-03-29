import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Clearing existing top-up products to ensure clean seed
  await prisma.topupProduct.deleteMany()

  // Define dummy products
  const products = [
    {
      sku: 'ML5',
      brand: 'MOBILE LEGENDS',
      name: '5 Diamonds',
      price: 2000,
      isActive: true,
    },
    {
      sku: 'ML86',
      brand: 'MOBILE LEGENDS',
      name: '86 Diamonds',
      price: 25000,
      isActive: true,
    },
    {
      sku: 'FF5',
      brand: 'FREE FIRE',
      name: '5 Diamonds',
      price: 1500,
      isActive: true,
    },
    {
      sku: 'FF200',
      brand: 'FREE FIRE',
      name: '200 Diamonds',
      price: 35000,
      isActive: true,
    },
    {
      sku: 'VALORANT300',
      brand: 'VALORANT',
      name: '300 Points',
      price: 50000,
      isActive: true,
    },
    {
      sku: 'VALORANT600',
      brand: 'VALORANT',
      name: '600 Points',
      price: 95000,
      isActive: true,
    }
  ]

  console.log('Inserting dummy products...')
  for (const product of products) {
    await prisma.topupProduct.upsert({
      where: { sku: product.sku },
      update: {},
      create: product,
    })
  }
  console.log('Seeded top-up products successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
