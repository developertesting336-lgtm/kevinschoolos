import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateSession } from "@/lib/auth";
import { normalizeRole } from "@/lib/roles";
import { auditService } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await validateSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, role: true, email: true },
    });

    const role = adminUser?.role || session.role || "";
    const normRole = normalizeRole(role);

    if (!["owner", "office_admin", "tech_admin"].includes(normRole)) {
      return NextResponse.json(
        { error: "Forbidden: Only Owner and Office/Admin roles can unlock user accounts." },
        { status: 403 }
      );
    }

    const { userId } = await params;
    if (!userId) {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    // Check if target user secret exists
    const secret = await prisma.userSecret.findUnique({
      where: { userId },
    });

    if (!secret) {
      return NextResponse.json({ error: "User credentials not found." }, { status: 404 });
    }

    // Reset login attempts and clear lockoutUntil
    await prisma.userSecret.update({
      where: { userId },
      data: {
        loginAttempts: 0,
        lockoutUntil: null,
      },
    });

    // Audit trail logging
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, email: true },
    });

    auditService.log(
      {
        actorId: session.userId,
        actorEmail: adminUser?.email || "Unknown",
        role: adminUser?.role || session.role,
        action: "UPDATE",
        tableName: "UserSecret",
        recordId: userId,
        result: "SUCCESS",
        details: `Unlocked account for user ${userId}`,
      },
      request
    );

    return NextResponse.json({
      success: true,
      message: `Account for ${targetUser?.fullName || targetUser?.email || "user"} successfully unlocked.`,
      userId,
    });
  } catch (error: any) {
    console.error("[Unlock Account API Error]", error);
    return NextResponse.json({ error: "Failed to unlock account." }, { status: 500 });
  }
}
