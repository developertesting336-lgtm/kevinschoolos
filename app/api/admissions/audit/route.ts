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
    const { leadId } = body;
    if (!leadId) {
      return NextResponse.json({ error: "Missing leadId" }, { status: 400 });
    }

    // Fetch user details for context
    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, role: true, branchIds: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    // Enforce permissions: Only SMM, Office Admin, and Owner roles are audited/allowed
    const role = (dbUser.role || "").toLowerCase().trim();
    if (!["owner", "office_admin", "smm"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Log the sensitive read access (record IDs and table name only, never values)
    auditService.log(
      {
        actorId: dbUser.id,
        actorEmail: dbUser.email,
        role: dbUser.role,
        branchIds: dbUser.branchIds,
        action: "SENSITIVE_ACCESS",
        tableName: "Lead",
        recordIds: [leadId],
        result: "SUCCESS",
        details: `Viewed lead details drawer for Lead ID ${leadId}`,
      },
      request
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Admissions Audit POST Error]", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
