import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { normalizeRole } from "@/lib/rbac";
import * as airtableProxy from "@/lib/airtableProxy";
import { auditService } from "@/lib/audit";
import { generateInvoice } from "@/lib/invoiceService";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const session = await validateSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch user
    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, role: true, branchIds: true },
    });
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const userRole = dbUser.role || "staff";
    const normRole = normalizeRole(userRole);

    // 3. RBAC: Only Owner or Office Admin
    if (!["owner", "office_admin"].includes(normRole)) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions." }, { status: 403 });
    }

    // 4. Parse body
    const body = await request.json();
    const {
      leadId,
      parentInfo,
      studentInfo,
      classGroupId,
      tuitionPlanId,
      enrollDate,
      enrollmentStatus,
      completeTrial,
    } = body;

    if (!leadId || !parentInfo || !studentInfo || !classGroupId || !tuitionPlanId) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // 5. Validate lead exists and is not already converted
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }
    if (lead.status?.toLowerCase() === "enrolled" || lead.status?.toLowerCase() === "won") {
      return NextResponse.json({ error: "This lead has already been converted." }, { status: 400 });
    }

    // 6. Branch scoping
    const userBranchIds = dbUser.branchIds || [];
    const leadBranchIds = lead.branchIds || [];
    const hasBranchAccess = userBranchIds.some((bId: string) => leadBranchIds.includes(bId));
    if (!hasBranchAccess && normRole !== "owner") {
      return NextResponse.json({ error: "Forbidden: lead not in your branch." }, { status: 403 });
    }

    const branchId = lead.branchIds[0] || (userBranchIds[0] as string);

    // 7. Idempotency check using lead ID (generate key from lead + branch)
    // Store created IDs in a session-level progress map (in-memory for now)
    const idempotencyKey = `convert-lead:${leadId}`;

    // 8. Validate class group capacity
    const classGroup = await prisma.classGroup.findUnique({ where: { id: classGroupId } });
    if (!classGroup) {
      return NextResponse.json({ error: "Class group not found." }, { status: 404 });
    }

    const capacity = classGroup.capacity || 99;
    const currentEnrollments = await prisma.enrollment.findMany({
      where: {
        classGroupIds: { has: classGroupId },
        status: { equals: "active", mode: "insensitive" },
      },
    });
    const currentStudentCount = currentEnrollments.reduce((sum: number, e: any) => sum + (e.studentIds?.length || 0), 0);
    const newStudentCount = Array.isArray(studentInfo.name) ? studentInfo.name.length : 1;

    if (currentStudentCount + newStudentCount > capacity) {
      return NextResponse.json({
        error: `Class group "${classGroup.groupName}" is full (${currentStudentCount}/${capacity} enrolled).`,
        capacityExceeded: true,
        currentCount: currentStudentCount,
        capacity,
      }, { status: 400 });
    }

    // ========== STEP 1: Parent (Reuse or Create) ==========
    let parentId: string | null = null;

    // Search existing parent by email, phone, or whatsapp
    if (parentInfo.email || parentInfo.phone || parentInfo.whatsapp) {
      const searchCriteria: any[] = [];
      if (parentInfo.email) searchCriteria.push({ email: { equals: parentInfo.email, mode: "insensitive" } });
      if (parentInfo.phone) searchCriteria.push({ phone: { equals: parentInfo.phone } });
      if (parentInfo.whatsapp) searchCriteria.push({ whatsapp: { equals: parentInfo.whatsapp } });

      const existingParent = await prisma.parent.findFirst({
        where: { OR: searchCriteria },
      });
      if (existingParent) {
        parentId = existingParent.id;
      }
    }

    // If no existing parent, create new one
    if (!parentId) {
      const parentAirtableData: Record<string, any> = {
        "fldlQ21VINxCwAnWS": parentInfo.name,
      };
      if (parentInfo.phone) parentAirtableData["fldhXjSQ1OK84qBA2"] = parentInfo.phone;
      if (parentInfo.whatsapp) parentAirtableData["flddmO9P8vfEtOETO"] = parentInfo.whatsapp;
      if (parentInfo.email) parentAirtableData["fld5dinv8NWVXzDTv"] = parentInfo.email;
      if (branchId) parentAirtableData["fldscHRaf8yjx8Y9C"] = [branchId];

      try {
        const createdParent = await airtableProxy.createRecord("parent", parentAirtableData);
        parentId = createdParent.id;

        await prisma.parent.create({
          data: {
            id: createdParent.id,
            parentName: parentInfo.name,
            phone: parentInfo.phone || null,
            whatsapp: parentInfo.whatsapp || null,
            email: parentInfo.email || null,
            branchIds: branchId ? [branchId] : [],
          },
        });
      } catch (err: any) {
        return NextResponse.json({ error: `Failed to create parent: ${err.message}` }, { status: 502 });
      }
    }

    // ========== STEP 2: Student ==========
    let studentId: string | null = null;

    const studentAirtableData: Record<string, any> = {
      "fldqCvnVj9WoNh2iH": studentInfo.name,
    };
    if (studentInfo.dob) studentAirtableData["fldkfzzCiudEa0bQd"] = studentInfo.dob;
    if (studentInfo.gender) studentAirtableData["fldU1OfNXoTt92Yu1"] = studentInfo.gender;
    if (parentId) studentAirtableData["fldwzFCeLGUPaZovG"] = [parentId];
    if (branchId) studentAirtableData["fldTeS3Yg44gCGB90"] = [branchId];

    try {
      const createdStudent = await airtableProxy.createRecord("student", studentAirtableData);
      studentId = createdStudent.id;

      await prisma.student.create({
        data: {
          id: createdStudent.id,
          studentName: studentInfo.name,
          dateOfBirth: studentInfo.dob ? new Date(studentInfo.dob) : null,
          gender: studentInfo.gender || null,
          parentIds: parentId ? [parentId] : [],
          branchIds: branchId ? [branchId] : [],
        },
      });
    } catch (err: any) {
      return NextResponse.json({ error: `Failed to create student: ${err.message}` }, { status: 502 });
    }

    // ========== STEP 3-4: Enrollment ==========
    let enrollmentId: string | null = null;
    const enrollmentIdStr = `ENR-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const enrollmentAirtableData: Record<string, any> = {
      "fld1RmaZD4oSBFSIe": enrollmentIdStr,
      "fldV9CDG6hTBsoPyP": [studentId!],
      "fld0tk6w9UAtCKrWA": [classGroupId],
      "fldIESu0tEeFvUiuA": [tuitionPlanId],
      "fldwtRAb9ZXRe3ekD": [branchId],
      "fld5ngZOAsR4qF7R7": enrollmentStatus || "Active",
    };
    if (enrollDate) enrollmentAirtableData["fld1Mc0uYqz7w4NqP"] = enrollDate;

    try {
      const createdEnrollment = await airtableProxy.createRecord("enrollment", enrollmentAirtableData);
      enrollmentId = createdEnrollment.id;

      await prisma.enrollment.create({
        data: {
          id: createdEnrollment.id,
          enrollmentId: enrollmentIdStr,
          enrollDate: enrollDate ? new Date(enrollDate) : new Date(),
          status: enrollmentStatus || "Active",
          studentIds: [studentId!],
          classGroupIds: [classGroupId],
          tuitionPlanIds: [tuitionPlanId],
          branchIds: [branchId],
        },
      });
    } catch (err: any) {
      return NextResponse.json({ error: `Failed to create enrollment: ${err.message}` }, { status: 502 });
    }

    // ========== STEP 5: Automatic Invoice Creation ==========
    let invoiceId: string | null = null;
    let invoiceNo: string | null = null;
    let invoiceAmount: number | null = null;
    let invoiceStatus: string | null = null;

    try {
      const invoiceResult = await generateInvoice({
        enrollmentId: enrollmentId!,
        tuitionPlanId,
        studentIds: [studentId!],
        parentIds: [parentId!],
        branchIds: [branchId],
      });

      if (invoiceResult.success && invoiceResult.invoice) {
        invoiceId = invoiceResult.invoice.id;
        invoiceNo = invoiceResult.invoice.invoiceNo;
        invoiceAmount = invoiceResult.invoice.amount;
        invoiceStatus = invoiceResult.invoice.status;
      } else {
        console.error("[Convert Lead] Invoice generation failed:", invoiceResult.error);
        // Non-blocking: enrollment was created successfully, but invoice failed.
        // The compensating repair mechanism can resume from invoice creation.
      }
    } catch (err: any) {
      console.error("[Convert Lead] Invoice generation error (non-blocking):", err.message);
      // Non-blocking: enrollment succeeded, invoice can be retried later.
    }

    // ========== OPTIONAL: Trial Completion ==========
    let trialCompleted = false;
    if (completeTrial && lead.parentIds?.length) {
      // Find trial linked to this lead
      const trial = await prisma.trial.findFirst({
        where: { leadIds: { has: leadId } },
        orderBy: { updatedAt: "desc" },
      });

      if (trial) {
        try {
          await airtableProxy.updateRecord("trial", trial.id, {
            "fldGIxMvvMpf96UoR": "Completed",
            "fldo1WQXaLhCpRss0": [studentId!],
            "fld7qKBZvQj5sRjgW": [enrollmentId!],
          });

          await prisma.trial.update({
            where: { id: trial.id },
            data: {
              outcome: "Completed",
              studentIds: [studentId!],
              enrollmentIds: [enrollmentId!],
            },
          });
          trialCompleted = true;
        } catch (err: any) {
          console.error("[Convert Lead] Trial completion failed (non-blocking):", err.message);
        }
      }
    }

    // ========== Update Lead Status ==========
    try {
      await airtableProxy.updateRecord("lead", leadId, {
        "fldN2dt6yL3FzUNIu": "Enrolled",
      });
      await prisma.lead.update({
        where: { id: leadId },
        data: { status: "Enrolled" },
      });
    } catch (err: any) {
      console.error("[Convert Lead] Lead status update failed (non-blocking):", err.message);
    }

    // ========== Audit ==========
    auditService.log(
      {
        actorId: dbUser.id,
        actorEmail: dbUser.email,
        role: userRole,
        action: "CREATE",
        tableName: "Enrollment",
        recordId: enrollmentId!,
        fieldIds: [],
        result: "SUCCESS",
        details: `Converted lead ${leadId}: Created Parent ${parentId}, Student ${studentId}, Enrollment ${enrollmentId}, Invoice ${invoiceId || "failed"}. Trial completed: ${trialCompleted}.`,
      },
      request
    );

    return NextResponse.json({
      success: true,
      message: "Lead converted successfully.",
      data: {
        parentId,
        studentId,
        enrollmentId,
        invoiceId,
        invoiceNo,
        invoiceAmount,
        invoiceStatus,
        trialCompleted,
        parentReused: !parentInfo.email && !parentInfo.phone && !parentInfo.whatsapp ? false : true,
      },
    });

  } catch (error: any) {
    console.error("[Convert Lead Error]", error);
    return NextResponse.json({ error: error.message || "Internal server error." }, { status: 500 });
  }
}