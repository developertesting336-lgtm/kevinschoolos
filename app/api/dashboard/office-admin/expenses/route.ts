import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { normalizeRole } from "@/lib/roles";
import * as airtableProxy from "@/lib/airtableProxy";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

interface ExpenseInput {
  date: string;
  description: string;
  amount: number;
  paymentMethod: string;
  vendorId: string;
  expenseAccountId: string;
  branchId: string;
  paid: boolean;
  notes?: string;
}

// POST /api/dashboard/office-admin/expenses
export async function POST(request: NextRequest) {
  try {
    const session = await validateSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, role: true, branchIds: true, fullName: true, email: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const userRole = normalizeRole(dbUser.role || "staff");
    if (userRole !== "office_admin" && userRole !== "owner") {
      return NextResponse.json({ error: "Forbidden: Only Office Admin or Owner can create expenses." }, { status: 403 });
    }

    const body: ExpenseInput = await request.json();

    // --- Validation ---
    const errors: string[] = [];

    // 1. Description is required
    if (!body.description || !body.description.trim()) {
      errors.push("Description is required.");
    }

    // 2. Amount must be greater than zero
    if (body.amount === undefined || body.amount === null || Number(body.amount) <= 0) {
      errors.push("Amount (KGS) must be greater than zero.");
    }

    // 3. Payment Method is required
    const validPaymentMethods = ["Cash", "Bank Transfer", "Card", "On Account (Unpaid)"];
    if (!body.paymentMethod || !validPaymentMethods.includes(body.paymentMethod)) {
      errors.push("Payment Method is required and must be one of: Cash, Bank Transfer, Card, On Account (Unpaid).");
    }

    // 4. Vendor is required
    if (!body.vendorId) {
      errors.push("Vendor is required.");
    }

    // 5. Expense Account is required
    if (!body.expenseAccountId) {
      errors.push("Expense Account is required.");
    }

    // Return early if basic validation fails
    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
    }

    const vendor = await prisma.vendor.findUnique({ where: { id: body.vendorId } });
    if (!vendor) {
      return NextResponse.json({ error: "Selected Vendor does not exist." }, { status: 400 });
    }

    const userBranchIds = dbUser.branchIds || [];
    const expenseBranchId = body.branchId || userBranchIds[0];

    if (!expenseBranchId) {
      return NextResponse.json({ error: "No branch assigned to your account. Cannot create expense." }, { status: 400 });
    }

    if (!vendor.branchIds.includes(expenseBranchId)) {
      return NextResponse.json(
        { error: "Selected Vendor does not belong to your branch. Please select a vendor from your branch." },
        { status: 400 }
      );
    }

    const expenseAccount = await prisma.account.findUnique({ where: { id: body.expenseAccountId } });
    if (!expenseAccount) {
      return NextResponse.json({ error: "Selected Expense Account does not exist." }, { status: 400 });
    }
    if (expenseAccount.active !== true) {
      return NextResponse.json({ error: "Selected Expense Account is not active." }, { status: 400 });
    }

    const expenseCount = await prisma.expense.count();
    const expenseNo = `EXP-${String(expenseCount + 1).padStart(4, "0")}`;

    const expenseDate = body.date ? new Date(body.date) : new Date();

    const airtableData: Record<string, any> = {
      "fldJc78XmxkOrUd4u": expenseNo,                          // Expense No / Номер расхода
      "fldVS53LAjlqd4cIa": expenseDate.toISOString().split("T")[0], // Date / Дата
      "fldm0uNTuKoeLHhny": body.description,                   // Description / Описание
      "fldLv6BNV3WrJVjSZ": Number(body.amount),                // Amount (KGS) / Сумма (сом)
      "fldGjqThQ37a4z9fl": body.paymentMethod,                 // Payment Method / Способ оплаты
      "fldmATbX0cz4GGO2c": [body.vendorId],                    // Vendor
      "fld6ps8NBgIa48a4i": [body.expenseAccountId],            // Expense Account
      "fldcbXhKHHUF8uMEY": [expenseBranchId],                  // Branch
      "fldTdMu8Si7mJ7oB2": body.paid,                          // Paid / Оплачено
    };
    if (body.notes) {
      airtableData["fldXaco0O6sIvFb3V"] = body.notes;          // Notes / Заметки
    }

    // 10. Create record in Airtable
    let createdAirtable;
    try {
      createdAirtable = await airtableProxy.createRecord("expense", airtableData);
    } catch (err: any) {
      console.error("[Expense Airtable Write Error]", err);
      return NextResponse.json({ error: `Airtable synchronization failed: ${err.message}` }, { status: 502 });
    }

    // 11. Save to Postgres
    const newExpense = await prisma.expense.create({
      data: {
        id: createdAirtable.id,
        expenseNo,
        date: expenseDate,
        description: body.description,
        amount: Number(body.amount),
        paymentMethod: body.paymentMethod,
        paid: body.paid,
        notes: body.notes || null,
        vendorIds: [body.vendorId],
        expenseAccountIds: [body.expenseAccountId],
        branchIds: [expenseBranchId],
      },
    });

    // 12. Create ExpenseApproval record with Pending Approval status
    let approval = null;
    try {
      approval = await prisma.expenseApproval.create({
        data: {
          id: `appr_${createdAirtable.id}`,
          expenseId: createdAirtable.id,
          status: "Pending Approval",
        },
      });
    } catch (approvalError: any) {
      console.warn("[ExpenseApproval] Could not create approval record:", approvalError.message);
      // Continue without approval record if table doesn't exist yet
    }

    // 13. Log Audit
    logAudit(
      {
        userId: dbUser.id,
        role: dbUser.role || "office_admin",
        action: "create",
        target: "Expense",
        status: "PENDING_APPROVAL",
        details: `Created expense ${expenseNo} (${body.description}) for ${body.amount} KGS. Sent for approval.`,
      },
      request
    );

    return NextResponse.json(
      {
        ...newExpense,
        approval: approval
          ? { id: approval.id, status: approval.status }
          : { id: null, status: "Pending Approval" },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Office Admin Create Expense Error]", error);
    return NextResponse.json({ error: error.message || "Internal server error." }, { status: 500 });
  }
}

