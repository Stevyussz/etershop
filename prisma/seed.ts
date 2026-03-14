import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()

  const serverCategory = await prisma.category.create({
    data: {
      name: 'Server & Hosting',
      slug: 'server-hosting',
    },
  })

  const designCategory = await prisma.category.create({
    data: {
      name: 'Design & Art',
      slug: 'design-art',
    },
  })

  await prisma.product.createMany({
    data: [
      {
        title: 'Minecraft Server Performance',
        description: 'Super fast AMD Ryzen servers for your Minecraft community.',
        price: 50000,
        categoryId: serverCategory.id,
        isFeatured: true,
        imageUrl: '/logo.jpg',
      },
      {
        title: 'Minecraft Realms Plus',
        description: 'Access to Realms Plus, affordable and fast delivery.',
        price: 35000,
        categoryId: serverCategory.id,
        imageUrl: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      },
      {
        title: 'Epic Custom Minecraft Skin',
        description: 'Get a custom Minecraft skin designed by professionals.',
        price: 20000,
        categoryId: designCategory.id,
        isFeatured: true,
        imageUrl: 'https://images.unsplash.com/photo-1623934199716-e421c7fb8322?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      },
      {
        title: 'YouTube Vector Logo & Banner',
        description: 'High tier logo and banner for your channel.',
        price: 75000,
        categoryId: designCategory.id,
        imageUrl: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      },
    ],
  })

  console.log('Seeded successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
