/**
 * @file src/proxy.ts
 * @description Next.js proxy middleware for protecting Admin routes.
 *
 * This file replaces the standard `middleware.ts` for compatibility with Next.js 16.
 * It intercepts ALL requests to /admin/* and validates the session cookie.
 *
 * Security Model:
 * - Sessions are stored as HttpOnly cookies (set by /api/admin/auth).
 * - The cookie value "active" is a simple flag. For production hardening,
 *   consider replacing this with a JWT or a signed session token.
 * - The cookie is not accessible via JavaScript (HttpOnly), protecting against XSS.
 *
 * Rate limiting for brute force protection on the login API is handled
 * at the infrastructure level (e.g., Vercel WAF or Cloudflare) rather than
 * in this middleware to keep it lightweight and fast.
 *
 * @see /api/admin/auth/route.ts — Where sessions are created (login)
 * @see /admin/login/page.tsx — The login UI
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow the login page and its API to pass through without auth check.
  // Without this, the redirect would create an infinite loop.
  const isLoginPage = pathname.startsWith("/admin/login");
  const isAuthApi = pathname.startsWith("/api/admin/auth");

  if (isLoginPage || isAuthApi) {
    return NextResponse.next();
  }

  // For all other /admin/* routes, verify the session cookie exists and is valid.
  if (pathname.startsWith("/admin")) {
    const session = request.cookies.get("admin_session")?.value;

    if (session !== "active") {
      // Redirect to login, preserving the intended destination in a query param
      // so the login page could redirect back after successful auth (future feature).
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

/** Apply this proxy to all admin routes. */
export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
