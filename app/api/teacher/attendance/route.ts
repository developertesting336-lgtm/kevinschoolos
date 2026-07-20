import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkRBAC, normalizeRole } from "@/lib/rbac";
import * as airtableProxy from "@/lib/airtableProxy";
import { auditService } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * POST /api/teacher/attendance
 * Handles Teacher Attendance submission and updates Session status to "Held"
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const session = await validateSession();
    if (!session) {
      auditService.logFailure(undefined, "PERMISSION_DENIED", "Attendance", "No active session.", request);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch User Context
    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
    });
    if (!dbUser) {
      auditService.logFailure(undefined, "PERMISSION_DENIED", "User", `User ${session.userId} not found.`, request);
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const userRole = dbUser.role || "staff";
    const normRole = normalizeRole(userRole);

    // 3. RBAC validation
    const rbacCheck = checkRBAC(userRole, "Attendance", "write");
    if (!rbacCheck.allowed) {
      auditService.logFailure(
        { id: dbUser.id, email: dbUser.email, role: userRole },
        "PERMISSION_DENIED",
        "Attendance",
        rbacCheck.reason,
        request
      );
      return NextResponse.json({ error: rbacCheck.reason }, { status: 403 });
    }

    // 4. Parse request body
    const body = await request.json();
    const { sessionId, attendance } = body; // attendance: Array of { studentId: string, status: string }

    if (!sessionId || !Array.isArray(attendance) || attendance.length === 0) {
      return NextResponse.json({ error: "Missing required fields (sessionId, attendance)." }, { status: 400 });
    }

    // 5. Validation checks
    const sessionRecord = await prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!sessionRecord) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    // Teacher ownership check
    if (normRole === "teacher") {
      const isAssigned = sessionRecord.teacherIds.includes(dbUser.id);
      if (!isAssigned) {
        return NextResponse.json({ error: "Forbidden: You are not the assigned teacher for this session." }, { status: 403 });
      }
    }

    // Status check
    if (sessionRecord.status?.toLowerCase() !== "scheduled") {
      return NextResponse.json({ error: "Session is already locked or completed." }, { status: 400 });
    }

    // Date check (cannot be in the future)
    if (sessionRecord.dateTime && new Date(sessionRecord.dateTime) > new Date()) {
      return NextResponse.json({ error: "Cannot submit attendance for future sessions." }, { status: 400 });
    }

    // Validate attendance statuses
    const validStatuses = ["present", "absent", "late", "excused"];
    for (const att of attendance) {
      if (!validStatuses.includes(att.status?.toLowerCase())) {
        return NextResponse.json({ error: `Invalid attendance status: ${att.status}` }, { status: 400 });
      }
    }

    // Validate student enrollment in the class group
    const enrollments = await prisma.enrollment.findMany({
      where: {
        classGroupIds: { hasSome: sessionRecord.classGroupIds },
        status: { equals: "active", mode: "insensitive" },
      },
    });
    const enrolledStudentIds = new Set(enrollments.flatMap((e) => e.studentIds));
    for (const att of attendance) {
      if (!enrolledStudentIds.has(att.studentId)) {
        return NextResponse.json({ error: `Student ${att.studentId} is not enrolled in this class group.` }, { status: 400 });
      }
    }

    // 6. Perform Attendance Upsert
    const savedAttendanceRecords = [];
    for (const att of attendance) {
      const existing = await prisma.attendance.findFirst({
        where: {
          sessionIds: { has: sessionId },
          studentIds: { has: att.studentId },
        },
      });

      const capitalizedStatus = att.status.charAt(0).toUpperCase() + att.status.slice(1).toLowerCase();
      const airtableData = {
        "fldcZrerDfUIXphLv": capitalizedStatus,
        "fld3eZM0egp7xsq7Y": [sessionId],
        "fldTdGs2iLe0cL5RW": [att.studentId],
      };

      let savedRecord;
      if (existing) {
        // Update Airtable
        await airtableProxy.updateRecord("attendance", existing.id, airtableData);
        // Update local Postgres
        savedRecord = await prisma.attendance.update({
          where: { id: existing.id },
          data: {
            status: capitalizedStatus,
          },
        });
      } else {
        // Create Airtable
        const attendanceIdStr = `ATT-${sessionId}-${att.studentId}`;
        const createAirtableData = {
          "fldOP511IijW9upZQ": attendanceIdStr,
          ...airtableData,
        };
        const created = await airtableProxy.createRecord("attendance", createAirtableData);
        // Create local Postgres
        savedRecord = await prisma.attendance.create({
          data: {
            id: created.id,
            attendanceId: attendanceIdStr,
            status: capitalizedStatus,
            sessionIds: [sessionId],
            studentIds: [att.studentId],
          },
        });
      }
      savedAttendanceRecords.push(savedRecord);
    }

    // 7. Session completion status transition (Scheduled -> Held)
    await airtableProxy.updateRecord("session", sessionId, {
      "fldqDJoUvxYzgG8iX": "Held",
    });

    await prisma.session.update({
      where: { id: sessionId },
      data: {
        status: "Held",
      },
    });

    // 8. Audit logging
    auditService.log(
      {
        actorId: dbUser.id,
        actorEmail: dbUser.email,
        role: userRole,
        action: "UPDATE",
        tableName: "Attendance",
        recordIds: savedAttendanceRecords.map((r) => r.id),
        fieldIds: ["fldcZrerDfUIXphLv"], // status field ID
        result: "SUCCESS",
        details: `Submitted attendance for session ${sessionId}. Total marks: ${savedAttendanceRecords.length}. Session completed status set to Held.`,
      },
      request
    );

    return NextResponse.json({
      success: true,
      attendanceCount: savedAttendanceRecords.length,
      sessionStatus: "Held",
    });
  } catch (error: any) {
    console.error("[Submit Attendance Error]", error);
    return NextResponse.json({ error: error.message || "Internal server error." }, { status: 500 });
  }
}

export async function PUT() {
  return NextResponse.json(
    { error: "Phase 1/2 is read-only. Writes are blocked." },
    { status: 403 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { error: "Phase 1/2 is read-only. Writes are blocked." },
    { status: 403 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Phase 1/2 is read-only. Writes are blocked." },
    { status: 403 }
  );
}