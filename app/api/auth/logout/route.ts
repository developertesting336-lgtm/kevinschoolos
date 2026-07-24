import { NextResponse } from "next/server";
import { destroySession, validateSession } from "@/lib/auth";
import { auditService } from "@/lib/audit";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await validateSession();
    if (session) {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, email: true, role: true, branchIds: true },
      });

      if (dbUser) {
        auditService.log({
          actorId: dbUser.id,
          actorEmail: dbUser.email,
          role: dbUser.role,
          branchIds: dbUser.branchIds,
          action: "LOGOUT",
          result: "SUCCESS",
          details: "User logged out successfully.",
        }, request);
      }
    }

    await destroySession();
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") || (host && !host.includes("localhost") && !host.includes("127.0.0.1") ? "https" : "http");
    const baseUrl = host ? `${proto}://${host}` : new URL(request.url).origin;

    const loginUrl = new URL("/login", baseUrl);
    return NextResponse.redirect(loginUrl, { status: 303 });
  } catch (error) {
    console.error("[Logout Error]", error);
    return NextResponse.json({ error: "Failed to log out" }, { status: 500 });
  }
}
