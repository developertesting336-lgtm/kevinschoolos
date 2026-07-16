import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { logRequest } from "@/lib/logger";
import { generateRequestId, REQUEST_ID_HEADER } from "@/lib/request-id";

const UNAUTHENTICATED_PATHS = [
  "/healthz",
  "/readyz",
  "/api/auth/login",
  "/login",
];

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export default async function proxy(req: NextRequest) {
  const start = performance.now();
  const path = req.nextUrl.pathname;

  // Request ID — reuse from client or generate
  let requestId = req.headers.get(REQUEST_ID_HEADER);
  if (!requestId) {
    requestId = generateRequestId();
  }

  const sessionToken = req.cookies.get("session")?.value;

  if (path === "/login" && !sessionToken) {
    const res = NextResponse.next();
    res.headers.set(REQUEST_ID_HEADER, requestId);
    return res;
  }

  // 1. Check if the path is unauthenticated
  const isUnauthenticated = UNAUTHENTICATED_PATHS.some(
    (p) => path === p || path.startsWith(p)
  ) || path.startsWith("/_next") || path.endsWith(".png") || path.endsWith(".ico") || path.endsWith(".css");

  if (isUnauthenticated) {
    const res = NextResponse.next();
    res.headers.set(REQUEST_ID_HEADER, requestId);
    return res;
  }

  // 2. Auth Phase: get session cookie
  if (!sessionToken) {
    if (path.startsWith("/api/")) {
      const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      res.headers.set(REQUEST_ID_HEADER, requestId);
      return res;
    }
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("from", path);
    const res = NextResponse.redirect(loginUrl);
    res.headers.set(REQUEST_ID_HEADER, requestId);
    return res;
  }

  // 3. Database session validation directly via Prisma
  const hashedToken = hashToken(sessionToken);
  let sessionRecord = null;
  try {
    sessionRecord = await prisma.userSession.findUnique({
      where: { id: hashedToken },
    });
  } catch (err) {
    logRequest({ requestId, method: req.method, url: path, statusCode: 500, responseTimeMs: Math.round(performance.now() - start), error: err instanceof Error ? err : new Error("DB session query failed") });
    if (path.startsWith("/api/")) {
      const res = NextResponse.json({ error: "Database error" }, { status: 500 });
      res.headers.set(REQUEST_ID_HEADER, requestId);
      return res;
    }
    const res = NextResponse.redirect(new URL("/login", req.nextUrl));
    res.headers.set(REQUEST_ID_HEADER, requestId);
    return res;
  }

  if (!sessionRecord || sessionRecord.expiresAt < new Date()) {
    const responseTimeMs = Math.round(performance.now() - start);
    logRequest({ requestId, method: req.method, url: path, statusCode: 401, responseTimeMs });
    if (path.startsWith("/api/")) {
      const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      res.headers.set(REQUEST_ID_HEADER, requestId);
      return res;
    }
    const response = NextResponse.redirect(new URL("/login", req.nextUrl));
    response.cookies.delete("session");
    response.headers.set(REQUEST_ID_HEADER, requestId);
    return response;
  }

  // Get user details directly via Prisma
  let dbUser = null;
  try {
    dbUser = await prisma.user.findUnique({
      where: { id: sessionRecord.userId },
    });
  } catch (err) {
    logRequest({ requestId, method: req.method, url: path, statusCode: 500, responseTimeMs: Math.round(performance.now() - start), error: err instanceof Error ? err : new Error("DB user query failed") });
  }

  if (!dbUser) {
    const responseTimeMs = Math.round(performance.now() - start);
    logRequest({ requestId, method: req.method, url: path, statusCode: 401, responseTimeMs });
    if (path.startsWith("/api/")) {
      const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      res.headers.set(REQUEST_ID_HEADER, requestId);
      return res;
    }
    const response = NextResponse.redirect(new URL("/login", req.nextUrl));
    response.cookies.delete("session");
    response.headers.set(REQUEST_ID_HEADER, requestId);
    return response;
  }

  const role = dbUser.role?.toLowerCase() || "staff";

  // Check if role is cleaner (excluded)
  if (role === "cleaner" || role === "excluded") {
    const responseTimeMs = Math.round(performance.now() - start);
    logRequest({ requestId, method: req.method, url: path, statusCode: 403, responseTimeMs });
    if (path.startsWith("/api/")) {
      const res = NextResponse.json({ error: "Access denied: Excluded role." }, { status: 403 });
      res.headers.set(REQUEST_ID_HEADER, requestId);
      return res;
    }
    const response = NextResponse.redirect(new URL("/login", req.nextUrl));
    response.cookies.delete("session");
    response.headers.set(REQUEST_ID_HEADER, requestId);
    return response;
  }

  // Redirect authenticated user trying to access /login to /dashboard
  if (path === "/login" && sessionToken) {
    const res = NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    res.headers.set(REQUEST_ID_HEADER, requestId);
    return res;
  }

  // 4. Route/Path access checks
  if (path === "/dashboard") {
    const res = NextResponse.next();
    res.headers.set(REQUEST_ID_HEADER, requestId);
    return res;
  }

  if (path.startsWith("/api/sync")) {
    if (role !== "owner" && role !== "tech_admin") {
      const responseTimeMs = Math.round(performance.now() - start);
      logRequest({ requestId, method: req.method, url: path, statusCode: 403, responseTimeMs });
      const res = NextResponse.json({ error: "Forbidden: Sync requires elevated privileges." }, { status: 403 });
      res.headers.set(REQUEST_ID_HEADER, requestId);
      return res;
    }
  }

  // Pass headers to downstream requests
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);
  requestHeaders.set("x-user-id", dbUser.id);
  requestHeaders.set("x-user-role", role);
  requestHeaders.set("x-user-branches", JSON.stringify(dbUser.branchIds || []));

  const res = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  res.headers.set(REQUEST_ID_HEADER, requestId);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.css$).*)"],
};