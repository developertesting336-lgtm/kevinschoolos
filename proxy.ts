import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const PROTECTED_PREFIXES = ["/dashboard"];
const GUEST_ROUTES = ["/login"];

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;

  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) =>
    path.startsWith(prefix),
  );
  const isGuestRoute = GUEST_ROUTES.some((route) => path === route);

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;

  if (path === "/") {
    if (sessionToken) {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    } else {
      return NextResponse.redirect(new URL("/login", req.nextUrl));
    }
  }

  if (isProtectedRoute && !sessionToken) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("from", path);
    return NextResponse.redirect(loginUrl);
  }

  if (isGuestRoute && sessionToken) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
