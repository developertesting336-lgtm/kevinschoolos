import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";

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
  const path = req.nextUrl.pathname;

  const sessionToken = req.cookies.get("session")?.value;

  if (path === "/login" && !sessionToken) {
    return NextResponse.next();
  }

  // 1. Check if the path is unauthenticated
  const isUnauthenticated = UNAUTHENTICATED_PATHS.some(
    (p) => path === p || path.startsWith(p)
  ) || path.startsWith("/_next") || path.endsWith(".png") || path.endsWith(".ico") || path.endsWith(".css");

  if (isUnauthenticated) {
    return NextResponse.next();
  }

  // 2. Auth Phase: get session cookie
  if (!sessionToken) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("from", path);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Database session validation directly via Prisma
  const hashedToken = hashToken(sessionToken);
  let sessionRecord = null;
  try {
    sessionRecord = await prisma.userSession.findUnique({
      where: { id: hashedToken },
    });
  } catch (err) {
    console.error("[Proxy DB Session Query Error]", err);
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (!sessionRecord || sessionRecord.expiresAt < new Date()) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const response = NextResponse.redirect(new URL("/login", req.nextUrl));
    response.cookies.delete("session");
    return response;
  }

  // Get user details directly via Prisma
  let dbUser = null;
  try {
    dbUser = await prisma.user.findUnique({
      where: { id: sessionRecord.userId },
    });
  } catch (err) {
    console.error("[Proxy DB User Query Error]", err);
  }

  if (!dbUser) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const response = NextResponse.redirect(new URL("/login", req.nextUrl));
    response.cookies.delete("session");
    return response;
  }

  const role = dbUser.role?.toLowerCase() || "staff";

  // Check if role is cleaner (excluded)
  if (role === "cleaner" || role === "excluded") {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Access denied: Excluded role." }, { status: 403 });
    }
    const response = NextResponse.redirect(new URL("/login", req.nextUrl));
    response.cookies.delete("session");
    return response;
  }

  // Redirect authenticated user trying to access /login to /dashboard
  if (path === "/login" && sessionToken) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  // 4. Route/Path access checks
  if (path === "/dashboard") {
    return NextResponse.next();
  }

  if (path.startsWith("/api/sync")) {
    if (role !== "owner" && role !== "tech_admin") {
      return NextResponse.json({ error: "Forbidden: Sync requires elevated privileges." }, { status: 403 });
    }
  }

  // Pass headers to downstream requests
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-user-id", dbUser.id);
  requestHeaders.set("x-user-role", role);
  requestHeaders.set("x-user-branches", JSON.stringify(dbUser.branchIds || []));

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.css$).*)"],
};
