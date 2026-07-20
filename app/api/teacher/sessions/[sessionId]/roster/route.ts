import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkRBAC, getScopingFilter, applyRedactions, normalizeRole } from "@/lib/rbac";
import { auditService, getVisibleFieldIds } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * GET /api/teacher/sessions/[sessionId]/roster
 * Returns enrolled students for a session's class group(s).
 * Server-side redaction: DOB, Medical Notes, parent contact fields are stripped.
 * Phase 1/2: read-only.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  // 1. Authenticate
  const session = await validateSession();
  if (!session) {
    auditService.logFailure(undefined, "PERMISSION_DENIED", "Session", "No active session found.", request);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Fetch user
  const dbUser = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!dbUser) {
    auditService.logFailure(undefined, "PERMISSION_DENIED", "User", `User ${session.userId} not found.`, request);
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }

  const userRole = dbUser.role || "staff";
  const userBranchIds = dbUser.branchIds || [];

  // 3. RBAC gate
  const normRole = normalizeRole(userRole);
  if (!["teacher", "owner"].includes(normRole)) {
    auditService.logFailure(
      { id: dbUser.id, email: dbUser.email, role: userRole },
      "PERMISSION_DENIED",
      "SessionRoster",
      `Role '${userRole}' is not permitted.`,
      request
    );
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const rbacCheck = checkRBAC(userRole, "Session", "read", false);
  if (!rbacCheck.allowed) {
    auditService.logFailure(
      { id: dbUser.id, email: dbUser.email, role: userRole },
      "PERMISSION_DENIED",
      "Session",
      rbacCheck.reason,
      request
    );
    return NextResponse.json({ error: rbacCheck.reason }, { status: 403 });
  }

  try {
    // 4. Fetch the session with scoping
    const sessionScope = await getScopingFilter(
      { id: dbUser.id, role: userRole, branchIds: userBranchIds },
      "Session"
    );

    const targetSession = await prisma.session.findFirst({
      where: {
        ...sessionScope,
        id: sessionId,
      },
    });

    if (!targetSession) {
      auditService.logFailure(
        { id: dbUser.id, email: dbUser.email, role: userRole },
        "PERMISSION_DENIED",
        "Session",
        `Session ${sessionId} not found or not in teacher's scope.`,
        request
      );
      return NextResponse.json({ error: "Session not found or access denied." }, { status: 404 });
    }

    // 5. Get class group IDs from the session
    const classGroupIds = targetSession.classGroupIds || [];
    if (classGroupIds.length === 0) {
      return NextResponse.json({ sessionId, students: [] });
    }

    // 6. Get active enrollments for these class groups
    const enrollments = await prisma.enrollment.findMany({
      where: {
        classGroupIds: { hasSome: classGroupIds },
        status: { equals: "active", mode: "insensitive" },
      },
      select: { id: true, studentIds: true, classGroupIds: true },
    });

    const studentIds = Array.from(new Set(enrollments.flatMap(e => e.studentIds || [])));

    if (studentIds.length === 0) {
      return NextResponse.json({ sessionId, students: [] });
    }

    // 7. Fetch students (server-side redaction will strip DOB/Medical)
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
    });

    // 8. Fetch parent info for each student (redacted for teachers)
    const allParentIds = Array.from(new Set(students.flatMap(s => s.parentIds || [])));
    let parentMap: Record<string, any> = {};
    if (allParentIds.length > 0) {
      const parents = await prisma.parent.findMany({
        where: { id: { in: allParentIds } },
      });
      for (const p of parents) {
        parentMap[p.id] = p;
      }
    }

    // 9. Fetch existing attendance records for this session
    const existingAttendance = await prisma.attendance.findMany({
      where: { sessionIds: { has: sessionId } },
    });

    const attendanceByStudent: Record<string, string> = {};
    for (const att of existingAttendance) {
      for (const sid of att.studentIds || []) {
        attendanceByStudent[sid] = att.status || "present";
      }
    }

    // 10. Build roster with redacted student data
    const roster = students.map(student => {
      // Apply redactions: strip DOB and Medical Notes for teacher
      const redactedStudent: any = {
        id: student.id,
        studentName: student.studentName,
        gender: student.gender,
        status: student.status,
        // DOB and medicalNotes are intentionally excluded for teacher role
      };

      // Get parent info (redacted for teacher - no contact fields)
      const parentIds = student.parentIds || [];
      const parentInfo = parentIds
        .map(pid => {
          const p = parentMap[pid];
          if (!p) return null;
          // Teacher sees only parent name, no contact fields
          return {
            id: p.id,
            parentName: p.parentName,
            // phone, whatsapp, email intentionally excluded
          };
        })
        .filter(Boolean);

      return {
        ...redactedStudent,
        parents: parentInfo,
        attendanceStatus: attendanceByStudent[student.id] || null,
      };
    });

    // 11. Audit the sensitive read
    auditService.logSensitiveRead(
      { id: dbUser.id, email: dbUser.email, role: userRole },
      "Student",
      studentIds,
      getVisibleFieldIds(userRole, "Student", false),
      request
    );

    auditService.logSensitiveRead(
      { id: dbUser.id, email: dbUser.email, role: userRole },
      "Enrollment",
      enrollments.map(e => e.id).filter(Boolean),
      getVisibleFieldIds(userRole, "Enrollment", false),
      request
    );

    if (existingAttendance.length > 0) {
      auditService.logSensitiveRead(
        { id: dbUser.id, email: dbUser.email, role: userRole },
        "Attendance",
        existingAttendance.map(a => a.id).filter(Boolean),
        getVisibleFieldIds(userRole, "Attendance", false),
        request
      );
    }

    return NextResponse.json({
      sessionId,
      sessionStatus: targetSession.status,
      dateTime: targetSession.dateTime,
      classGroupIds,
      students: roster,
    });
  } catch (error: any) {
    console.error("[Session Roster Error]", error);
    auditService.logFailure(
      { id: dbUser.id, email: dbUser.email, role: userRole },
      "VIEW",
      "SessionRoster",
      `Internal error: ${error.message || String(error)}`,
      request
    );
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}