// GET /api/dashboard/office-admin/expenses
export async function GET(request: NextRequest) {
  try {
    const session = await validateSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true, branchIds: true, fullName: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const userRole = normalizeRole(dbUser.role || "staff");
    if (userRole !== "office_admin" && userRole !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");

    // action=form-data — Return user branch, vendors, and active accounts in a single optimized response
    if (action === "form-data" || action === "init") {
      const userBranchIds = dbUser.branchIds || [];
      let userBranchIdVal = userBranchIds[0] || "";
      let branchName = "Main Branch";

      if (userBranchIds.length > 0) {
        const branches = await prisma.branch.findMany({
          where: { id: { in: userBranchIds } },
          select: { id: true, name: true },
        });
        if (branches.length > 0) {
          userBranchIdVal = branches[0].id;
          branchName = branches[0].name;
        }
      }

      const vendors = await prisma.vendor.findMany({
        where: userBranchIds.length > 0 ? { branchIds: { hasSome: userBranchIds } } : undefined,
        select: { id: true, vendorName: true },
        orderBy: { vendorName: "asc" },
      });

      const accounts = await prisma.account.findMany({
        where: { active: true },
        select: { id: true, accountNo: true, accountName: true },
        orderBy: { accountNo: "asc" },
      });

      return NextResponse.json({
        userBranchId: userBranchIdVal,
        userBranchName: branchName,
        vendors: vendors.map((v) => ({ id: v.id, name: v.vendorName })),
        accounts: accounts.map((a) => ({ id: a.id, name: `${a.accountNo} - ${a.accountName}` })),
      });
    }

    // action=vendors — Return vendors for the user's branch (for form dropdown)
    if (action === "vendors") {
      const userBranchIds = dbUser.branchIds || [];
      const vendors = await prisma.vendor.findMany({
        where: userBranchIds.length > 0
          ? { branchIds: { hasSome: userBranchIds } }
          : undefined,
        select: { id: true, vendorName: true },
        orderBy: { vendorName: "asc" },
      });
      return NextResponse.json(vendors);
    }

    // action=accounts — Return all active accounts (for form dropdown)
    if (action === "accounts") {
      const accounts = await prisma.account.findMany({
        where: { active: true },
        select: { id: true, accountNo: true, accountName: true },
        orderBy: { accountNo: "asc" },
      });
      return NextResponse.json(accounts);
    }

    // Default: Return paginated expenses for the office admin
    const userBranchIds = dbUser.branchIds || [];
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "10", 10));
    const search = searchParams.get("search") || "";
    const skip = (page - 1) * limit;

    const where: any = {};
    if (userRole === "office_admin" && userBranchIds.length > 0) {
      where.branchIds = { hasSome: userBranchIds };
    }
    if (search.trim()) {
      const query = search.trim();
      where.OR = [
        { description: { contains: query, mode: "insensitive" } },
        { expenseNo: { contains: query, mode: "insensitive" } },
        { paymentMethod: { contains: query, mode: "insensitive" } },
        { notes: { contains: query, mode: "insensitive" } },
      ];
    }

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

    const vendorIds = Array.from(new Set(expenses.flatMap((e) => e.vendorIds)));
    const branchIds = Array.from(new Set(expenses.flatMap((e) => e.branchIds)));

    const [vendors, branches] = await Promise.all([
      vendorIds.length > 0
        ? prisma.vendor.findMany({ where: { id: { in: vendorIds } }, select: { id: true, vendorName: true, category: true } })
        : [],
      branchIds.length > 0
        ? prisma.branch.findMany({ where: { id: { in: branchIds } }, select: { id: true, name: true } })
        : [],
    ]);

    const vendorMap = new Map(vendors.map((v) => [v.id, v]));
    const branchMap = new Map(branches.map((b) => [b.id, b.name]));

    const data = expenses.map((exp) => {
      const vendor = exp.vendorIds.map((id) => vendorMap.get(id)).filter(Boolean)[0] || null;
      const appr = approvalMap.get(exp.id);
      return {
        ...exp,
        vendorName: vendor ? vendor.vendorName : "Unknown Vendor",
        category: vendor ? (vendor.category || "Operational") : "Operational",
        branchName: exp.branchIds.map((id) => branchMap.get(id)).filter(Boolean).join(", ") || "General",
        approvalStatus: appr ? appr.status : "Pending",
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
    console.error("[Office Admin Expenses GET Error]", error);
    return NextResponse.json({ error: error.message || "Internal server error." }, { status: 500 });
  }
}
