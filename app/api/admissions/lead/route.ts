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

    // Role check: Only Owner, Office Admin, SMM can create leads
    const normRole = normalizeRole(dbUser.role || "staff");
    if (!["owner", "office_admin", "smm"].includes(normRole)) {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions." }, { status: 403 });
    }

    const body = await request.json();
    const {
      parentName,
      childName,
      phone,
      whatsapp,
      email,
      childAge,
      branchId,
      interestedCourse,
      marketingChannel,
      assignedStaffId,
      leadStatus,
      notes
    } = body;

    if (!childName || !parentName || !branchId) {
      return NextResponse.json({ error: "Child Name, Parent Name, and Branch are required fields." }, { status: 400 });
    }

    // 1. Check if branch is accessible to this SMM / Office Admin
    if (normRole !== "owner" && !dbUser.branchIds.includes(branchId)) {
      return NextResponse.json({ error: "Forbidden: You do not have access to this branch." }, { status: 403 });
    }

    // 2. Find or Create Parent Profile
    let parentId = "";
    if (phone || whatsapp) {
      const existingParent = await prisma.parent.findFirst({
        where: {
          OR: [
            phone ? { phone: { equals: phone } } : undefined,
            whatsapp ? { whatsapp: { equals: whatsapp } } : undefined,
          ].filter(Boolean) as any
        }
      });
      if (existingParent) {
        // Verify the parent record actually exists in Airtable before reusing
        try {
          await airtableProxy.readRecord("parent", existingParent.id);
          parentId = existingParent.id;
        } catch {
          // Parent exists in Postgres but not in Airtable — create fresh
          console.warn(`[Lead] Parent ${existingParent.id} not found in Airtable, creating new record.`);
        }
      }
    }

    if (!parentId) {
      const parentAirtableData = {
        "fldlQ21VINxCwAnWS": parentName,
        "fldhXjSQ1OK84qBA2": phone || null,
        "flddmO9P8vfEtOETO": whatsapp || null,
        "fld5dinv8NWVXzDTv": email || null,
        "fldscHRaf8yjx8Y9C": [branchId],
      };
      
      const createdParent = await airtableProxy.createRecord("parent", parentAirtableData);
      parentId = createdParent.id;

      await prisma.parent.create({
        data: {
          id: createdParent.id,
          parentName,
          phone: phone || null,
          whatsapp: whatsapp || null,
          email: email || null,
          branchIds: [branchId]
        }
      });
    }

    // 3. Create Lead in Airtable
    const combinedNotes = [
      notes,
      interestedCourse ? `Interested Course: ${interestedCourse}` : null
    ].filter(Boolean).join("\n");

    const leadAirtableData = {
      "fldeas819jz863u7f": childName,
      "fldRfaY8uVmBMdnMZ": childAge ? Number(childAge) : null,
      "fldCmaAEjCR6Q2wvH": phone || null,
      "fldW3ZCVk3Sn0g2xA": whatsapp || null,
      "fldN2dt6yL3FzUNIu": leadStatus || "New",
      "fldVNaPVuDC4E8M8I": combinedNotes || null,
      "fldWQCM1qCCL0r7eK": marketingChannel || null,
      "fldFHzM6cRc4osvzB": new Date().toISOString().split("T")[0],
      "fldt5ssP2Ax0Fo4Zj": [parentId],
      "fldtqwoAM6vOeQhVr": [branchId],
      "fldUfDRXRPnW3mIoD": assignedStaffId ? [assignedStaffId] : []
    };

    const createdLead = await airtableProxy.createRecord("lead", leadAirtableData);

    // 4. Save Lead to Prisma
    const newLead = await prisma.lead.create({
      data: {
        id: createdLead.id,
        leadName: childName,
        childAge: childAge ? Number(childAge) : null,
        phone: phone || null,
        whatsapp: whatsapp || null,
        status: leadStatus || "New",
        notes: combinedNotes || null,
        channel: marketingChannel || null,
        inquiryDate: new Date(),
        parentIds: [parentId],
        branchIds: [branchId],
        ownerIds: assignedStaffId ? [assignedStaffId] : []
      }
    });

    // 5. Audit the CREATE action
    logAudit({
      userId: dbUser.id,
      role: dbUser.role || "staff",
      action: "create",
      target: "Lead",
      status: "APPROVED",
      details: `Created Lead ID ${newLead.id} (${childName}) linked to Parent ID ${parentId}.`
    }, request);

    return NextResponse.json(newLead);
  } catch (error: any) {
    console.error("[Create Lead Error]", error);
    return NextResponse.json({ error: error.message || "Internal server error." }, { status: 500 });
  }
}
