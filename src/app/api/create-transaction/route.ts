/**
 * @file src/app/api/create-transaction/route.ts
 * @description API route for creating a new topup transaction.
 *
 * Flow:
 * 1. Validates request body (sku, gameId are required; zoneId is optional).
 * 2. Looks up the product in our database to get the final selling price.
 * 3. Creates a Midtrans Snap transaction to get a payment token.
 * 4. Records a PENDING transaction in our database.
 * 5. Returns the Midtrans token to the client for rendering the payment popup.
 *
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
    const product = await prisma.topupProduct.findUnique({
      where: { sku },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Produk tidak ditemukan. Mungkin sudah tidak tersedia." },
        { status: 404 }
      );
    }

    if (!product.isActive) {
      return NextResponse.json(
        { error: "Produk ini sedang tidak aktif. Silakan pilih produk lain." },
        { status: 410 }
      );
    }
    
    // ── Voucher Validation ────────────────────────────────
    let discount = 0;
    let voucherId = null;
    if (voucherCode) {
      const vRes = await validateVoucher(voucherCode, product.price);
      if (vRes.success) {
        discount = vRes.discount || 0;
        voucherId = vRes.voucherId || null;
      }
    }

    const finalPrice = Math.max(0, product.price - discount);

    // ── Payment Gateway (Midtrans) ────────────────────────
    const orderId = generateOrderId();
    const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
    const isProd = process.env.MIDTRANS_IS_PRODUCTION === "true";
    const midtransBaseUrl = isProd
      ? "https://app.midtrans.com/snap/v1/transactions"
      : "https://app.sandbox.midtrans.com/snap/v1/transactions";

    const authString = Buffer.from(`${serverKey}:`).toString("base64");

    // CRITICAL: notification_url must be hardcoded so Midtrans always calls our webhook,
    // even if the Midtrans dashboard notification URL is not configured.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://etershop.yusrilastaghina.my.id";

    const midtransPayload = {
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
      callbacks: {
        finish: `${appUrl}/topup/success?order_id=${orderId}`,
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
      body: JSON.stringify(midtransPayload),
    });

    if (!midtransRes.ok) {
      const errorBody = await midtransRes.text();
      console.error("[Midtrans] Failed to create transaction:", errorBody);
      return NextResponse.json(
        { error: "Gagal menginisialisasi payment gateway. Coba lagi beberapa saat." },
        { status: 502 }
      );
    }

    const midtransData = await midtransRes.json();

    // ── Record Pending Transaction ───────────────────────
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
        snapToken: midtransData.token,
      },
    });

    return NextResponse.json({
      token: midtransData.token,
      orderId,
    });
  } catch (error) {
    console.error("[CreateTransaction] Unexpected error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal." }, { status: 500 });
  }
}
