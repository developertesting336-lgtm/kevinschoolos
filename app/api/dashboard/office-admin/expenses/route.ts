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

interface UpdateExpenseInput extends ExpenseInput {
  id: string;
}

// Helper to generate Expense No based on selected date (e.g., EXP-2026-09-10)
async function generateNextExpenseNo(dateInput?: string | Date): Promise<string> {
  const dateObj = dateInput ? new Date(dateInput) : new Date();
  const validDate = isNaN(dateObj.getTime()) ? new Date() : dateObj;
  const yyyy = validDate.getFullYear();
  const mm = String(validDate.getMonth() + 1).padStart(2, "0");
  const dd = String(validDate.getDate()).padStart(2, "0");
  const baseNo = `EXP-${yyyy}-${mm}-${dd}`;

  const existingSameDate = await prisma.expense.findMany({
    where: { expenseNo: { startsWith: baseNo } },
    select: { expenseNo: true },
  });

  if (existingSameDate.length === 0) {
    return baseNo;
  }

  let maxSuffix = 1;
  for (const exp of existingSameDate) {
    if (exp.expenseNo === baseNo) {
      if (maxSuffix < 1) maxSuffix = 1;
    } else {
      const suffix = exp.expenseNo.replace(`${baseNo}-`, "");
      const num = parseInt(suffix, 10);
      if (!isNaN(num) && num > maxSuffix) {
        maxSuffix = num;
      }
    }
  }

  return `${baseNo}-${maxSuffix + 1}`;
}

// Helper to generate next Journal Entry No (e.g., JE-0001)
async function generateNextJournalEntryNo(): Promise<string> {
  const count = await prisma.journalEntry.count();
  return `JE-${String(count + 1).padStart(4, "0")}`;
}

