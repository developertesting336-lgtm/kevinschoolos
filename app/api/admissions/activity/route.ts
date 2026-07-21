import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkRBAC, normalizeRole } from "@/lib/rbac";
import * as airtableProxy from "@/lib/airtableProxy";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await validateSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId }
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    // Role check: Only Owner, Office Admin, SMM can create activities
    const normRole = normalizeRole(dbUser.role || "staff");
    if (!["owner", "office_admin", "smm"].includes(normRole)) {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions." }, { status: 403 });
    }

    const body = await request.json();
    const { activityType, notes, nextFollowUpDate, leadId } = body;

    if (!activityType || !leadId) {
      return NextResponse.json({ error: "Activity Type and Lead ID are required fields." }, { status: 400 });
    }

    // 1. Verify Lead exists
    const lead = await prisma.lead.findUnique({
      where: { id: leadId }
    });
    if (!lead) {
      return NextResponse.json({ error: "Target lead not found." }, { status: 404 });
    }

    // 2. Branch scoping check: Office Admin and SMM can only touch branch-scoped leads
    if (normRole !== "owner") {
      const hasBranchAccess = lead.branchIds.some(bid => dbUser.branchIds.includes(bid));
      if (!hasBranchAccess) {
        return NextResponse.json({ error: "Forbidden: You do not have access to this branch." }, { status: 403 });
      }
    }

    // 3. Validate nextFollowUpDate
    if (nextFollowUpDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const targetDate = new Date(nextFollowUpDate);
      if (isNaN(targetDate.getTime())) {
        return NextResponse.json({ error: "Invalid next follow-up date." }, { status: 400 });
      }
      if (targetDate.getTime() < today.getTime()) {
        return NextResponse.json({ error: "Next follow-up date must be today or in the future." }, { status: 400 });
      }
    }

    // 4. Create Activity in Airtable
    const activityId = `ACT-${Date.now()}`;
    const activityAirtableData = {
      "fldoau73AEa6wab3u": activityId,
      "fldu5wzalKwiwzvxm": new Date().toISOString(),
      "fldK1Qiak0WKVApyF": activityType,
      "fldgsOoOJLKM1XWv5": notes || null,
      "fldZ8Z9ZlzA6Slv8g": nextFollowUpDate ? new Date(nextFollowUpDate).toISOString().split("T")[0] : null,
      "fldTzMvnpw3jRPVLi": [leadId],
      "flddCRQoHzWfkL4uy": [dbUser.id]
    };

    const createdActivity = await airtableProxy.createRecord("activity", activityAirtableData);

    // 5. Save Activity to Prisma
    const newActivity = await prisma.activity.create({
      data: {
        id: createdActivity.id,
        activityId,
        dateTime: new Date(),
        type: activityType,
        notes: notes || null,
        nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
        leadIds: [leadId],
        ownerIds: [dbUser.id]
      }
    });

    // 6. Audit the CREATE action
    logAudit({
      userId: dbUser.id,
      role: dbUser.role || "staff",
      action: "create",
      target: "Activity",
      status: "APPROVED",
      details: `Logged Activity ID ${newActivity.id} of type ${activityType} for Lead ID ${leadId}.`
    }, request);

    return NextResponse.json(newActivity);
  } catch (error: any) {
    console.error("[Create Activity Error]", error);
    return NextResponse.json({ error: error.message || "Internal server error." }, { status: 500 });
  }
}
