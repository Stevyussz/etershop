/**
 * @file src/app/api/admin/auth/route.ts
 * @description Admin authentication API.
 *
 * POST /api/admin/auth — Login: validates password, sets HttpOnly session cookie.
 * DELETE /api/admin/auth — Logout: clears the session cookie.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "admin_session";

/** POST — Login */
export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "Password wajib diisi." }, { status: 400 });
    }

    const secretPassword = process.env.ADMIN_PASSWORD || "Etershop123!";

    if (password !== secretPassword) {
      // Log failed attempts with IP for future rate-limiting implementation
      const ip = req.headers.get("x-forwarded-for") ?? "unknown";
      console.warn(`[Auth] Failed login attempt from IP: ${ip}`);
      return NextResponse.json({ error: "Password salah. Coba lagi." }, { status: 401 });
    }

    const cookieStore = await cookies();
    cookieStore.set({
      name: SESSION_COOKIE_NAME,
      value: "active",
      httpOnly: true,         // Not accessible via JS (XSS protection)
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
    });

    console.log("[Auth] Admin login successful.");
    return NextResponse.json({ success: true, message: "Login Berhasil" });

  } catch (error) {
    console.error("[Auth] Login error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server." }, { status: 500 });
  }
}

/** DELETE — Logout: clear the session cookie */
export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    return NextResponse.json({ success: true, message: "Logout berhasil." });
  } catch (error) {
    console.error("[Auth] Logout error:", error);
    return NextResponse.json({ error: "Gagal logout." }, { status: 500 });
  }
}
