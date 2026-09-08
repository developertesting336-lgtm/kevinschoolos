import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const CSRF_COOKIE_NAME = "csrf_token";
export const CSRF_HEADER_NAME = "x-csrf-token";

// Generate cryptographically random CSRF token
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Constant-time token verification to prevent timing attacks
export function verifyCsrfToken(req: NextRequest): boolean {
  const cookieToken = req.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = req.headers.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken) {
    return false;
  }

  if (cookieToken.length !== headerToken.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(cookieToken),
      Buffer.from(headerToken)
    );
  } catch {
    return false;
  }
}

// Helper to attach CSRF cookie to NextResponse
export function attachCsrfCookie(res: NextResponse, token: string): void {
  res.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be readable by client JavaScript to attach to request headers
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}
