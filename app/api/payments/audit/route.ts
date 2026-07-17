import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { auditService } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await validateSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { recordId } = body;
    if (!recordId) {
      return NextResponse.json({ error: "Missing recordId" }, { status: 400 });
    }

    // Fetch user details for role validation
    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, role: true, branchIds: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    // RBAC: Only Finance, Office Admin, and Owner roles can view Payments details
    const role = (dbUser.role || "").toLowerCase().trim();
    if (!["owner", "office_admin", "office/admin", "office-admin", "finance"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Write audit event safely without logging PII
    auditService.log(
      {
        actorId: dbUser.id,
        actorEmail: dbUser.email,
        role: dbUser.role,
        branchIds: dbUser.branchIds,
        action: "SENSITIVE_ACCESS",
        tableName: "Payment",
        recordIds: [recordId],
        result: "SUCCESS",
        details: `Viewed transaction profiles for Payment ID ${recordId}`,
      },
      request
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Payments Audit POST Error]", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
