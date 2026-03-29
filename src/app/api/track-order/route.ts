/**
 * @file src/app/api/track-order/route.ts
 * @description Public API endpoint for customers to track their order status.
 *
 * This endpoint is intentionally minimal — it only returns safe, customer-facing
 * data. It does NOT expose internal fields like `snapToken` or `cost`.
 *
 * Usage: GET /api/track-order?orderId=TRX-1234567890-ABCDEF
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");

    // ── Input Validation ──────────────────────────────────
    if (!orderId) {
      return NextResponse.json(
        { error: "Parameter 'orderId' wajib disertakan. Contoh: ?orderId=TRX-xxx" },
        { status: 400 }
      );
    }

    // Basic format validation — Order IDs should start with "TRX-"
    if (!orderId.startsWith("TRX-")) {
      return NextResponse.json(
        { error: "Format Order ID tidak valid. Order ID harus dimulai dengan 'TRX-'." },
        { status: 400 }
      );
    }

    // ── Database Lookup ───────────────────────────────────
    const transaction = await prisma.topupTransaction.findUnique({
      where: { orderId },
      // Explicitly select only customer-safe fields.
      // NEVER expose: snapToken, cost, id (internal MongoDB ID)
      select: {
        orderId: true,
        gameId: true,
        zoneId: true,
        productName: true,
        price: true,
        status: true,
        digiflazzNote: true, // SN or error message — useful for the customer's "proof of delivery"
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Pesanan tidak ditemukan. Periksa kembali Order ID Anda." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: transaction });

  } catch (error) {
    console.error("[TrackOrder] Unexpected error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan sistem saat melacak pesanan." },
      { status: 500 }
    );
  }
}
