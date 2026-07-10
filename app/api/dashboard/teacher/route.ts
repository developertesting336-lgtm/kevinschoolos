import { NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await validateSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacherId = session.userId;

    // 1. Fetch teacher class groups
    const teacherClasses = await prisma.classGroup.findMany({
      where: { teacherIds: { has: teacherId } },
      select: { id: true, status: true },
    });
    const classIds = teacherClasses.map((c: any) => c.id);

    // 2. Fetch active students in teacher class groups
    const teacherEnrollments = await prisma.enrollment.findMany({
      where: {
        classGroupIds: { hasSome: classIds },
        status: { equals: "active", mode: "insensitive" },
      },
      select: { studentIds: true },
    });
    const studentIds = Array.from(
      new Set(teacherEnrollments.flatMap((e: any) => e.studentIds))
    );

    // 3. Fetch today's scheduled classes (sessions)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const todayClassesCount = await prisma.session.count({
      where: {
        teacherIds: { has: teacherId },
        dateTime: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    // 4. Fetch upcoming trial classes
    const trialsCount = await prisma.trial.count({
      where: {
        teacherIds: { has: teacherId },
        dateTime: { gte: new Date() },
      },
    });

    // 5. Calculate attendance rate
    const teacherSessions = await prisma.session.findMany({
      where: { teacherIds: { has: teacherId } },
      select: { id: true },
    });
    const sessionIds = teacherSessions.map((s: any) => s.id);

    const attendances = await prisma.attendance.findMany({
      where: { sessionIds: { hasSome: sessionIds } },
      select: { status: true },
    });

    const totalAttendance = attendances.length;
    const presentAttendance = attendances.filter(
      (a: any) => a.status?.toLowerCase() === "present"
    ).length;
    const attendanceRate =
      totalAttendance > 0
        ? Math.round((presentAttendance / totalAttendance) * 100)
        : 100;

    // 6. Fetch branches scoped to the teacher for mapping
    const dbUser = await prisma.user.findUnique({
      where: { id: teacherId },
      select: { branchIds: true },
    });
    const userBranchIds = dbUser?.branchIds || [];

    const branches = await prisma.branch.findMany({
      where: { id: { in: userBranchIds } },
      select: { id: true, name: true },
    });

    // 7. Fetch terms, rooms, active courses, and recent activities for overview widgets
    const [terms, rooms, courses, recentActivities] = await Promise.all([
      prisma.term.findMany({
        orderBy: { startDate: "asc" },
        take: 3,
      }),
      prisma.room.findMany({
        where: { branchIds: { hasSome: userBranchIds } },
        orderBy: { roomName: "asc" },
        take: 4,
      }),
      prisma.course.findMany({
        where: { active: true },
        take: 3,
      }),
      prisma.lead.findMany({
        where: { ownerIds: { has: teacherId } },
        select: { id: true },
      }).then(async (teacherLeads) => {
        const leadIds = teacherLeads.map((l: any) => l.id);
        return prisma.activity.findMany({
          where: {
            OR: [
              { ownerIds: { has: teacherId } },
              { leadIds: { hasSome: leadIds } },
            ],
          },
          orderBy: { dateTime: "desc" },
          take: 4,
        });
      }),
    ]);

    const statsData = {
      totalClasses: teacherClasses.length,
      activeStudents: studentIds.length,
      todayClasses: todayClassesCount,
      upcomingSessions: sessionIds.length,
      attendanceRate,
      pendingAttendance: 0,
      upcomingTrials: trialsCount,
    };

    return NextResponse.json({
      statsData,
      branches,
      teacherId,
      terms,
      rooms,
      courses,
      recentActivities,
    });
  } catch (error) {
    console.error("[Teacher Dashboard API Error]", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}