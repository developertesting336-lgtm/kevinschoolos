import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkRBAC, getScopingFilter, normalizeRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import * as airtableProxy from "@/lib/airtableProxy";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // 1. Authentication
    const session = await validateSession();
    if (!session) {
      logAudit({
        action: "read",
        target: "ClassGroup",
        status: "DENIED",
        details: "No active session found.",
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. RBAC permissions check
    const rbacCheck = checkRBAC(session.role, "ClassGroup", "read", false);
    if (!rbacCheck.allowed) {
      logAudit({
        userId: session.userId,
        role: session.role,
        action: "read",
        target: "ClassGroup",
        status: "DENIED",
        details: rbacCheck.reason,
      });
      return NextResponse.json({ error: rbacCheck.reason }, { status: 403 });
    }

    // Fetch full user context for database scoping
    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!dbUser) {
      logAudit({
        userId: session.userId,
        role: session.role,
        action: "read",
        target: "ClassGroup",
        status: "DENIED",
        details: `User ID ${session.userId} not found in database.`,
      });
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const isMetadata = searchParams.get("metadata") === "true";
    if (isMetadata) {
      const normRole = normalizeRole(dbUser.role || "staff");
      const branches = await prisma.branch.findMany({
        where: normRole === "owner" ? undefined : { id: { in: dbUser.branchIds } },
        select: { id: true, name: true }
      });
      const courses = await prisma.course.findMany({
        where: { active: true },
        select: { id: true, courseName: true }
      });
      const teachers = await prisma.user.findMany({
        where: { role: { equals: "teacher", mode: "insensitive" } },
        select: { id: true, fullName: true }
      });
      const rooms = await prisma.room.findMany({
        where: normRole === "owner" ? undefined : { branchIds: { hasSome: dbUser.branchIds } },
        select: { id: true, roomName: true }
      });
      const terms = await prisma.term.findMany({
        select: { id: true, termName: true }
      });

      return NextResponse.json({
        branches,
        courses,
        teachers,
        rooms,
        terms
      });
    }

    const search = searchParams.get("search") || undefined;
    const pageStr = searchParams.get("page");
    const limitStr = searchParams.get("limit") || "5";

    // 3. Branch Scoping and Role filters
    const scopingFilter = await getScopingFilter(
      { id: dbUser.id, role: dbUser.role || "staff", branchIds: dbUser.branchIds || [] },
      "ClassGroup"
    );

    // 4. Audit step (Authentication -> RBAC -> Scoping -> Audit)
    logAudit({
      userId: dbUser.id,
      role: dbUser.role || "staff",
      action: "read",
      target: "ClassGroup",
      status: "APPROVED",
      details: `Active Groups list scoped: ${JSON.stringify(scopingFilter)}`,
    });

    const baseWhere = {
      status: { equals: "active", mode: "insensitive" } as const,
    };

    const combinedWhere = {
      AND: [
        baseWhere,
        scopingFilter,
        search
          ? {
              groupName: {
                contains: search,
                mode: "insensitive" as const,
              },
            }
          : undefined,
      ].filter(Boolean) as any[],
    };

    let dbGroups;
    let total = 0;
    const page = pageStr ? (parseInt(pageStr, 10) || 1) : null;
    const limit = parseInt(limitStr, 10) || 5;

    if (page !== null) {
      const skip = (page - 1) * limit;
      const [totalCount, groups] = await Promise.all([
        prisma.classGroup.count({ where: combinedWhere }),
        prisma.classGroup.findMany({
          where: combinedWhere,
          skip,
          take: limit,
          orderBy: { groupName: "asc" },
        }),
      ]);
      total = totalCount;
      dbGroups = groups;
    } else {
      dbGroups = await prisma.classGroup.findMany({
        where: combinedWhere,
        take: 10,
        orderBy: { groupName: "asc" },
      });
    }

    const dbEnrollments = await prisma.enrollment.findMany({
      where: { status: { equals: "active", mode: "insensitive" } },
    });

    const groupData = dbGroups.map((group) => {
      const studentCount = dbEnrollments.filter((e) =>
        e.classGroupIds.includes(group.id),
      ).length;

      return {
        id: group.id,
        name: group.groupName,
        studentCount,
        capacity: group.capacity || 8,
      };
    });

    if (page !== null) {
      return NextResponse.json({
        data: groupData,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    return NextResponse.json(groupData);
  } catch (error) {
    console.error("[Dashboard Groups API Error]", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await validateSession();
    if (!session) {
      logAudit({
        action: "create",
        target: "ClassGroup",
        status: "DENIED",
        details: "No active session found.",
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rbacCheck = checkRBAC(session.role, "ClassGroup", "write");
    if (!rbacCheck.allowed) {
      logAudit({
        userId: session.userId,
        role: session.role,
        action: "create",
        target: "ClassGroup",
        status: "DENIED",
        details: rbacCheck.reason,
      });
      return NextResponse.json({ error: rbacCheck.reason }, { status: 403 });
    }

    const body = await request.json();
    const {
      groupName,
      branchId,
      courseId,
      teacherId,
      roomId,
      termId,
      capacity,
      weekdays, // e.g. ["Mon", "Thu"]
      startTime, // e.g. "16:00"
    } = body;

    if (!groupName || !branchId || !courseId || !termId || !weekdays || weekdays.length === 0 || !startTime) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // Lookup term dates
    const term = await prisma.term.findUnique({
      where: { id: termId },
    });
    if (!term || !term.startDate || !term.endDate) {
      return NextResponse.json({ error: "Selected term has no start or end dates configured." }, { status: 400 });
    }

    // 1. Create ClassGroup in Airtable
    const airtableData = {
      "fld0hugbTJfWykog6": groupName,
      "fld1JBoWGWKKzZGm5": startTime,
      "fldAn13Aw3EIk07kU": Number(capacity) || 8,
      "fldEzlnrYrwTk3UTC": "Active",
      "fldO5MP5ijTdm7lGv": [courseId],
      "fldPvtA1ugZitmSkT": teacherId ? [teacherId] : [],
      "fldT6sSsiyMfzeVbl": weekdays,
      "fldVRgnzmNG4SWcAS": roomId ? [roomId] : [],
      "fldzQWsTvAK9VkcxC": [branchId],
      "fldzmR8v8uue3Ce0Q": [termId],
    };

    const newRecord = await airtableProxy.createRecord("classgroup", airtableData);

    // 2. Save ClassGroup to Prisma
    const classGroup = await prisma.classGroup.create({
      data: {
        id: newRecord.id,
        groupName,
        weekdays,
        startTime,
        capacity: Number(capacity) || 8,
        status: "Active",
        courseIds: [courseId],
        teacherIds: teacherId ? [teacherId] : [],
        roomIds: roomId ? [roomId] : [],
        termIds: [termId],
        branchIds: [branchId],
      },
    });

    // 3. Generate sessions day-by-day
    const weekdayMap: Record<string, number> = {
      "Sun": 0, "Mon": 1, "Tue": 2, "Wed": 3, "Thu": 4, "Fri": 5, "Sat": 6
    };
    const targetDays = weekdays.map((d: string) => weekdayMap[d]).filter((d: any) => d !== undefined);

    let hours = 9;
    let minutes = 0;
    const timeMatch = startTime.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10);
      minutes = parseInt(timeMatch[2], 10);
      const ampm = timeMatch[3];
      if (ampm && ampm.toUpperCase() === "PM" && hours < 12) {
        hours += 12;
      } else if (ampm && ampm.toUpperCase() === "AM" && hours === 12) {
        hours = 0;
      }
    }

    const startDate = new Date(term.startDate);
    const endDate = new Date(term.endDate);
    let current = new Date(startDate.getTime());

    const sessionsToCreate = [];

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      if (targetDays.includes(dayOfWeek)) {
        const sessionDate = new Date(current.getTime());
        sessionDate.setHours(hours, minutes, 0, 0);

        const dateStr = sessionDate.toISOString().split("T")[0];
        sessionsToCreate.push({
          dateStr,
          sessionDate,
          fields: {
            "fldNsZ1ZqsBjoLrBL": `SESS-${groupName}-${dateStr}`,
            "fldUvECWZHq4GtqW7": sessionDate.toISOString(),
            "fldqDJoUvxYzgG8iX": "Scheduled",
            "flduqKWGTffHWfUNj": [classGroup.id],
            "fld4yXmapYbpqSiGG": teacherId ? [teacherId] : [],
            "fldgrGJWXUCjxhXpT": [branchId],
          }
        });
      }
      current.setDate(current.getDate() + 1);
    }

    const generatedSessions = [];
    if (sessionsToCreate.length > 0) {
      const airtablePayloads = sessionsToCreate.map(s => s.fields);
      const airtableRecords = await airtableProxy.createRecords("session", airtablePayloads);

      const prismaPayloads = sessionsToCreate.map((s, idx) => {
        const record = airtableRecords[idx];
        return {
          id: record.id,
          sessionId: `SESS-${groupName}-${s.dateStr}`,
          dateTime: s.sessionDate,
          status: "Scheduled",
          classGroupIds: [classGroup.id],
          teacherIds: teacherId ? [teacherId] : [],
          branchIds: [branchId],
        };
      });

      await prisma.session.createMany({
        data: prismaPayloads,
      });

      generatedSessions.push(...prismaPayloads);
    }

    logAudit({
      userId: session.userId,
      role: session.role,
      action: "create",
      target: "ClassGroup",
      status: "APPROVED",
      details: `Created ClassGroup ${classGroup.id} and generated ${generatedSessions.length} sessions.`,
    }, request);

    return NextResponse.json({
      success: true,
      classGroup,
      sessionCount: generatedSessions.length,
    });
  } catch (error: any) {
    console.error("[Create Group Error]", error);
    return NextResponse.json({ error: error.message || "Internal server error." }, { status: 500 });
  }
}
