import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { normalizeRole } from "@/lib/rbac";
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

    // Role check: Only Owner, Office Admin, SMM can schedule trials
    const normRole = normalizeRole(dbUser.role || "staff");
    if (!["owner", "office_admin", "smm"].includes(normRole)) {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions." }, { status: 403 });
    }

    const body = await request.json();
    const {
      leadId,
      classGroupId,
      teacherId,
      trialDate,
      trialTime,
      confirmationMethod,
      notes
    } = body;

    if (!leadId || !classGroupId || !teacherId || !trialDate || !trialTime) {
      return NextResponse.json(
        { error: "Lead, Class Group, Teacher, Trial Date, and Trial Time are required." },
        { status: 400 }
      );
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

    // 3. Combine date and time into DateTime ISO string
    const dateTimeStr = `${trialDate}T${trialTime}:00`;
    const trialDateTime = new Date(dateTimeStr);
    if (isNaN(trialDateTime.getTime())) {
      return NextResponse.json({ error: "Invalid trial date or time format." }, { status: 400 });
    }

    const trialId = `TRL-${Date.now()}`;

    // 4. Create Trial record in Airtable (Table 08 Trials / tblfvl5TjmWtr24Yp)
    const trialAirtableData = {
      "fldiq4WuWIkCtVj1J": trialId,
      "fldzCGpZO8q3iNw3K": trialDateTime.toISOString(),
      "fldGIxMvvMpf96UoR": "Scheduled",
      "fld7yy1pPPTqXkphS": notes ? String(notes).trim() : null,
      "fldDsWJSbmU9lHWTc": [leadId],
      "fldpBUB8zEEqWmRzG": [classGroupId],
      "fldvnLeHapzr4TSyB": [teacherId],
      "fldgDLfpjpPKeTZzw": confirmationMethod || "Phone",
      "fldwVnsZrJkmpJ9cQ": false,
      "fldh1ixyvOL4Le4nZ": null,
      "fldQ4C7b6C3P81TOY": "Not Assessed",
      "fldo1WQXaLhCpRss0": [],
      "fld7qKBZvQj5sRjgW": []
    };

    const createdTrial = await airtableProxy.createRecord("trial", trialAirtableData);

    // 5. Save Trial record to Prisma
    const newTrial = await prisma.trial.create({
      data: {
        id: createdTrial.id,
        trialId,
        dateTime: trialDateTime,
        outcome: "Scheduled",
        notes: notes ? String(notes).trim() : null,
        leadIds: [leadId],
        classGroupIds: [classGroupId],
        teacherIds: [teacherId],
        confirmationMethod: confirmationMethod || "Phone",
        confirmationSent: false,
        confirmationDate: null,
        levelAssessed: "Not Assessed",
        studentIds: [],
        enrollmentIds: []
      }
    });

    // 6. Update corresponding Lead record status to "Trial Booked" in Airtable and Prisma
    await airtableProxy.updateRecord("lead", leadId, {
      "fldN2dt6yL3FzUNIu": "Trial Booked"
    });

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: { status: "Trial Booked" }
    });

    // 7. Audit log the CREATE action
    logAudit({
      userId: dbUser.id,
      role: dbUser.role || "staff",
      action: "create",
      target: "Trial",
      status: "APPROVED",
      details: `Scheduled Trial ID ${newTrial.id} (${trialId}) for Lead ${lead.leadName} (${leadId}). Lead status updated to Trial Booked.`
    }, request);

    return NextResponse.json({
      trial: newTrial,
      lead: updatedLead
    });
  } catch (error: any) {
    console.error("[Schedule Trial Error]", error);
    return NextResponse.json({ error: error.message || "Internal server error." }, { status: 500 });
  }
}
