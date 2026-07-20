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
    if (userRole !== "smm") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userBranchIds = dbUser.branchIds || [];

    // Fetch branches scoped to SMM
    const branches = await prisma.branch.findMany({
      where: { id: { in: userBranchIds } },
      select: { id: true, name: true },
    });

    // Fetch active courses, recent CRM activities, and stats in branch scoped lookup
    const [courses, recentActivities, coursesCount, leadsCount, allTrials] = await Promise.all([
      prisma.course.findMany({
        where: { active: true },
        take: 4,
      }),
      prisma.activity.findMany({
        orderBy: { dateTime: "desc" },
        take: 100,
      }).then(async (activities) => {
        const uniqueLeadIds = Array.from(
          new Set(activities.flatMap((a: any) => a.leadIds || []))
        );
        const matchingLeads = await prisma.lead.findMany({
          where: {
            id: { in: uniqueLeadIds },
            branchIds: { hasSome: userBranchIds },
          },
          select: { id: true },
        });
        const allowedLeadIds = new Set(matchingLeads.map((l: any) => l.id));
        return activities
          .filter((a: any) => a.leadIds.some((id: string) => allowedLeadIds.has(id)))
          .slice(0, 4);
      }),
      prisma.course.count(),
      prisma.lead.count({
        where: { branchIds: { hasSome: userBranchIds } },
      }),
      prisma.trial.findMany({
        select: { leadIds: true },
      }),
    ]);

    // Calculate trials scoped to user's branches
    const trialLeadIds = Array.from(new Set(allTrials.flatMap((t: any) => t.leadIds || [])));
    const matchingTrialLeads = await prisma.lead.findMany({
      where: {
        id: { in: trialLeadIds },
        branchIds: { hasSome: userBranchIds },
      },
      select: { id: true },
    });
    const allowedTrialLeadIds = new Set(matchingTrialLeads.map((l: any) => l.id));
    const trialsCount = allTrials.filter((t: any) =>
      t.leadIds.some((id: string) => allowedTrialLeadIds.has(id))
    ).length;

    const stats = {
      branchesCount: branches.length,
      coursesCount,
      leadsCount,
      trialsCount,
    };

    return NextResponse.json({
      branches,
      courses,
      recentActivities,
      stats,
    });
  } catch (error) {
    console.error("[SMM Dashboard API Error]", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
