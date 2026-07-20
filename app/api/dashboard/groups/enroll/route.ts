import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkRBAC, normalizeRole } from "@/lib/rbac";
import * as airtableProxy from "@/lib/airtableProxy";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * GET /api/dashboard/groups/enroll
 * Returns all students and the subset of student IDs currently enrolled in the specified classGroup.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await validateSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rbacCheck = checkRBAC(session.role, "Enrollment", "read");
    if (!rbacCheck.allowed) {
      return NextResponse.json({ error: rbacCheck.reason }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const classGroupId = searchParams.get("classGroupId");

    if (!classGroupId) {
      return NextResponse.json({ error: "Missing classGroupId." }, { status: 400 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId }
    });
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const normRole = normalizeRole(dbUser.role || "staff");
    const userBranchIds = dbUser.branchIds || [];

    // Fetch all active students
    const students = await prisma.student.findMany({
      where: normRole === "owner" ? undefined : { branchIds: { hasSome: userBranchIds } },
      select: { id: true, studentName: true }
    });

    // Fetch currently enrolled student IDs
    const enrollments = await prisma.enrollment.findMany({
      where: {
        classGroupIds: { has: classGroupId },
        status: { equals: "active", mode: "insensitive" }
      },
      select: { studentIds: true }
    });
    const enrolledStudentIds = Array.from(new Set(enrollments.flatMap(e => e.studentIds)));

    return NextResponse.json({
      students: students.map(s => ({
        id: s.id,
        name: s.studentName || "Unnamed Student"
      })),
      enrolledStudentIds
    });
  } catch (error: any) {
    console.error("[Get Enrollment Roster Error]", error);
    return NextResponse.json({ error: error.message || "Internal server error." }, { status: 500 });
  }
}

/**
 * POST /api/dashboard/groups/enroll
 * Modifies enrollment mapping for a class group.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await validateSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rbacCheck = checkRBAC(session.role, "Enrollment", "write");
    if (!rbacCheck.allowed) {
      return NextResponse.json({ error: rbacCheck.reason }, { status: 403 });
    }

    const body = await request.json();
    const { classGroupId, studentIds } = body;

    if (!classGroupId || !Array.isArray(studentIds)) {
      return NextResponse.json({ error: "Missing classGroupId or studentIds." }, { status: 400 });
    }

    const classGroup = await prisma.classGroup.findUnique({
      where: { id: classGroupId }
    });
    if (!classGroup) {
      return NextResponse.json({ error: "Class group not found." }, { status: 404 });
    }

    // Fetch active enrollments currently linking to this class group
    const currentEnrollments = await prisma.enrollment.findMany({
      where: {
        classGroupIds: { has: classGroupId },
        status: { equals: "active", mode: "insensitive" }
      }
    });

    const currentEnrolledStudentIds = new Set(currentEnrollments.flatMap(e => e.studentIds));
    const targetStudentIds = new Set(studentIds);

    const studentIdsToAdd = studentIds.filter(id => !currentEnrolledStudentIds.has(id));
    const enrollmentsToRemoveFrom = currentEnrollments.filter(e => e.studentIds.some(id => !targetStudentIds.has(id)));

    // A. Remove classGroupId from enrollments that should no longer link to it
    for (const e of enrollmentsToRemoveFrom) {
      const updatedClassGroupIds = e.classGroupIds.filter(id => id !== classGroupId);
      await airtableProxy.updateRecord("enrollment", e.id, {
        "fld0tk6w9UAtCKrWA": updatedClassGroupIds
      });
      await prisma.enrollment.update({
        where: { id: e.id },
        data: { classGroupIds: updatedClassGroupIds }
      });
    }

    // B. Add classGroupId to target student enrollments (or create new ones)
    for (const studentId of studentIdsToAdd) {
      const existing = await prisma.enrollment.findFirst({
        where: {
          studentIds: { has: studentId },
          status: { equals: "active", mode: "insensitive" }
        }
      });

      if (existing) {
        const updatedClassGroupIds = Array.from(new Set([...existing.classGroupIds, classGroupId]));
        await airtableProxy.updateRecord("enrollment", existing.id, {
          "fld0tk6w9UAtCKrWA": updatedClassGroupIds
        });
        await prisma.enrollment.update({
          where: { id: existing.id },
          data: { classGroupIds: updatedClassGroupIds }
        });
      } else {
        const branchId = classGroup.branchIds[0];
        const enrollmentIdStr = `ENR-${classGroupId}-${studentId}`;

        const airtableData = {
          "fld1RmaZD4oSBFSIe": enrollmentIdStr,
          "fld5ngZOAsR4qF7R7": "Active",
          "fldV9CDG6hTBsoPyP": [studentId],
          "fld0tk6w9UAtCKrWA": [classGroupId],
          "fldwtRAb9ZXRe3ekD": branchId ? [branchId] : []
        };

        const created = await airtableProxy.createRecord("enrollment", airtableData);

        await prisma.enrollment.create({
          data: {
            id: created.id,
            enrollmentId: enrollmentIdStr,
            status: "Active",
            studentIds: [studentId],
            classGroupIds: [classGroupId],
            branchIds: branchId ? [branchId] : []
          }
        });
      }
    }

    logAudit({
      userId: session.userId,
      role: session.role,
      action: "update",
      target: "Enrollment",
      status: "APPROVED",
      details: `Enrolled student IDs: ${JSON.stringify(studentIds)} into class group ${classGroupId}.`
    }, request);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Enrollment Update Error]", error);
    return NextResponse.json({ error: error.message || "Internal server error." }, { status: 500 });
  }
}