// POST /api/dashboard/office-admin/expenses (Create Expense)
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

    if (!body.description || !body.description.trim()) {
      errors.push("Description is required.");
    }

    if (body.amount === undefined || body.amount === null || Number(body.amount) <= 0) {
      errors.push("Amount (KGS) must be greater than zero.");
    }

    const validPaymentMethods = ["Cash", "Bank Transfer", "Card", "On Account (Unpaid)"];
    if (!body.paymentMethod || !validPaymentMethods.includes(body.paymentMethod)) {
      errors.push("Payment Method is required and must be one of: Cash, Bank Transfer, Card, On Account (Unpaid).");
    }

    if (!body.vendorId) {
      errors.push("Vendor is required.");
    }

    if (!body.expenseAccountId) {
      errors.push("Expense Account is required.");
    }

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

    if (userRole === "office_admin" && userBranchIds.length > 0 && !userBranchIds.includes(expenseBranchId)) {
      return NextResponse.json({ error: "You are not authorized to create expenses for this branch." }, { status: 403 });
    }

    const expenseAccount = await prisma.account.findUnique({ where: { id: body.expenseAccountId } });
    if (!expenseAccount) {
      return NextResponse.json({ error: "Selected Expense Account does not exist." }, { status: 400 });
    }
    if (expenseAccount.active !== true) {
      return NextResponse.json({ error: "Selected Expense Account is not active." }, { status: 400 });
    }

    const expenseDate = body.date ? new Date(body.date) : new Date();
    const expenseNo = await generateNextExpenseNo(expenseDate);

    const airtableData: Record<string, any> = {
      "fldJc78XmxkOrUd4u": expenseNo,
      "fldVS53LAjlqd4cIa": expenseDate.toISOString().split("T")[0],
      "fldm0uNTuKoeLHhny": body.description.trim(),
      "fldLv6BNV3WrJVjSZ": Number(body.amount),
      "fldGjqThQ37a4z9fl": body.paymentMethod,
      "fldmATbX0cz4GGO2c": [body.vendorId],
      "fld6ps8NBgIa48a4i": [body.expenseAccountId],
      "fldcbXhKHHUF8uMEY": [expenseBranchId],
      "fldTdMu8Si7mJ7oB2": body.paid,
    };
    if (body.notes && body.notes.trim()) {
      airtableData["fldXaco0O6sIvFb3V"] = body.notes.trim();
    }

    let createdAirtable;
    try {
      createdAirtable = await airtableProxy.createRecord("expense", airtableData);
    } catch (err: any) {
      console.error("[Expense Airtable Write Error]", err);
      return NextResponse.json({ error: `Airtable synchronization failed: ${err.message}` }, { status: 502 });
    }

    const newExpense = await prisma.expense.create({
      data: {
        id: createdAirtable.id,
        expenseNo,
        date: expenseDate,
        description: body.description.trim(),
        amount: Number(body.amount),
        paymentMethod: body.paymentMethod,
        paid: body.paid,
        notes: body.notes ? body.notes.trim() : null,
        vendorIds: [body.vendorId],
        expenseAccountIds: [body.expenseAccountId],
        branchIds: [expenseBranchId],
      },
    });

    let journalEntry = null;
    try {
      const activeAccounts = await prisma.account.findMany({ where: { active: true } });
      let offsetAccount = null;

      if (body.paymentMethod === "Cash") {
        offsetAccount = activeAccounts.find(
          (a) => a.accountName.toLowerCase().includes("cash") || a.subType?.toLowerCase().includes("cash") || a.accountNo.startsWith("1010")
        );
      } else if (body.paymentMethod === "Bank Transfer" || body.paymentMethod === "Card") {
        offsetAccount = activeAccounts.find(
          (a) => a.accountName.toLowerCase().includes("bank") || a.subType?.toLowerCase().includes("bank") || a.accountNo.startsWith("1020")
        );
      } else if (body.paymentMethod === "On Account (Unpaid)") {
        offsetAccount = activeAccounts.find(
          (a) => a.type?.toLowerCase().includes("liability") || a.accountName.toLowerCase().includes("payable") || a.accountNo.startsWith("2000")
        );
      }

      if (!offsetAccount && activeAccounts.length > 0) {
        offsetAccount = activeAccounts[0];
      }

      if (offsetAccount) {
        const jeNo = await generateNextJournalEntryNo();
        const jeMemo = `Expense ${expenseNo}: ${body.description.trim()}`;

        const jeAirtableData: Record<string, any> = {
          "fldu9Nus6mibMGB6y": jeNo,
          "fldqPoazkusrbYqQf": expenseDate.toISOString().split("T")[0],
          "fldMHUDO2IdD35980": jeMemo,
          "fldnV5JMpmeqxtXSF": "Expense",
          "fldBGfyt6xbhx17IX": true,
          "fldgcbUNdIvRUGhad": [expenseBranchId],
          "fld2OPToscmtytOhJ": [createdAirtable.id],
        };

        const createdAirtableJE = await airtableProxy.createRecord("journalentry", jeAirtableData);

        const newJE = await prisma.journalEntry.create({
          data: {
            id: createdAirtableJE.id,
            entryNo: jeNo,
            date: expenseDate,
            memo: jeMemo,
            source: "Expense",
            posted: true,
            branchIds: [expenseBranchId],
          },
        });

        const drLineLabel = `LL-${jeNo}-1`;
        const drLineAirtable = await airtableProxy.createRecord("ledgerline", {
          "fldfFrbrl6dWvF8sJ": drLineLabel,
          "fldJlDJdWvxeLQQMv": jeMemo,
          "fldY5mi0w7NNTTtWd": [createdAirtableJE.id],
          "fldUhVBX0AVaVj1X6": [body.expenseAccountId],
          "fldAWBH3eOpp1XMyP": [expenseBranchId],
          "fldcnvYSMp1fgjQRe": Number(body.amount),
        });
        await prisma.ledgerLine.create({
          data: {
            id: drLineAirtable.id,
            line: drLineLabel,
            debit: Number(body.amount),
            credit: null,
            memo: jeMemo,
            journalEntryIds: [createdAirtableJE.id],
            accountIds: [body.expenseAccountId],
            branchIds: [expenseBranchId],
          },
        });

        const crLineLabel = `LL-${jeNo}-2`;
        const crLineAirtable = await airtableProxy.createRecord("ledgerline", {
          "fldfFrbrl6dWvF8sJ": crLineLabel,
          "fldJlDJdWvxeLQQMv": jeMemo,
          "fldY5mi0w7NNTTtWd": [createdAirtableJE.id],
          "fldUhVBX0AVaVj1X6": [offsetAccount.id],
          "fldAWBH3eOpp1XMyP": [expenseBranchId],
          "fld3IioZDzgMRWTMJ": Number(body.amount),
        });
        await prisma.ledgerLine.create({
          data: {
            id: crLineAirtable.id,
            line: crLineLabel,
            debit: null,
            credit: Number(body.amount),
            memo: jeMemo,
            journalEntryIds: [createdAirtableJE.id],
            accountIds: [offsetAccount.id],
            branchIds: [expenseBranchId],
          },
        });

        journalEntry = newJE;
      }
    } catch (jeError: any) {
      console.warn("[Expense Auto-JournalEntry Error]", jeError.message);
    }

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
    }

    logAudit(
      {
        userId: dbUser.id,
        role: dbUser.role || "office_admin",
        action: "create",
        target: "Expense",
        status: "PENDING_APPROVAL",
        details: `Created expense ${expenseNo} (${body.description}) for ${body.amount} KGS. ${journalEntry ? `Linked Journal Entry ${journalEntry.entryNo}.` : ""}`,
      },
      request
    );

    return NextResponse.json(
      {
        ...newExpense,
        approval: approval
          ? { id: approval.id, status: approval.status }
          : { id: null, status: "Pending Approval" },
        journalEntryNo: journalEntry?.entryNo || null,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Office Admin Create Expense Error]", error);
    return NextResponse.json({ error: error.message || "Internal server error." }, { status: 500 });
  }
}

