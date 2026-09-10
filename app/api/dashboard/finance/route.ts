import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { normalizeRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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
    if (userRole !== "finance" && userRole !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userBranchIds = dbUser.branchIds || [];

    // Owner has access to all branches. Finance has access to their assigned branchIds.
    let branches;
    if (userRole === "owner") {
      branches = await prisma.branch.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
    } else {
      branches = await prisma.branch.findMany({
        where: { id: { in: userBranchIds } },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
    }

    // Branch filter check
    const searchParams = request.nextUrl.searchParams;
    const branchFilter = searchParams.get("branchId") || searchParams.get("branch");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let branchScopedFilter: any = {};
    if (userRole === "finance") {
      branchScopedFilter = { branchIds: { hasSome: userBranchIds } };
    }

    let finalFilter: any = { ...branchScopedFilter };
    if (branchFilter) {
      if (userRole === "finance") {
        if (!userBranchIds.includes(branchFilter)) {
          finalFilter = {
            AND: [
              branchScopedFilter,
              { branchIds: { has: branchFilter } }
            ]
          };
        } else {
          finalFilter = { branchIds: { has: branchFilter } };
        }
      } else {
        finalFilter = { branchIds: { has: branchFilter } };
      }
    }

    // Build specific date filters for different models
    let paymentFilter = { ...finalFilter };
    let expenseFilter = { ...finalFilter };
    let teacherPayFilter = { ...finalFilter };
    let royaltyFilter = { ...finalFilter };
    let invoiceFilter = { ...finalFilter };

    if (startDate || endDate) {
      const dateCond: any = {};
      if (startDate) dateCond.gte = new Date(`${startDate}T00:00:00.000Z`);
      if (endDate) dateCond.lte = new Date(`${endDate}T23:59:59.999Z`);

      paymentFilter = { AND: [finalFilter, { date: dateCond }] };
      expenseFilter = { AND: [finalFilter, { date: dateCond }] };
      teacherPayFilter = { AND: [finalFilter, { period: dateCond }] };
      royaltyFilter = { AND: [finalFilter, { period: dateCond }] };
      invoiceFilter = { AND: [finalFilter, { issueDate: dateCond }] };
    }

    // Parallel fetch recent invoices, payments, expenses, and accounts
    const [
      invoices,
      payments,
      expenses,
      accounts,
      totalRevenueAgg,
      totalExpensesAgg,
      totalTeacherPayAgg,
      royaltiesList,
      outstandingAgg,
      activeTerm
    ] = await Promise.all([
      prisma.invoice.findMany({
        where: invoiceFilter,
        orderBy: { issueDate: "desc" },
        take: 4,
      }),
      prisma.payment.findMany({
        where: paymentFilter,
        orderBy: { date: "desc" },
        take: 4,
      }),
      prisma.expense.findMany({
        where: expenseFilter,
        orderBy: { date: "desc" },
        take: 4,
      }),
      prisma.account.findMany({
        where: finalFilter,
        orderBy: { accountNo: "asc" },
        take: 4,
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: paymentFilter,
      }),
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: expenseFilter,
      }),
      prisma.teacherPay.aggregate({
        _sum: { grossPay: true },
        where: teacherPayFilter,
      }),
      prisma.franchiseRoyalty.findMany({
        where: royaltyFilter,
        select: { revenueBase: true, royaltyPercent: true },
      }),
      prisma.invoice.aggregate({
        _sum: { amount: true },
        where: {
          AND: [
            invoiceFilter,
            { status: { not: "Paid" } }
          ]
        }
      }),
      prisma.term.findFirst({
        where: { status: "Active" }
      })
    ]);

    const totalRevenue = totalRevenueAgg._sum.amount || 0;
    const totalExpenses = totalExpensesAgg._sum.amount || 0;
    const totalTeacherPayroll = totalTeacherPayAgg._sum.grossPay || 0;
    const totalRoyalties = royaltiesList.reduce((sum, r) => sum + ((r.revenueBase || 0) * (r.royaltyPercent || 0)) / 100, 0);
    const outstandingPayments = outstandingAgg._sum.amount || 0;
    const currentAccountingPeriod = activeTerm?.termName || new Date().toLocaleString("default", { month: "long", year: "numeric" });

    return NextResponse.json({
      branches,
      invoices,
      payments,
      expenses,
      accounts,
      stats: {
        totalRevenue,
        totalExpenses,
        totalTeacherPayroll,
        totalRoyalties,
        outstandingPayments,
        currentAccountingPeriod,
      }
    });
  } catch (error) {
    console.error("[Finance Dashboard API Error]", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
