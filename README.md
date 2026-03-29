# EterShop 🛒⚡

**Platform Top-Up Game & PPOB Modern** — dibangun dengan Next.js 16, MongoDB, Prisma, dan terintegrasi dengan Digiflazz & Midtrans.

> Status: **Alpha v1.2** — Siap deploy ke Vercel/VPS

---

## ✨ Fitur Utama

### Storefront
- 🎮 **Katalog Game** — Grid interaktif dengan search, filter kategori, dan animasi
- 💎 **Checkout Cerdas** — Pemilihan nominal, input ID Game + Zone ID (otomatis sesuai game)
- 💳 **Payment Gateway** — QRIS, GoPay, DANA, ShopeePay, BCA Virtual Account via Midtrans Snap
- 📦 **Lacak Pesanan** — Real-time status dengan Visual Timeline dan tampilkan Serial Number (SN)
- 🎉 **Live Sales Toast** — Notifikasi pembelian simulasi untuk social proof
- ⏳ **Flash Sale Countdown** — Timer hitung mundur yang dapat dikonfigurasi admin
- 🌙 **Ramadhan Mode** — Dekorasi islami yang dapat diaktifkan dari admin

### Admin Dashboard (Backoffice)
- 📊 **Overview** — KPI cards + chart SVG revenue 7 hari + top 5 produk terlaris
- 📋 **Riwayat Transaksi** — Live search, filter status, kolom laba per transaksi, **Ekspor CSV real**
- 📦 **Daftar Produk** — Sinkronisasi Digiflazz, filter brand, kolom margin per produk
- ⚙️ **Pengaturan** — Kelola popup, countdown, Live Sales Toast
- 🔐 **Login Admin** — HttpOnly cookie session, show/hide password, redirect ke halaman asal
- 📱 **Responsive** — Sidebar mobile dengan overlay

---

## 🛠️ Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Database | MongoDB Atlas via Prisma ORM |
| Payment | Midtrans Snap API |
| Supplier | Digiflazz API (Pulsa, Game, PPOB) |
| Styling | Tailwind CSS + Framer Motion |
| Auth | Cookie-based session (HttpOnly) |
| Hosting | Vercel (recommended) |

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/Stevyussz/etershop.git
cd etershop
npm install
```

### 2. Setup Environment Variables
Buat file `.env` dari template:
```bash
cp .env.example .env
```

Isi variabel berikut:
```env
DATABASE_URL="mongodb+srv://..."
DIGIFLAZZ_USERNAME="username_dari_digiflazz"
DIGIFLAZZ_API_KEY="api_key_production_digiflazz"
MIDTRANS_SERVER_KEY="your_midtrans_server_key"
MIDTRANS_CLIENT_KEY="your_midtrans_client_key"
MIDTRANS_IS_PRODUCTION="false"
NEXT_PUBLIC_MIDTRANS_ENV="sandbox"
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY="your_midtrans_client_key"
ADMIN_PASSWORD="GantiDenganPasswordKuat!"
```

### 3. Setup Database
```bash
npx prisma generate
npx prisma db push
```

### 4. Jalankan Development Server
```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) untuk storefront.  
Buka [http://localhost:3000/admin](http://localhost:3000/admin) untuk backoffice.

---

## 📂 Struktur Proyek Penting

```
src/
├── app/
│   ├── admin/              # Admin Dashboard pages
│   │   ├── page.tsx        # Overview + chart + top products
│   │   ├── transactions/   # Riwayat transaksi + CSV export
│   │   ├── products/       # Manajemen produk Digiflazz
│   │   ├── settings/       # Pengaturan situs
│   │   └── login/          # Halaman login admin
│   ├── api/
│   │   ├── admin/auth/     # POST (login) + DELETE (logout)
│   │   ├── create-transaction/  # Buat transaksi Midtrans
│   │   ├── midtrans-webhook/    # Proses pembayaran → kirim ke Digiflazz
│   │   └── track-order/         # Lacak status pesanan
│   └── topup/
│       ├── page.tsx         # Katalog game (ISR 60s)
│       ├── [game]/          # Halaman checkout per game
│       ├── track/           # Lacak pesanan pelanggan
│       └── success/         # Halaman hasil transaksi
├── lib/
│   ├── utils.ts            # 🎯 Semua utility functions (formatRupiah, slugify, dll)
│   ├── digiflazz.ts        # Digiflazz API client (balance, price list, topup + retry)
│   └── prisma.ts           # Prisma singleton client
└── proxy.ts                # Middleware proteksi route /admin/*
```

---

## 🔁 Alur Transaksi

```
Pelanggan pilih nominal
  → POST /api/create-transaction (buat transaksi Midtrans, simpan PENDING)
  → Midtrans Snap popup (pembayaran)
  → POST /api/midtrans-webhook (konfirmasi dari Midtrans)
     → Verify signature SHA-512
     → Idempotency check
     → executeDigiflazzTopup (retry 3×)
     → Update status SUCCESS/FAILED + simpan SN
  → Pelanggan di-redirect ke /topup/success (menampilkan SN)
```

---

## 🔒 Keamanan

- Middleware `proxy.ts` melindungi semua route `/admin/*` dan `/api/admin/*`
- Session cookie `HttpOnly` + `Secure` (HTTPS di production)
- Setiap webhook Midtrans diverifikasi dengan SHA-512 signature
- Tidak ada field sensitif (`snapToken`, `cost`) yang di-expose ke client
- Input validation di semua Server Actions

---

## 📡 Sinkronisasi Produk

1. Login ke Admin → **Daftar Produk**
2. Klik **"Tarik Data Digiflazz"**
3. Sistem akan fetch semua produk game dari Digiflazz dan upsert ke database
4. Harga jual dihitung otomatis dengan strategi margin:
   - Modal < Rp 50.000 → **+Rp 2.000**
   - Modal ≥ Rp 50.000 → **+5%**

---

## 🚢 Deployment (Vercel)

1. Push ke GitHub (repo ini)
2. Import project di [vercel.com](https://vercel.com)
3. Tambahkan semua Environment Variables dari `.env`
4. Set `MIDTRANS_IS_PRODUCTION=true` dan `NEXT_PUBLIC_MIDTRANS_ENV=production`
5. Deploy — Selesai!

> **Webhook Midtrans**: Set URL notifikasi ke `https://domainanda.com/api/midtrans-webhook`

---

## 📌 Roadmap

- [ ] WhatsApp/Email notifikasi otomatis saat transaksi sukses
- [ ] Ekspansi PPOB: Pulsa, Paket Data, Token Listrik
- [ ] Edit margin keuntungan per produk dari Admin Dashboard
- [ ] Pagination transaksi untuk data volume besar
- [ ] PWA support

---

Made with ❤️ by **Stevyussz**