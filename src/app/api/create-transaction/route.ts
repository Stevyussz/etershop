/**
 * @file src/app/api/create-transaction/route.ts
 * @description API route for creating a new topup transaction via Midtrans Core API (QRIS).
 *
 * Flow:
 * 1. Validates request body (sku, gameId are required; zoneId is optional).
 * 2. Looks up the product in our database to get the final selling price.
 * 3. Calls Midtrans Core API POST /v2/charge with payment_type: "qris".
 * 4. Records a PENDING transaction in our database.
 * 5. Returns { orderId, qrString, qrImageUrl, expiredAt } to the client.
 *
 * The client renders the QRIS QR code and polls /api/check-payment-status.
 * The actual product delivery happens AFTER payment, via the Midtrans webhook.
 * See: /api/midtrans-webhook/route.ts
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateOrderId } from "@/lib/utils";
import { validateVoucher } from "@/app/admin/vouchers/voucher-actions";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sku, gameId, zoneId, voucherCode } = body;

    // ── Input Validation ──────────────────────────────────
    if (!sku || typeof sku !== "string") {
      return NextResponse.json({ error: "Field 'sku' wajib diisi." }, { status: 400 });
    }
    if (!gameId || typeof gameId !== "string") {
      return NextResponse.json({ error: "Field 'gameId' wajib diisi." }, { status: 400 });
    }

    // ── Product Lookup ────────────────────────────────────
    const [product, settings] = await Promise.all([
      prisma.topupProduct.findUnique({ where: { sku } }),
      prisma.siteSettings.findUnique({ where: { id: "main" } }),
    ]);

    if (!product) {
      return NextResponse.json({ error: "Produk tidak ditemukan. Mungkin sudah tidak tersedia." }, { status: 404 });
    }
    if (!product.isActive) {
      return NextResponse.json({ error: "Produk ini sedang tidak aktif. Silakan pilih produk lain." }, { status: 410 });
    }
    if (product.isGangguan) {
      return NextResponse.json({ error: "Server penyedia sedang gangguan untuk produk ini. Mohon coba produk lain." }, { status: 503 });
    }

    // ── Flash Sale Logic ──────────────────────────────────
    let basePrice = product.price;
    const now = new Date();
    if (
      product.isFlashSale &&
      product.flashSalePrice &&
      settings?.countdownEnd &&
      new Date(settings.countdownEnd) > now
    ) {
      basePrice = product.flashSalePrice;
    }

    // ── Voucher Validation ────────────────────────────────
    let discount = 0;
    let voucherId = null;
    if (voucherCode) {
      const vRes = await validateVoucher(voucherCode, basePrice);
      if (vRes.success) {
        discount = vRes.discount || 0;
        voucherId = vRes.voucherId || null;
      }
    }

    const finalPrice = Math.max(1000, Math.round(basePrice - discount)); // Midtrans QRIS min Rp 1.000

    // ── Payment Gateway: Midtrans Core API QRIS ──────────
    const orderId = generateOrderId();
    const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
    const isProd = process.env.MIDTRANS_IS_PRODUCTION === "true";
    const midtransBaseUrl = isProd
      ? "https://api.midtrans.com/v2/charge"
      : "https://api.sandbox.midtrans.com/v2/charge";

    const authString = Buffer.from(`${serverKey}:`).toString("base64");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://etershop.yusrilastaghina.my.id";

    const chargePayload = {
      payment_type: "qris",
      transaction_details: {
        order_id: orderId,
        gross_amount: finalPrice,
      },
      item_details: [
        {
          id: product.sku,
          price: finalPrice,
          quantity: 1,
          name: product.name.substring(0, 50),
          category: product.brand,
        },
      ],
      qris: {
        acquirer: "gopay", // Gopay acquirer supports widest merchant compatibility
      },
      custom_expiry: {
        expiry_duration: 15,
        unit: "minute",
      },
      notification_url: `${appUrl}/api/midtrans-webhook`,
    };

    const midtransRes = await fetch(midtransBaseUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Basic ${authString}`,
      },
      body: JSON.stringify(chargePayload),
    });

    const midtransData = await midtransRes.json();

    // Any status code other than 200/201 from Midtrans means the charge failed.
    if (!midtransRes.ok || (midtransData.status_code !== "201" && midtransData.status_code !== "200")) {
      const errMsg = midtransData?.error_messages?.join(", ") || midtransData?.status_message || "Unknown error";
      console.error("[CoreAPI] Midtrans charge failed:", JSON.stringify(midtransData));
      return NextResponse.json(
        { error: `Gagal membuat transaksi: ${errMsg}` },
        { status: 400 }
      );
    }

    // Extract QR string and image URL from Midtrans response
    const qrString: string = midtransData.qr_string || "";
    // Midtrans provides a hosted QR image URL inside actions[]
    const generateQrAction = (midtransData.actions as any[] | undefined)?.find(
      (a: any) => a.name === "generate-qr-code"
    );
    const qrImageUrl: string = generateQrAction?.url || "";

    // Calculate expiry time (15 minutes from now, matching custom_expiry above)
    const expiredAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // ── Record Pending Transaction ───────────────────────
    // snapToken field is reused to store the qr_string (plain QR data)
    await prisma.topupTransaction.create({
      data: {
        orderId,
        gameId,
        zoneId: zoneId || null,
        sku: product.sku,
        productName: product.name,
        price: finalPrice,
        cost: product.originalPrice || 0,
        discount,
        voucherId,
        status: "PENDING",
        snapToken: qrString, // Repurposed: stores raw QR string for reference
      },
    });

    console.log(`[CoreAPI] ✅ QRIS transaction created: ${orderId}. QR ready.`);

    return NextResponse.json({
      orderId,
      qrString,
      qrImageUrl,
      expiredAt,
      amount: finalPrice,
    });
  } catch (error) {
    console.error("[CreateTransaction] Unexpected error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal." }, { status: 500 });
  }
}
