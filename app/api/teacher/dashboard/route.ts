import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkRBAC, getScopingFilter, applyRedactions, normalizeRole } from "@/lib/rbac";
import { auditService, getVisibleFieldIds } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * GET /api/teacher/dashboard
 * Returns today's sessions + roster counts, scoped to the caller (teacher).
 * Mobile-first data shape: sessions with class group info and headcount.
 * Phase 1/2: read-only. Write routes return 403.
 */
export async function GET(request: NextRequest) {
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

  // 3. RBAC: only teachers (or owner who can use this endpoint)
  const normRole = normalizeRole(userRole);
  if (!["teacher", "owner"].includes(normRole)) {
    auditService.logFailure(
      { id: dbUser.id, email: dbUser.email, role: userRole },
      "PERMISSION_DENIED",
      "TeacherDashboard",
      `Role '${userRole}' is not permitted to access teacher dashboard.`,
      request
    );
    return NextResponse.json({ error: "Forbidden: Teacher dashboard is for teachers only." }, { status: 403 });
  }

  // 4. RBAC check on Session table
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
    // 5. Get scoping filter for sessions (own_classes: teacherIds has user.id)
    const sessionScope = await getScopingFilter(
      { id: dbUser.id, role: userRole, branchIds: userBranchIds },
      "Session"
    );

    // 6. Compute target date range (support dynamic date override for testing/navigation)
    const dateParam = request.nextUrl.searchParams.get("date");
    const now = dateParam ? new Date(dateParam) : new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // 7. Query target date's sessions scoped to teacher
    const whereClause: any = {
      ...sessionScope,
      dateTime: {
        gte: startOfToday,
        lte: endOfToday,
      },
    };

    const sessions = await prisma.session.findMany({
      where: whereClause,
      orderBy: { dateTime: "asc" },
    });

    // 8. Gather class group IDs and resolve class group info + headcount
    const classGroupIds = Array.from(new Set(sessions.flatMap(s => s.classGroupIds || [])));

    let classGroupsMap: Record<string, { groupName: string; roomIds: string[]; teacherIds: string[]; branchIds: string[]; status: string | null }> = {};
    let enrollmentCounts: Record<string, number> = {};

    if (classGroupIds.length > 0) {
      // Fetch class groups
      const classGroups = await prisma.classGroup.findMany({
        where: { id: { in: classGroupIds } },
      });
      for (const cg of classGroups) {
        classGroupsMap[cg.id] = {
          groupName: cg.groupName,
          roomIds: cg.roomIds || [],
          teacherIds: cg.teacherIds || [],
          branchIds: cg.branchIds || [],
          status: cg.status,
        };
      }

      // Fetch active enrollment counts per class group
      const enrollments = await prisma.enrollment.findMany({
        where: {
          classGroupIds: { hasSome: classGroupIds },
          status: { equals: "active", mode: "insensitive" },
        },
        select: { classGroupIds: true },
      });

      for (const cgId of classGroupIds) {
        enrollmentCounts[cgId] = enrollments.filter(e => (e.classGroupIds || []).includes(cgId)).length;
      }
    }

    // 9. Resolve room names
    const allRoomIds = Array.from(new Set(Object.values(classGroupsMap).flatMap(cg => cg.roomIds || [])));
    let roomMap: Record<string, string> = {};
    if (allRoomIds.length > 0) {
      const rooms = await prisma.room.findMany({
        where: { id: { in: allRoomIds } },
        select: { id: true, roomName: true },
      });
      for (const r of rooms) {
        roomMap[r.id] = r.roomName;
      }
    }

    // 10. Build dashboard response
    const todaySessions = sessions.map(s => {
      const cgIds = s.classGroupIds || [];
      const cgInfo = cgIds.map(cgId => {
        const cg = classGroupsMap[cgId];
        if (!cg) return null;
        return {
          classGroupId: cgId,
          groupName: cg.groupName,
          headcount: enrollmentCounts[cgId] || 0,
          roomIds: cg.roomIds,
          roomNames: (cg.roomIds || []).map(rid => roomMap[rid] || rid).filter(Boolean),
        };
      }).filter(Boolean);

      return {
        id: s.id,
        sessionId: s.sessionId,
        dateTime: s.dateTime,
        status: s.status,
        branchIds: s.branchIds,
        classGroups: cgInfo,
      };
    });

    // 11. Apply redactions (no-op for sessions, but used for pattern consistency)
    const redacted = applyRedactions(userRole, "Session", todaySessions, false);

    // 12. Audit the read
    const sessionIds = sessions.map(s => s.id).filter(Boolean);
    const fieldIds = getVisibleFieldIds(userRole, "Session", false);

    auditService.logSensitiveRead(
      { id: dbUser.id, email: dbUser.email, role: userRole },
      "Session",
      sessionIds,
      fieldIds,
      request
    );

    // Also audit ClassGroup and Enrollment reads that were performed
    auditService.logSensitiveRead(
      { id: dbUser.id, email: dbUser.email, role: userRole },
      "ClassGroup",
      classGroupIds,
      getVisibleFieldIds(userRole, "ClassGroup", false),
      request
    );

    // 13. Summary statistics
    const totalToday = todaySessions.length;
    const totalStudents = Object.values(enrollmentCounts).reduce((sum, c) => sum + c, 0);
    const pendingAttendance = todaySessions.filter(s => s.status !== "held" && s.status !== "completed").length;

    return NextResponse.json({
      teacherId: dbUser.id,
      teacherName: dbUser.fullName,
      date: now.toISOString().split("T")[0],
      summary: {
        totalSessionsToday: totalToday,
        totalActiveStudents: totalStudents,
        pendingAttendance,
      },
      sessions: redacted,
    });
  } catch (error: any) {
    console.error("[Teacher Dashboard Error]", error);
    auditService.logFailure(
      { id: dbUser.id, email: dbUser.email, role: userRole },
      "VIEW",
      "TeacherDashboard",
      `Internal error: ${error.message || String(error)}`,
      request
    );
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// Block writes
export async function POST() {
  return NextResponse.json(
    { error: "Phase 1/2 is read-only. Attendance submission is not enabled yet — this is a preview." },
    { status: 403 }
  );
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