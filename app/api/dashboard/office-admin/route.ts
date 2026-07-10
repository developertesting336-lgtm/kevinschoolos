import { NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

import { normalizeRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await validateSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.userId;

    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, branchIds: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const userRole = normalizeRole(dbUser.role || "staff");
    if (userRole !== "office_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userBranchIds = dbUser.branchIds || [];

    // Fetch branches scoped to the office admin
    const branches = await prisma.branch.findMany({
      where: { id: { in: userBranchIds } },
      select: { id: true, name: true },
    });

    // Fetch terms, rooms, active courses, and recent activities scoped by branch
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
      prisma.activity.findMany({
        orderBy: { dateTime: "desc" },
        take: 100,
      }).then(async (recentActivities) => {
        const uniqueLeadIds = Array.from(
          new Set(recentActivities.flatMap((a: any) => a.leadIds || []))
        );
        const matchingLeads = await prisma.lead.findMany({
          where: {
            id: { in: uniqueLeadIds },
            branchIds: { hasSome: userBranchIds },
          },
          select: { id: true },
        });
        const allowedLeadIds = new Set(matchingLeads.map((l: any) => l.id));
        return recentActivities
          .filter((a: any) => a.leadIds.some((id: string) => allowedLeadIds.has(id)))
          .slice(0, 4);
      }),
    ]);

    return NextResponse.json({
      branches,
      terms,
      rooms,
      courses,
      recentActivities,
    });
  } catch (error) {
    console.error("[Office Admin Dashboard API Error]", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
