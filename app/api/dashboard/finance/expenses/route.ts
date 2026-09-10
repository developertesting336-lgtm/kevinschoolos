import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { normalizeRole } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import * as airtableProxy from "@/lib/airtableProxy";

export const dynamic = "force-dynamic";

// GET /api/dashboard/finance/expenses
export async function GET(request: NextRequest) {
  try {
    const session = await validateSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
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
    let branchScopedFilter: any = {};
    if (userRole === "finance") {
      branchScopedFilter = { branchIds: { hasSome: userBranchIds } };
    }

    // Parse params
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "10", 10));
    const skip = (page - 1) * limit;
    const branchFilter = searchParams.get("branchId") || searchParams.get("branch");
    const search = searchParams.get("search");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build filters
    const whereConditions: any[] = [];
    if (userRole === "finance") {
      whereConditions.push(branchScopedFilter);
    }
    if (branchFilter) {
      whereConditions.push({ branchIds: { has: branchFilter } });
    }
    if (startDate || endDate) {
      const dateCond: any = {};
      if (startDate) dateCond.gte = new Date(`${startDate}T00:00:00.000Z`);
      if (endDate) dateCond.lte = new Date(`${endDate}T23:59:59.999Z`);
      whereConditions.push({ date: dateCond });
    }
    if (search && search.trim()) {
      const query = search.trim();
      whereConditions.push({
        OR: [
          { description: { contains: query, mode: "insensitive" } },
          { expenseNo: { contains: query, mode: "insensitive" } },
          { paymentMethod: { contains: query, mode: "insensitive" } },
          { notes: { contains: query, mode: "insensitive" } },
        ],
      });
    }

    const where = whereConditions.length > 0 ? { AND: whereConditions } : {};

    // Fetch expenses
    const [total, expenses] = await Promise.all([
      prisma.expense.count({ where }),
      prisma.expense.findMany({
        where,
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const expenseIds = expenses.map((e) => e.id);
    const approvals = await prisma.expenseApproval.findMany({
      where: { expenseId: { in: expenseIds } },
    });
    const approvalMap = new Map(approvals.map((a) => [a.expenseId, a]));

    // Fetch related vendors and branches
    const vendorIds = Array.from(new Set(expenses.flatMap((e) => e.vendorIds)));
    const branchIds = Array.from(new Set(expenses.flatMap((e) => e.branchIds)));

    const [vendors, branches] = await Promise.all([
      vendorIds.length > 0
        ? prisma.vendor.findMany({
            where: { id: { in: vendorIds } },
            select: { id: true, vendorName: true, category: true },
          })
        : [],
      branchIds.length > 0
        ? prisma.branch.findMany({
            where: { id: { in: branchIds } },
            select: { id: true, name: true },
          })
        : [],
    ]);

    const vendorMap = new Map(vendors.map((v) => [v.id, v]));
    const branchMap = new Map(branches.map((b) => [b.id, b.name]));

    // Format data, map vendor name/category, branch names, and approval status
    const data = expenses.map((exp) => {
      const vendor = exp.vendorIds.map((id) => vendorMap.get(id)).filter(Boolean)[0] || null;
      const appr = approvalMap.get(exp.id);
      return {
        ...exp,
        vendorName: vendor ? vendor.vendorName : "Unknown Vendor",
        category: vendor ? (vendor.category || "Operational") : "Operational",
        branchName: exp.branchIds.map((id) => branchMap.get(id)).filter(Boolean).join(", ") || "General",
        submittedBy: "Branch Admin",
        approvalStatus: appr ? appr.status : exp.paid ? "Approved" : "Pending Approval",
        approvalId: appr?.id || null,
      };
    });

    return NextResponse.json({
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("[Finance Expenses API Error]", error);
    return NextResponse.json(
      { error: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}

// POST /api/dashboard/finance/expenses
// Approve or Reject an expense (strictly for Finance or Owner role)
export async function POST(request: NextRequest) {
  try {
    const session = await validateSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, role: true, fullName: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const userRole = normalizeRole(dbUser.role || "staff");
    if (userRole !== "finance" && userRole !== "owner") {
      return NextResponse.json({ error: "Forbidden: Only Finance or Owner can approve or reject expenses." }, { status: 403 });
    }

    const body = await request.json();
    const { expenseId, status, rejectionReason } = body;

    if (!expenseId || !status) {
      return NextResponse.json({ error: "expenseId and status are required." }, { status: 400 });
    }

    if (status !== "Approved" && status !== "Rejected") {
      return NextResponse.json({ error: "Status must be 'Approved' or 'Rejected'." }, { status: 400 });
    }

    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
    });

    if (!expense) {
      return NextResponse.json({ error: "Expense not found." }, { status: 404 });
    }

    // Upsert ExpenseApproval record
    const approval = await prisma.expenseApproval.upsert({
      where: { expenseId },
      update: {
        status,
        approvedById: dbUser.id,
        approvedDate: new Date(),
        rejectionReason: rejectionReason || null,
      },
      create: {
        id: `appr_${expenseId}`,
        expenseId,
        status,
        approvedById: dbUser.id,
        approvedDate: new Date(),
        rejectionReason: rejectionReason || null,
      },
    });

    // When approved, check if expense is not already paid, and set paid to true
    if (status === "Approved") {
      if (!expense.paid) {
        await prisma.expense.update({
          where: { id: expenseId },
          data: { paid: true },
        });

        try {
          await airtableProxy.updateRecord("expense", expenseId, { "fldTdMu8Si7mJ7oB2": true });
        } catch (airtableErr: any) {
          console.warn("[Expense Approval] Could not update Airtable paid field:", airtableErr.message);
        }
      }
    }

    // Audit Log
    logAudit(
      {
        userId: dbUser.id,
        role: dbUser.role || "finance",
        action: status === "Approved" ? "approve" : "reject",
        target: "Expense",
        status: status.toUpperCase(),
        details: `${status} expense ${expense.expenseNo} (${expense.amount} KGS).`,
      },
      request
    );

    return NextResponse.json({
      success: true,
      expenseId,
      status: approval.status,
      approval,
    });
  } catch (error: any) {
    console.error("[Finance Expense Approval Error]", error);
    return NextResponse.json(
      { error: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}