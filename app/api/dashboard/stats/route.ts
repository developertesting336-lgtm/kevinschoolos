import { NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { normalizeRole } from "@/lib/roles";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Authentication
    const session = await validateSession();
    if (!session) {
      logAudit({
        action: "read",
        target: "DashboardStats",
        status: "DENIED",
        details: "No active session found.",
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!dbUser) {
      logAudit({
        action: "read",
        target: "DashboardStats",
        status: "DENIED",
        details: `User ID ${session.userId} not found in database.`,
      });
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    // 2. RBAC check (implied by dashboard overview visibility)
    const role = normalizeRole(dbUser.role || "staff");
    const userBranchIds = dbUser.branchIds || [];

    // 3. Branch Scoping filter setup
    const branchScopedFilter = role !== "owner" ? { branchIds: { hasSome: userBranchIds } } : {};

    // 4. Audit & Response per Role
    if (role === "owner") {
      const activeStudents = await prisma.student.count({
        where: { status: { equals: "active", mode: "insensitive" } },
      });
      const totalStudents = await prisma.student.count();
      const activeGroups = await prisma.classGroup.count({
        where: { status: { equals: "active", mode: "insensitive" } },
      });
      const totalGroups = await prisma.classGroup.count();
      const activeEnrollments = await prisma.enrollment.count({
        where: { status: { equals: "active", mode: "insensitive" } },
      });
      const totalEnrollments = await prisma.enrollment.count();
      const totalStaff = await prisma.user.count();
      const teachersCount = await prisma.user.count({
        where: { role: { equals: "teacher", mode: "insensitive" } },
      });
      const branchesCount = await prisma.branch.count();
      const roomsCount = await prisma.room.count();
      const coursesCount = await prisma.course.count();
      const parentsCount = await prisma.parent.count();
      const recentPayments = await prisma.payment.count();

      logAudit({
        userId: dbUser.id,
        role: dbUser.role || "staff",
        action: "read",
        target: "DashboardStats",
        status: "APPROVED",
        details: "Owner loaded global dashboard stats.",
      });

      return NextResponse.json({
        activeStudents,
        totalStudents,
        activeGroups,
        totalGroups,
        activeEnrollments,
        totalEnrollments,
        totalStaff,
        teachersCount,
        branchesCount,
        roomsCount,
        coursesCount,
        parentsCount,
        recentPayments,
      });
    }

    if (role === "tech_admin") {
      const branchesCount = await prisma.branch.count();
      const roomsCount = await prisma.room.count();
      const coursesCount = await prisma.course.count();

      logAudit({
        userId: dbUser.id,
        role: dbUser.role || "staff",
        action: "read",
        target: "DashboardStats",
        status: "APPROVED",
        details: "Tech Admin loaded system-level diagnostics dashboard stats.",
      });

      return NextResponse.json({
        activeStudents: 0,
        totalStudents: 0,
        activeGroups: 0,
        totalGroups: 0,
        activeEnrollments: 0,
        totalEnrollments: 0,
        totalStaff: 0,
        teachersCount: 0,
        branchesCount,
        roomsCount,
        coursesCount,
        parentsCount: 0,
        recentPayments: 0,
      });
    }

    if (role === "finance") {
      const recentPayments = await prisma.payment.count({
        where: branchScopedFilter,
      });

      logAudit({
        userId: dbUser.id,
        role: dbUser.role || "staff",
        action: "read",
        target: "DashboardStats",
        status: "APPROVED",
        details: `Finance loaded stats scoped to branches: ${JSON.stringify(userBranchIds)}`,
      });

      return NextResponse.json({
        activeStudents: 0,
        totalStudents: 0,
        activeGroups: 0,
        totalGroups: 0,
        activeEnrollments: 0,
        totalEnrollments: 0,
        totalStaff: 0,
        teachersCount: 0,
        branchesCount: await prisma.branch.count({ where: { id: { in: userBranchIds } } }),
        roomsCount: 0,
        coursesCount: 0,
        parentsCount: 0,
        recentPayments,
      });
    }

    if (role === "office_admin") {
      const activeStudents = await prisma.student.count({
        where: { AND: [{ status: { equals: "active", mode: "insensitive" } }, branchScopedFilter] },
      });
      const totalStudents = await prisma.student.count({ where: branchScopedFilter });
      const activeGroups = await prisma.classGroup.count({
        where: { AND: [{ status: { equals: "active", mode: "insensitive" } }, branchScopedFilter] },
      });
      const totalGroups = await prisma.classGroup.count({ where: branchScopedFilter });
      const activeEnrollments = await prisma.enrollment.count({
        where: { AND: [{ status: { equals: "active", mode: "insensitive" } }, branchScopedFilter] },
      });
      const totalEnrollments = await prisma.enrollment.count({ where: branchScopedFilter });
      const totalStaff = await prisma.user.count({ where: branchScopedFilter });
      const teachersCount = await prisma.user.count({
        where: { AND: [{ role: { equals: "teacher", mode: "insensitive" } }, branchScopedFilter] },
      });
      const branchesCount = await prisma.branch.count({ where: { id: { in: userBranchIds } } });
      const roomsCount = await prisma.room.count({ where: branchScopedFilter });
      const coursesCount = await prisma.course.count();
      const parentsCount = await prisma.parent.count({ where: branchScopedFilter });
      const recentPayments = await prisma.payment.count({ where: branchScopedFilter });
      const invoicesCount = await prisma.invoice.count({ where: branchScopedFilter });
      const leadsCount = await prisma.lead.count({ where: branchScopedFilter });

      const allTrials = await prisma.trial.findMany({
        select: { leadIds: true },
      });
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

      logAudit({
        userId: dbUser.id,
        role: dbUser.role || "staff",
        action: "read",
        target: "DashboardStats",
        status: "APPROVED",
        details: `Office Admin loaded stats scoped to branches: ${JSON.stringify(userBranchIds)}`,
      });

      return NextResponse.json({
        activeStudents,
        totalStudents,
        activeGroups,
        totalGroups,
        activeEnrollments,
        totalEnrollments,
        totalStaff,
        teachersCount,
        branchesCount,
        roomsCount,
        coursesCount,
        parentsCount,
        recentPayments,
        invoicesCount,
        leadsCount,
        trialsCount,
      });
    }

    if (role === "teacher") {
      const classGroups = await prisma.classGroup.findMany({
        where: { teacherIds: { has: session.userId } },
      });
      const groupIds = classGroups.map((g) => g.id);

      const enrollments = await prisma.enrollment.findMany({
        where: { classGroupIds: { hasSome: groupIds } },
      });
      const activeEnrollmentsList = enrollments.filter((e) => e.status?.toLowerCase() === "active");

      const activeStudentsSet = new Set(activeEnrollmentsList.flatMap((e) => e.studentIds));
      const totalStudentsSet = new Set(enrollments.flatMap((e) => e.studentIds));

      logAudit({
        userId: dbUser.id,
        role: dbUser.role || "staff",
        action: "read",
        target: "DashboardStats",
        status: "APPROVED",
        details: `Teacher loaded stats scoped to class groups: ${JSON.stringify(groupIds)}`,
      });

      return NextResponse.json({
        activeStudents: activeStudentsSet.size,
        totalStudents: totalStudentsSet.size,
        activeGroups: classGroups.filter((g) => g.status?.toLowerCase() === "active").length,
        totalGroups: classGroups.length,
        activeEnrollments: activeEnrollmentsList.length,
        totalEnrollments: enrollments.length,
        totalStaff: 0,
        teachersCount: 0,
        branchesCount: await prisma.branch.count({ where: { id: { in: userBranchIds } } }),
        roomsCount: 0,
        coursesCount: 0,
        parentsCount: 0,
        recentPayments: 0,
      });
    }

    if (role === "smm") {
      const branchesCount = await prisma.branch.count({ where: { id: { in: userBranchIds } } });
      const coursesCount = await prisma.course.count();
      const leadsCount = await prisma.lead.count({ where: branchScopedFilter });

      const allTrials = await prisma.trial.findMany({
        select: { leadIds: true },
      });
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

      logAudit({
        userId: dbUser.id,
        role: dbUser.role || "staff",
        action: "read",
        target: "DashboardStats",
        status: "APPROVED",
        details: `SMM loaded stats scoped to branches: ${JSON.stringify(userBranchIds)}`,
      });

      return NextResponse.json({
        activeStudents: 0,
        totalStudents: 0,
        activeGroups: 0,
        totalGroups: 0,
        activeEnrollments: 0,
        totalEnrollments: 0,
        totalStaff: 0,
        teachersCount: 0,
        branchesCount,
        roomsCount: 0,
        coursesCount,
        parentsCount: 0,
        recentPayments: 0,
        leadsCount,
        trialsCount,
      });
    }

    if (role === "finance") {
      const branchScopedFilter = { branchIds: { hasSome: userBranchIds } };

      const [
        activeStudents,
        totalStudents,
        activeEnrollments,
        totalEnrollments,
        invoicesCount,
        paymentsCount,
        branchesCount,
        coursesCount,
      ] = await Promise.all([
        prisma.student.count({
          where: { AND: [{ status: { equals: "active", mode: "insensitive" } }, branchScopedFilter] },
        }),
        prisma.student.count({ where: branchScopedFilter }),
        prisma.enrollment.count({
          where: { AND: [{ status: { equals: "active", mode: "insensitive" } }, branchScopedFilter] },
        }),
        prisma.enrollment.count({ where: branchScopedFilter }),
        prisma.invoice.count({ where: branchScopedFilter }),
        prisma.payment.count({ where: branchScopedFilter }),
        prisma.branch.count({ where: { id: { in: userBranchIds } } }),
        prisma.course.count(),
      ]);

      logAudit({
        userId: dbUser.id,
        role: dbUser.role || "staff",
        action: "read",
        target: "DashboardStats",
        status: "APPROVED",
        details: `Finance loaded stats scoped to branches: ${JSON.stringify(userBranchIds)}`,
      });

      return NextResponse.json({
        activeStudents,
        totalStudents,
        activeGroups: 0,
        totalGroups: 0,
        activeEnrollments,
        totalEnrollments,
        totalStaff: 0,
        teachersCount: 0,
        branchesCount,
        roomsCount: 0,
        coursesCount,
        parentsCount: 0,
        recentPayments: paymentsCount,
        invoicesCount,
      });
    }

    logAudit({
      userId: dbUser.id,
      role: dbUser.role || "staff",
      action: "read",
      target: "DashboardStats",
      status: "DENIED",
      details: "Unknown role access denied.",
    });

    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  } catch (error) {
    console.error("[Dashboard Stats API Error]", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