// PUT /api/dashboard/office-admin/expenses (Edit Expense)
export async function PUT(request: NextRequest) {
  try {
    const session = await validateSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, role: true, branchIds: true, fullName: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const userRole = normalizeRole(dbUser.role || "staff");
    if (userRole !== "office_admin" && userRole !== "owner") {
      return NextResponse.json({ error: "Forbidden: Only Office Admin or Owner can edit expenses." }, { status: 403 });
    }

    const body: UpdateExpenseInput = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: "Expense ID is required for editing." }, { status: 400 });
    }

    const existingExpense = await prisma.expense.findUnique({ where: { id: body.id } });
    if (!existingExpense) {
      return NextResponse.json({ error: "Expense record not found." }, { status: 404 });
    }

    // Validation
    const errors: string[] = [];

    if (!body.description || !body.description.trim()) {
      errors.push("Description is required.");
    }

    if (body.amount === undefined || body.amount === null || Number(body.amount) <= 0) {
      errors.push("Amount (KGS) must be greater than zero.");
    }

    const validPaymentMethods = ["Cash", "Bank Transfer", "Card", "On Account (Unpaid)"];
    if (!body.paymentMethod || !validPaymentMethods.includes(body.paymentMethod)) {
      errors.push("Payment Method is required and must be one of: Cash, Bank Transfer, Card, On Account (Unpaid).");
    }

    if (!body.vendorId) {
      errors.push("Vendor is required.");
    }

    if (!body.expenseAccountId) {
      errors.push("Expense Account is required.");
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
    }

    const vendor = await prisma.vendor.findUnique({ where: { id: body.vendorId } });
    if (!vendor) {
      return NextResponse.json({ error: "Selected Vendor does not exist." }, { status: 400 });
    }

    const userBranchIds = dbUser.branchIds || [];
    const expenseBranchId = body.branchId || existingExpense.branchIds[0] || userBranchIds[0];

    if (userRole === "office_admin" && userBranchIds.length > 0 && !userBranchIds.includes(expenseBranchId)) {
      return NextResponse.json({ error: "You are not authorized to edit expenses for this branch." }, { status: 403 });
    }

    const expenseAccount = await prisma.account.findUnique({ where: { id: body.expenseAccountId } });
    if (!expenseAccount) {
      return NextResponse.json({ error: "Selected Expense Account does not exist." }, { status: 400 });
    }

    const expenseDate = body.date ? new Date(body.date) : (existingExpense.date || new Date());

    const airtableData: Record<string, any> = {
      "fldVS53LAjlqd4cIa": expenseDate.toISOString().split("T")[0],
      "fldm0uNTuKoeLHhny": body.description.trim(),
      "fldLv6BNV3WrJVjSZ": Number(body.amount),
      "fldGjqThQ37a4z9fl": body.paymentMethod,
      "fldmATbX0cz4GGO2c": [body.vendorId],
      "fld6ps8NBgIa48a4i": [body.expenseAccountId],
      "fldcbXhKHHUF8uMEY": [expenseBranchId],
      "fldTdMu8Si7mJ7oB2": body.paid,
    };
    if (body.notes !== undefined) {
      airtableData["fldXaco0O6sIvFb3V"] = body.notes ? body.notes.trim() : "";
    }

    // 1. Update in Airtable
    try {
      await airtableProxy.updateRecord("expense", body.id, airtableData);
    } catch (err: any) {
      console.error("[Expense Edit Airtable Write Error]", err);
      return NextResponse.json({ error: `Airtable update failed: ${err.message}` }, { status: 502 });
    }

    // 2. Update in Postgres DB
    const updatedExpense = await prisma.expense.update({
      where: { id: body.id },
      data: {
        date: expenseDate,
        description: body.description.trim(),
        amount: Number(body.amount),
        paymentMethod: body.paymentMethod,
        paid: body.paid,
        notes: body.notes ? body.notes.trim() : null,
        vendorIds: [body.vendorId],
        expenseAccountIds: [body.expenseAccountId],
        branchIds: [expenseBranchId],
      },
    });

    logAudit(
      {
        userId: dbUser.id,
        role: dbUser.role || "office_admin",
        action: "update",
        target: "Expense",
        status: "SUCCESS",
        details: `Updated expense ${updatedExpense.expenseNo} (${updatedExpense.description}) for ${updatedExpense.amount} KGS.`,
      },
      request
    );

    return NextResponse.json(updatedExpense, { status: 200 });
  } catch (error: any) {
    console.error("[Edit Expense Error]", error);
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

    // action=form-data — Return branches, vendors, active accounts, and pre-filled next expenseNo
    if (action === "form-data" || action === "init") {
      const userBranchIds = dbUser.branchIds || [];
      let allowedBranches: { id: string; name: string }[] = [];

      if (userRole === "owner") {
        allowedBranches = await prisma.branch.findMany({
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        });
      } else if (userBranchIds.length > 0) {
        allowedBranches = await prisma.branch.findMany({
          where: { id: { in: userBranchIds } },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        });
      }

      const defaultBranchId = allowedBranches[0]?.id || "";
      const defaultBranchName = allowedBranches[0]?.name || "Main Branch";

      const vendors = await prisma.vendor.findMany({
        where: userRole === "owner" ? undefined : (userBranchIds.length > 0 ? { branchIds: { hasSome: userBranchIds } } : undefined),
        select: { id: true, vendorName: true },
        orderBy: { vendorName: "asc" },
      });

      const accounts = await prisma.account.findMany({
        where: { active: true },
        select: { id: true, accountNo: true, accountName: true },
        orderBy: { accountNo: "asc" },
      });

      const nextExpenseNo = await generateNextExpenseNo();

      return NextResponse.json({
        userBranchId: defaultBranchId,
        userBranchName: defaultBranchName,
        branches: allowedBranches,
        vendors: vendors.map((v) => ({ id: v.id, name: v.vendorName })),
        accounts: accounts.map((a) => ({ id: a.id, name: `${a.accountNo} - ${a.accountName}` })),
        nextExpenseNo,
      });
    }

    // action=vendors — Return vendors for dropdown
    if (action === "vendors") {
      const targetBranchId = searchParams.get("branchId");
      const userBranchIds = dbUser.branchIds || [];
      const branchFilter = targetBranchId ? [targetBranchId] : userBranchIds;

      const vendors = await prisma.vendor.findMany({
        where: userRole === "owner" && !targetBranchId
          ? undefined
          : branchFilter.length > 0
          ? { branchIds: { hasSome: branchFilter } }
          : undefined,
        select: { id: true, vendorName: true },
        orderBy: { vendorName: "asc" },
      });
      return NextResponse.json(vendors);
    }

    // action=accounts — Return active accounts
    if (action === "accounts") {
      const accounts = await prisma.account.findMany({
        where: { active: true },
        select: { id: true, accountNo: true, accountName: true },
        orderBy: { accountNo: "asc" },
      });
      return NextResponse.json(accounts);
    }

    // Default: Return paginated expenses with filters
    const userBranchIds = dbUser.branchIds || [];
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "10", 10));
    const search = searchParams.get("search") || "";
    const paidFilter = searchParams.get("paid");
    const branchFilter = searchParams.get("branchId") || searchParams.get("branch");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const skip = (page - 1) * limit;

    const whereConditions: any[] = [];

    // Role-based branch scoping
    if (userRole === "office_admin" && userBranchIds.length > 0) {
      whereConditions.push({ branchIds: { hasSome: userBranchIds } });
    }

    if (branchFilter && branchFilter !== "all") {
      whereConditions.push({ branchIds: { has: branchFilter } });
    }

    if (paidFilter === "true" || paidFilter === "paid") {
      whereConditions.push({ paid: true });
    } else if (paidFilter === "false" || paidFilter === "unpaid") {
      whereConditions.push({ paid: false });
    }

    if (startDate || endDate) {
      const dateCond: any = {};
      if (startDate) dateCond.gte = new Date(`${startDate}T00:00:00.000Z`);
      if (endDate) dateCond.lte = new Date(`${endDate}T23:59:59.999Z`);
      whereConditions.push({ date: dateCond });
    }

    if (search.trim()) {
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
        vendorId: exp.vendorIds[0] || "",
        expenseAccountId: exp.expenseAccountIds[0] || "",
        branchId: exp.branchIds[0] || "",
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
