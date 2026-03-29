import { PrismaClient } from "@prisma/client";
import * as crypto from "crypto";

// Use an independent Prisma Client for the script
const prisma = new PrismaClient();

const DIGIFLAZZ_USERNAME = process.env.DIGIFLAZZ_USERNAME || "";
const DIGIFLAZZ_API_KEY = process.env.DIGIFLAZZ_API_KEY || "";
const DIGIFLAZZ_PRICELIST_URL = "https://api.digiflazz.com/v1/price-list";

// --- KONFIGURASI MARGIN KEUNTUNGAN --- //
function calculateSellingPrice(originalPrice: number): number {
  // Jika harga modal < 50rb, untung fix Rp 2.000
  // Jika harga modal >= 50rb, untung 5% dari modal (pembulatan ke atas kelipatan 100)
  let margin = 0;
  if (originalPrice < 50000) {
    margin = 2000;
  } else {
    margin = Math.ceil((originalPrice * 0.05) / 100) * 100; // 5% profit
  }

  return originalPrice + margin;
}

// Omit function for console logging safely
const censorApiKey = (key: string) => key.substring(0, 4) + "****" + key.substring(key.length - 4);

async function syncDigiflazz() {
  console.log("-----------------------------------------");
  console.log("Memulai Sinkronisasi Produk Digiflazz...");
  console.log("Username :", DIGIFLAZZ_USERNAME);
  console.log("API Key  :", censorApiKey(DIGIFLAZZ_API_KEY));
  console.log("-----------------------------------------");

  if (!DIGIFLAZZ_USERNAME || !DIGIFLAZZ_API_KEY) {
    console.error("ERROR: Username atau API Key belum diatur di .env");
    process.exit(1);
  }

  const sign = crypto
    .createHash('md5')
    .update(DIGIFLAZZ_USERNAME + DIGIFLAZZ_API_KEY + "pricelist")
    .digest('hex');

  const payload = {
    cmd: "prepaid",
    username: DIGIFLAZZ_USERNAME,
    sign: sign,
  };

  try {
    console.log("Mengambil data dari API Digiflazz...");
    const response = await fetch(DIGIFLAZZ_PRICELIST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const body = await response.json();
    if (!response.ok || !body.data) {
      throw new Error("Gagal mengambil respon dari Digiflazz: " + JSON.stringify(body));
    }

    const allProducts = body.data;
    console.log(`Ditemukan total ${allProducts.length} produk mentah dari Digiflazz.`);

    // 1. FILTER: Hanya kategori Games dan yang sedang Aktif
    const games = allProducts.filter(
      (p: any) => p.category === "Games" && p.seller_product_status === true
    );
    console.log(`Terfilter ${games.length} produk Games aktif. Memulai kalkulasi margin...`);

    // 2. BUILD UPSERT OPERATIONS
    const upsertOperations = games.map((p: any) => {
      const originalPrice = p.price;
      const sellingPrice = calculateSellingPrice(originalPrice);

      return prisma.topupProduct.upsert({
        where: { sku: p.buyer_sku_code },
        update: {
          name: p.product_name,
          brand: p.brand,
          category: p.category,
          type: p.type,
          originalPrice: originalPrice,
          price: sellingPrice,
          isActive: true
        },
        create: {
          sku: p.buyer_sku_code,
          name: p.product_name,
          brand: p.brand,
          category: p.category,
          type: p.type,
          originalPrice: originalPrice,
          price: sellingPrice,
          isActive: true
        }
      });
    });

    // 3. JALANKAN SECARA BATCH (Menghindari timeout / memory leak)
    console.log("Menyimpan ke MongoDB Database (Batching processing...)");
    const chunkSize = 200;
    let syncedCount = 0;

    for (let i = 0; i < upsertOperations.length; i += chunkSize) {
      const chunk = upsertOperations.slice(i, i + chunkSize);
      await prisma.$transaction(chunk);
      syncedCount += chunk.length;
      console.log(`Progress: ${syncedCount} / ${upsertOperations.length} produk tersimpan.`);
    }

    // 4. CLEANUP (Optional): Matikan produk di DB yang sudah tidak ada di Digiflazz
    const activeSkus = games.map((p: any) => p.buyer_sku_code);
    const deactivatedInfo = await prisma.topupProduct.updateMany({
      where: {
        category: "Games",
        sku: { notIn: activeSkus }
      },
      data: { isActive: false }
    });

    console.log("-----------------------------------------");
    console.log("SINKRONISASI SELESAI! ✅");
    console.log("Total produk diperbarui / ditambahkan :", syncedCount);
    console.log("Total produk gagal/dinonaktifkan otomatis :", deactivatedInfo.count);
    console.log("-----------------------------------------");
    
  } catch (error) {
    console.error("ERROR SINKRONISASI:", error);
  } finally {
    await prisma.$disconnect();
  }
}

syncDigiflazz();
