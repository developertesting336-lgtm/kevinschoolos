import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateSession } from "@/lib/auth";
import { normalizeRole } from "@/lib/roles";

export async function GET() {
  try {
    const session = await validateSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check user role from DB or session
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, role: true },
    });

    const role = user?.role || session.role || "";
    const normRole = normalizeRole(role);

    if (!["owner", "office_admin", "tech_admin"].includes(normRole)) {
      return NextResponse.json({ error: "Forbidden: Only Owner and Office/Admin roles can manage locked accounts." }, { status: 403 });
    }

    const now = new Date();

    // Query locked secrets
    const lockedSecrets = await prisma.userSecret.findMany({
      where: {
        lockoutUntil: { gt: now },
      },
      select: {
        userId: true,
        loginAttempts: true,
        lockoutUntil: true,
        updatedAt: true,
      },
    });

    if (lockedSecrets.length === 0) {
      return NextResponse.json({ lockedAccounts: [] });
    }

    // Fetch corresponding user details
    const userIds = lockedSecrets.map((s) => s.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, fullName: true, email: true, role: true, phone: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    const lockedAccounts = lockedSecrets.map((secret) => {
      const u = userMap.get(secret.userId);
      return {
        userId: secret.userId,
        fullName: u?.fullName || "Unknown User",
        email: u?.email || "No Email",
        role: u?.role || "User",
        phone: u?.phone || null,
        loginAttempts: secret.loginAttempts,
        lockoutUntil: secret.lockoutUntil ? secret.lockoutUntil.toISOString() : null,
        updatedAt: secret.updatedAt ? secret.updatedAt.toISOString() : null,
      };
    });

    return NextResponse.json({ lockedAccounts });
  } catch (error: any) {
    console.error("[Locked Accounts API Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
