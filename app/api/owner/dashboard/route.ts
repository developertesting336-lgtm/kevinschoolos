import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkRBAC, getScopingFilter, normalizeRole } from "@/lib/rbac";
import { auditService, getVisibleFieldIds } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * GET /api/owner/dashboard
 * Owner/HQ Dashboard with role-based tile visibility.
 * - owner: all tiles, all branches
 * - office_admin: branch-scoped, no Financial Snapshot / Payroll Alerts
 * - smm: Admissions Funnel, Trial→Enrollment Conversion (from Channel Performance), Channel Performance band only
 */
export async function GET(request: NextRequest) {
  try {
    const session = await validateSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, role: true, branchIds: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const userRole = dbUser.role || "staff";
    const userBranchIds = dbUser.branchIds || [];
    const normRole = normalizeRole(userRole);

    // RBAC: only owner, office_admin, smm
    if (!["owner", "office_admin", "smm"].includes(normRole)) {
      auditService.logFailure(
        { id: dbUser.id, email: dbUser.email, role: userRole },
        "PERMISSION_DENIED",
        "OwnerDashboard",
        `Role '${userRole}' not permitted.`,
        request
      );
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Parse filters
    const searchParams = request.nextUrl.searchParams;
    const branchFilter = searchParams.get("branch") || searchParams.get("branchId") || "";
    const monthFilter = searchParams.get("month") || "";
    const courseFilter = searchParams.get("course") || "";
    const channelFilter = searchParams.get("channel") || "";

    // Resolve branch scope
    let effectiveBranchIds = userBranchIds;
    if (branchFilter) {
      if (normRole === "owner") {
        effectiveBranchIds = [branchFilter];
      } else {
        if (userBranchIds.includes(branchFilter)) {
          effectiveBranchIds = [branchFilter];
        } else {
          return NextResponse.json({ error: "Forbidden: branch not in scope." }, { status: 403 });
        }
      }
    }

    // Helper: build branch-scoped filter for a table
    const branchScope = async (tableName: string) => {
      return await getScopingFilter(
        { id: dbUser.id, role: userRole, branchIds: effectiveBranchIds },
        tableName
      );
    };

    // ─── KPI Tiles ────────────────────────────────────────────────────────
    const kpis: any = {};

    // Active Students & Enrollments (T2)
    if (["owner", "office_admin"].includes(normRole)) {
      const [studentScope, enrollmentScope] = await Promise.all([
        branchScope("Student"),
        branchScope("Enrollment"),
      ]);

      const [activeStudents, totalStudents, activeEnrollments, totalEnrollments] = await Promise.all([
        prisma.student.count({ where: { ...studentScope, status: { equals: "active", mode: "insensitive" } } }),
        prisma.student.count({ where: studentScope }),
        prisma.enrollment.count({ where: { ...enrollmentScope, status: { equals: "active", mode: "insensitive" } } }),
        prisma.enrollment.count({ where: enrollmentScope }),
      ]);

      kpis.activeStudents = activeStudents;
      kpis.totalStudents = totalStudents;
      kpis.activeEnrollments = activeEnrollments;
      kpis.totalEnrollments = totalEnrollments;
    }

    // Monthly Revenue & Receivables (T2 - Payments/Invoices)
    if (normRole === "owner") {
      const [paymentScope, invoiceScope] = await Promise.all([
        branchScope("Payment"),
        branchScope("Invoice"),
      ]);

      // Monthly revenue: sum of payments for the selected month
      let monthlyRevenueWhere: any = { ...paymentScope };
      if (monthFilter) {
        const [year, month] = monthFilter.split("-").map(Number);
        if (year && month) {
          const monthStart = new Date(year, month - 1, 1);
          const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
          monthlyRevenueWhere.date = { gte: monthStart, lte: monthEnd };
        }
      }

      const monthlyRevenue = await prisma.payment.aggregate({
        where: monthlyRevenueWhere,
        _sum: { amount: true },
      });

      // Receivables: sum of unpaid invoices
      const receivables = await prisma.invoice.aggregate({
        where: { ...invoiceScope, status: { notIn: ["Paid", "Cancelled"], mode: "insensitive" } },
        _sum: { amount: true },
      });

      kpis.monthlyRevenue = monthlyRevenue._sum.amount || 0;
      kpis.receivables = receivables._sum.amount || 0;
    }

    // Attendance Health (T3)
    if (["owner", "office_admin"].includes(normRole)) {
      const [sessionScope, attendanceScope] = await Promise.all([
        branchScope("Session"),
        branchScope("Attendance"),
      ]);

      const todaySessions = await prisma.session.count({
        where: { ...sessionScope, dateTime: { gte: startOfToday, lte: endOfToday } },
      });

      const presentToday = await prisma.attendance.count({
        where: {
          ...attendanceScope,
          status: { equals: "Present", mode: "insensitive" },
          sessionIds: { hasSome: (await prisma.session.findMany({
            where: { ...sessionScope, dateTime: { gte: startOfToday, lte: endOfToday } },
            select: { id: true },
          })).map(s => s.id) },
        },
      });

      const totalAttendance = await prisma.attendance.count({
        where: {
          ...attendanceScope,
          sessionIds: { hasSome: (await prisma.session.findMany({
            where: { ...sessionScope, dateTime: { gte: startOfToday, lte: endOfToday } },
            select: { id: true },
          })).map(s => s.id) },
        },
      });

      kpis.attendanceHealth = totalAttendance > 0 ? Math.round((presentToday / totalAttendance) * 100) : 0;
      kpis.todaySessions = todaySessions;
    }

    // Trial → Enrollment Conversion (from Channel Performance for smm, raw data for owner/office_admin)
    if (normRole === "smm") {
      // SMM gets this from Channel Performance
      const channelScope = await branchScope("ChannelPerformance");
      let channelWhere: any = { ...channelScope };
      if (channelFilter) {
        channelWhere.channel = { equals: channelFilter, mode: "insensitive" };
      }
      if (monthFilter) {
        channelWhere.month = monthFilter;
      }

      const channelData = await prisma.channelPerformance.findMany({
        where: channelWhere,
        select: { month: true, channel: true, leads: true, trialsBooked: true, trialsAttended: true, enrolled: true, lost: true, updatedAt: true },
        orderBy: { month: "desc" },
        take: 12,
      }) as any[];

      kpis.channelPerformance = channelData;
      kpis.trialToEnrollmentConversion = channelData.length > 0 && channelData[0].trialsAttended
        ? Math.round((channelData[0].enrolled / channelData[0].trialsAttended) * 100)
        : null;
    } else {
      // Owner/office_admin: compute from raw data
      const [leadScope, trialScope, enrollmentScope] = await Promise.all([
        branchScope("Lead"),
        branchScope("Trial"),
        branchScope("Enrollment"),
      ]);

      const totalLeads = await prisma.lead.count({ where: leadScope });
      const trialsBooked = await prisma.trial.count({ where: trialScope });
      const trialsAttended = await prisma.trial.count({
        where: { ...trialScope, outcome: { notIn: ["No Show", "Cancelled"], mode: "insensitive" } },
      });
      const enrolled = await prisma.enrollment.count({ where: enrollmentScope });

      kpis.trialToEnrollmentConversion = trialsAttended > 0 ? Math.round((enrolled / trialsAttended) * 100) : 0;
      kpis.leadsCount = totalLeads;
      kpis.trialsBooked = trialsBooked;
      kpis.trialsAttended = trialsAttended;
      kpis.enrolled = enrolled;
    }

    // ─── Admissions Funnel ────────────────────────────────────────────────
    const funnel: any = {};
    if (["owner", "office_admin", "smm"].includes(normRole)) {
      const [leadScope, trialScope, enrollmentScope] = await Promise.all([
        branchScope("Lead"),
        branchScope("Trial"),
        branchScope("Enrollment"),
      ]);

      const [totalLeads, trialsBooked, trialsAttended, enrolled, lost] = await Promise.all([
        prisma.lead.count({ where: leadScope }),
        prisma.trial.count({ where: trialScope }),
        prisma.trial.count({
          where: { ...trialScope, outcome: { notIn: ["No Show", "Cancelled"], mode: "insensitive" } },
        }),
        prisma.enrollment.count({ where: enrollmentScope }),
        prisma.lead.count({ where: { ...leadScope, status: { equals: "Lost", mode: "insensitive" } } }),
      ]);

      funnel.totalLeads = totalLeads;
      funnel.trialsBooked = trialsBooked;
      funnel.trialsAttended = trialsAttended;
      funnel.enrolled = enrolled;
      funnel.lost = lost;
    }

    // ─── Financial Snapshot (owner only) ──────────────────────────────────
    let financialSnapshot: any = null;
    if (normRole === "owner") {
      const [paymentScope, invoiceScope, expenseScope] = await Promise.all([
        branchScope("Payment"),
        branchScope("Invoice"),
        branchScope("Expense"),
      ]);

      const [totalRevenue, totalExpenses, pendingInvoices] = await Promise.all([
        prisma.payment.aggregate({ where: paymentScope, _sum: { amount: true } }),
        prisma.expense.aggregate({ where: expenseScope, _sum: { amount: true } }),
        prisma.invoice.count({
          where: { ...invoiceScope, status: { notIn: ["Paid", "Cancelled"], mode: "insensitive" } },
        }),
      ]);

      financialSnapshot = {
        totalRevenue: totalRevenue._sum.amount || 0,
        totalExpenses: totalExpenses._sum.amount || 0,
        netProfit: (totalRevenue._sum.amount || 0) - (totalExpenses._sum.amount || 0),
        pendingInvoices,
      };
    }

    // ─── Payroll Alerts (owner only) ──────────────────────────────────────
    let payrollAlerts: any = null;
    if (normRole === "owner") {
      const [teacherPayScope, teacherHoursScope] = await Promise.all([
        branchScope("TeacherPay"),
        branchScope("TeacherHours"),
      ]);

      const unpaidPayments = await prisma.teacherPay.count({
        where: { ...teacherPayScope, status: { equals: "Pending", mode: "insensitive" } },
      });

      const unconfirmedHours = await prisma.teacherHours.count({
        where: teacherHoursScope,
      });

      payrollAlerts = {
        unpaidPayments,
        unconfirmedHours,
      };
    }

    // ─── Channel Performance Band ─────────────────────────────────────────
    let channelPerformance: any = null;
    if (["owner", "office_admin", "smm"].includes(normRole)) {
      const channelScope = await branchScope("ChannelPerformance");
      let channelWhere: any = { ...channelScope };
      if (channelFilter) {
        channelWhere.channel = { equals: channelFilter, mode: "insensitive" };
      }
      if (monthFilter) {
        channelWhere.month = monthFilter;
      }

      const channelData = await prisma.channelPerformance.findMany({
        where: channelWhere,
        select: {
          id: true,
          month: true,
          channel: true,
          leads: true,
          trialsBooked: true,
          trialsAttended: true,
          enrolled: true,
          lost: true,
          updatedAt: true,
        },
        orderBy: { month: "desc" },
        take: 12,
      }) as any[];

      // Compute freshness and derived rates from raw data
      const latestUpdate = channelData.length > 0 ? new Date(channelData[0].updatedAt) : null;
      const staleThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours
      const isStale = !latestUpdate || latestUpdate < staleThreshold;

      const enrichedChannelData = channelData.map(row => ({
        ...row,
        trialBookedRate: row.leads ? Math.round(((row.trialsBooked || 0) / row.leads) * 1000) / 10 : null,
        showRate: row.trialsBooked ? Math.round(((row.trialsAttended || 0) / row.trialsBooked) * 1000) / 10 : null,
        closeRate: row.trialsAttended ? Math.round(((row.enrolled || 0) / row.trialsAttended) * 1000) / 10 : null,
      }));

      channelPerformance = {
        data: enrichedChannelData,
        lastUpdated: latestUpdate ? latestUpdate.toISOString() : null,
        isStale,
        staleMessage: isStale ? "Data may be outdated. Last automation run: " + (latestUpdate ? latestUpdate.toLocaleString() : "never") : null,
      };
    }

    // ─── Enrollment Trend ─────────────────────────────────────────────────
    let enrollmentTrend: any = null;
    if (["owner", "office_admin"].includes(normRole)) {
      const enrollmentScope = await branchScope("Enrollment");
      const enrollments = await prisma.enrollment.findMany({
        where: enrollmentScope,
        select: { enrollDate: true, status: true },
        orderBy: { enrollDate: "asc" },
      });

      // Group by month
      const trendMap: Record<string, number> = {};
      for (const e of enrollments) {
        if (e.enrollDate) {
          const monthKey = new Date(e.enrollDate).toISOString().substring(0, 7);
          trendMap[monthKey] = (trendMap[monthKey] || 0) + 1;
        }
      }

      enrollmentTrend = Object.entries(trendMap).map(([month, count]) => ({ month, count }));
    }

    // ─── Assemble Response ────────────────────────────────────────────────
    const response: any = {
      role: normRole,
      branchIds: effectiveBranchIds,
      filters: {
        branch: branchFilter,
        month: monthFilter,
        course: courseFilter,
        channel: channelFilter,
      },
      kpis,
      funnel,
      enrollmentTrend,
      channelPerformance,
    };

    if (financialSnapshot) {
      response.financialSnapshot = financialSnapshot;
    }
    if (payrollAlerts) {
      response.payrollAlerts = payrollAlerts;
    }

    // Audit: log dashboard access
    auditService.log({
      actorId: dbUser.id,
      actorEmail: dbUser.email,
      role: userRole,
      branchIds: effectiveBranchIds,
      action: "VIEW",
      tableName: "OwnerDashboard",
      recordIds: [],
      fieldIds: [],
      result: "SUCCESS",
      details: `Dashboard accessed with role ${normRole}.`,
    }, request);

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[Owner Dashboard Error]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// Block writes
export async function POST() {
  return NextResponse.json({ error: "Phase 1/2 is read-only. Writes are blocked." }, { status: 403 });
}
export async function PUT() {
  return NextResponse.json({ error: "Phase 1/2 is read-only. Writes are blocked." }, { status: 403 });
}
export async function PATCH() {
  return NextResponse.json({ error: "Phase 1/2 is read-only. Writes are blocked." }, { status: 403 });
}
export async function DELETE() {
  return NextResponse.json({ error: "Phase 1/2 is read-only. Writes are blocked." }, { status: 403 });
}