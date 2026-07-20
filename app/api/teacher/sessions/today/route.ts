import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkRBAC, getScopingFilter, applyRedactions, normalizeRole } from "@/lib/rbac";
import { auditService, getVisibleFieldIds } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * GET /api/teacher/sessions/today
 * Returns Sessions joined to Class Groups for the caller's classes only.
 * Phase 1/2: read-only.
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

  // 3. RBAC gate
  const normRole = normalizeRole(userRole);
  if (!["teacher", "owner"].includes(normRole)) {
    auditService.logFailure(
      { id: dbUser.id, email: dbUser.email, role: userRole },
      "PERMISSION_DENIED",
      "TeacherSessionsToday",
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
    // 4. Scoping filter for sessions (own_classes)
    const sessionScope = await getScopingFilter(
      { id: dbUser.id, role: userRole, branchIds: userBranchIds },
      "Session"
    );

    // 5. Today's date range
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // 6. Query today's sessions
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

    // 7. Resolve class groups
    const classGroupIds = Array.from(new Set(sessions.flatMap(s => s.classGroupIds || [])));
    let classGroupsMap: Record<string, any> = {};

    if (classGroupIds.length > 0) {
      const classGroups = await prisma.classGroup.findMany({
        where: { id: { in: classGroupIds } },
      });
      for (const cg of classGroups) {
        classGroupsMap[cg.id] = cg;
      }
    }

    // 8. Resolve rooms
    const allRoomIds = Array.from(
      new Set(Object.values(classGroupsMap).flatMap((cg: any) => cg.roomIds || []))
    );
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

    // 9. Build enriched response
    const enrichedSessions = sessions.map(s => {
      const cgList = (s.classGroupIds || [])
        .map(cgId => {
          const cg = classGroupsMap[cgId];
          if (!cg) return null;
          return {
            classGroupId: cgId,
            groupName: cg.groupName,
            courseIds: cg.courseIds || [],
            roomIds: cg.roomIds || [],
            roomNames: (cg.roomIds || []).map((rid: string) => roomMap[rid] || rid).filter(Boolean),
            teacherIds: cg.teacherIds || [],
            branchIds: cg.branchIds || [],
            status: cg.status,
            weekdays: cg.weekdays || [],
            startTime: cg.startTime || null,
          };
        })
        .filter(Boolean);

      return {
        id: s.id,
        sessionId: s.sessionId,
        dateTime: s.dateTime,
        status: s.status,
        classGroupIds: s.classGroupIds,
        teacherIds: s.teacherIds,
        branchIds: s.branchIds,
        classGroups: cgList,
      };
    });

    // 10. Redact
    const redacted = applyRedactions(userRole, "Session", enrichedSessions, false);

    // 11. Audit
    const sessionIds = sessions.map(s => s.id).filter(Boolean);
    auditService.logSensitiveRead(
      { id: dbUser.id, email: dbUser.email, role: userRole },
      "Session",
      sessionIds,
      getVisibleFieldIds(userRole, "Session", false),
      request
    );

    if (classGroupIds.length > 0) {
      auditService.logSensitiveRead(
        { id: dbUser.id, email: dbUser.email, role: userRole },
        "ClassGroup",
        classGroupIds,
        getVisibleFieldIds(userRole, "ClassGroup", false),
        request
      );
    }

    return NextResponse.json({
      date: now.toISOString().split("T")[0],
      sessions: redacted,
    });
  } catch (error: any) {
    console.error("[Teacher Sessions Today Error]", error);
    auditService.logFailure(
      { id: dbUser.id, email: dbUser.email, role: userRole },
      "VIEW",
      "TeacherSessionsToday",
      `Internal error: ${error.message || String(error)}`,
      request
    );
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// Block writes
export async function POST() {
  return NextResponse.json(
    { error: "Phase 1/2 is read-only. Writes are blocked." },
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