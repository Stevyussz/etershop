/**
 * @file src/lib/auth.ts
 * @description Authentication utility for server-side route protection.
 */

import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "admin_session";

/**
 * Verifies if the current request has a valid admin session cookie.
 * Throws an Error if unauthorized, which is caught by server action TRY/CATCH blocks.
 * 
 * @throws Error("Unauthorized") if the session is missing or invalid.
 */
export async function verifyAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (session !== "active") {
    console.warn("[Auth] Unauthorized access attempt detected.");
    throw new Error("Unauthorized: Akses ditolak. Silakan login kembali.");
  }
  
  return true;
}
