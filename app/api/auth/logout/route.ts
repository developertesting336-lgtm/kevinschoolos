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
    const requestUrl = new URL(request.url);
    const loginUrl = new URL("/login", requestUrl.origin);
    return NextResponse.redirect(loginUrl, { status: 303 });
  } catch (error) {
    console.error("[Logout Error]", error);
    return NextResponse.json({ error: "Failed to log out" }, { status: 500 });
  }
}
