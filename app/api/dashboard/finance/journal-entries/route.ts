import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { normalizeRole } from "@/lib/roles";
import * as airtableProxy from "@/lib/airtableProxy";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

interface LedgerLineInput {
  accountId: string;
  debit?: number | null;
  credit?: number | null;
  memo?: string;
}

interface CreateJournalEntryInput {
  date?: string;
  memo: string;
  source: "Manual" | "Payment" | "Invoice" | "Teacher Pay" | "Expense" | "Royalty" | "Opening Balance";
  branchId: string;
  sourceRecordId?: string;
  lines: LedgerLineInput[];
}

// Helper to format entry numbers (e.g., JE-0001)
async function generateNextEntryNo(): Promise<string> {
  const count = await prisma.journalEntry.count();
  const nextSeq = count + 1;
  return `JE-${String(nextSeq).padStart(4, "0")}`;
}

// GET /api/dashboard/finance/journal-entries
export async function GET(request: NextRequest) {
  try {
    const session = await validateSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, role: true, branchIds: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const userRole = normalizeRole(dbUser.role || "staff");
    if (userRole !== "finance" && userRole !== "owner") {
      return NextResponse.json({ error: "Forbidden: Access restricted to Finance and Owner roles." }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");

    // --- Action: form-data (Initialization data for New Journal Entry Form) ---
    if (action === "form-data" || action === "init") {
      const userBranchIds = dbUser.branchIds || [];
      
      // Active accounts from Chart of Accounts
      const activeAccounts = await prisma.account.findMany({
        where: { active: true },
        select: {
          id: true,
          accountNo: true,
          accountName: true,
          type: true,
          subType: true,
          normalSide: true,
          active: true,
        },
        orderBy: { accountNo: "asc" },
      });

      // Allowed branches
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
      const defaultBranchName = allowedBranches[0]?.name || "";

      // Preview next entry number
      const nextEntryNo = await generateNextEntryNo();

      // Source options data for linking
      const [payments, invoices, teacherPays, expenses, royalties] = await Promise.all([
        prisma.payment.findMany({
          take: 50,
          orderBy: { date: "desc" },
          select: { id: true, paymentRef: true, amount: true, date: true, branchIds: true },
        }),
        prisma.invoice.findMany({
          take: 50,
          orderBy: { issueDate: "desc" },
          select: { id: true, invoiceNo: true, amount: true, status: true, branchIds: true },
        }),
        prisma.teacherPay.findMany({
          take: 50,
          orderBy: { period: "desc" },
          select: { id: true, payRunNo: true, grossPay: true, period: true, branchIds: true },
        }),
        prisma.expense.findMany({
          take: 50,
          orderBy: { date: "desc" },
          select: { id: true, expenseNo: true, amount: true, description: true, branchIds: true },
        }),
        prisma.franchiseRoyalty.findMany({
          take: 50,
          orderBy: { period: "desc" },
          select: { id: true, royaltyNo: true, revenueBase: true, period: true, branchIds: true },
        }),
      ]);

      return NextResponse.json({
        userRole,
        nextEntryNo,
        userBranchId: defaultBranchId,
        userBranchName: defaultBranchName,
        branches: allowedBranches,
        activeAccounts,
        sourcesData: {
          payments: payments.map(p => ({ id: p.id, label: `${p.paymentRef} (${p.amount ?? 0} KGS)` })),
          invoices: invoices.map(i => ({ id: i.id, label: `${i.invoiceNo} (${i.amount ?? 0} KGS)` })),
          teacherPays: teacherPays.map(t => ({ id: t.id, label: `${t.payRunNo} (${t.grossPay ?? 0} KGS)` })),
          expenses: expenses.map(e => ({ id: e.id, label: `${e.expenseNo} - ${e.description} (${e.amount ?? 0} KGS)` })),
          royalties: royalties.map(r => ({ id: r.id, label: `${r.royaltyNo}` })),
        },
      });
    }

    // --- Default: GET Paginated Journal Entries List ---
    const userBranchIds = dbUser.branchIds || [];
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "10", 10));
    const skip = (page - 1) * limit;

    const search = searchParams.get("search") || "";
    const postedFilter = searchParams.get("posted") || "";
    const branchFilter = searchParams.get("branchId") || searchParams.get("branch");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const whereConditions: any[] = [];

    // Role-based branch scoping
    if (userRole === "finance") {
      whereConditions.push({ branchIds: { hasSome: userBranchIds } });
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

    if (search.trim()) {
      const q = search.trim();
      whereConditions.push({
        OR: [
          { entryNo: { contains: q, mode: "insensitive" } },
          { memo: { contains: q, mode: "insensitive" } },
          { source: { contains: q, mode: "insensitive" } },
        ],
      });
    }

    if (postedFilter === "true") {
      whereConditions.push({ posted: true });
    } else if (postedFilter === "false") {
      whereConditions.push({ posted: false });
    }

    const where = whereConditions.length > 0 ? { AND: whereConditions } : {};

    const [total, journalEntries] = await Promise.all([
      prisma.journalEntry.count({ where }),
      prisma.journalEntry.findMany({
        where,
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const journalEntryIds = journalEntries.map((je) => je.id);

    // Fetch ledger lines for these journal entries
    const ledgerLines = journalEntryIds.length > 0
      ? await prisma.ledgerLine.findMany({
          where: { journalEntryIds: { hasSome: journalEntryIds } },
        })
      : [];

    // Fetch details for linked accounts
    const accountIds = Array.from(new Set(ledgerLines.flatMap((ll) => ll.accountIds)));
    const accounts = accountIds.length > 0
      ? await prisma.account.findMany({
          where: { id: { in: accountIds } },
          select: { id: true, accountNo: true, accountName: true, active: true },
        })
      : [];
    const accountMap = new Map(accounts.map((a) => [a.id, a]));

    // Fetch details for branches
    const allBranchIds = Array.from(new Set(journalEntries.flatMap((je) => je.branchIds)));
    const branches = allBranchIds.length > 0
      ? await prisma.branch.findMany({
          where: { id: { in: allBranchIds } },
          select: { id: true, name: true },
        })
      : [];
    const branchMap = new Map(branches.map((b) => [b.id, b.name]));

    // Check for reversals
    const allJEs = await prisma.journalEntry.findMany({
      select: { entryNo: true, memo: true },
    });

    const data = journalEntries.map((je) => {
      const lines = ledgerLines.filter((ll) => ll.journalEntryIds.includes(je.id));
      
      const isReversed = allJEs.some(
        (other) =>
          other.memo?.toLowerCase().includes(`reversal of ${je.entryNo?.toLowerCase()}`) ||
          other.memo?.toLowerCase().includes(`reverse of ${je.entryNo?.toLowerCase()}`) ||
          other.entryNo?.toLowerCase() === `${je.entryNo?.toLowerCase()}-rev`
      ) || je.memo?.toLowerCase().includes("reversal") || je.memo?.toLowerCase().includes("reversed");

      const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
      const totalCredit = lines.reduce((sum, l) => sum + (l.credit || 0), 0);

      return {
        ...je,
        branchName: je.branchIds.map((id) => branchMap.get(id)).filter(Boolean).join(", ") || "Main Branch",
        isReversed,
        totalDebit,
        totalCredit,
        ledgerLines: lines.map((ll) => ({
          ...ll,
          account: ll.accountIds.map((id) => accountMap.get(id)).filter(Boolean)[0] || null,
        })),
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
    console.error("[GET Journal Entries Error]", error);
    return NextResponse.json({ error: error.message || "Internal server error." }, { status: 500 });
  }
}

// POST /api/dashboard/finance/journal-entries
export async function POST(request: NextRequest) {
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
    if (userRole !== "finance" && userRole !== "owner") {
      return NextResponse.json({ error: "Forbidden: Only Finance and Owner users can create Journal Entries." }, { status: 403 });
    }

    const body: CreateJournalEntryInput = await request.json();

    // --- Strict Validation ---
    const errors: string[] = [];

    // 1. Memo is required
    if (!body.memo || !body.memo.trim()) {
      errors.push("Journal Entry Memo is required.");
    }

    // 2. Date is required
    if (!body.date) {
      errors.push("Date is required.");
    }

    // 3. Branch is required
    const userBranchIds = dbUser.branchIds || [];
    let selectedBranchId = body.branchId;

    if (userRole === "finance") {
      selectedBranchId = userBranchIds[0] || body.branchId;
      if (!selectedBranchId) {
        errors.push("No assigned branch found for your Finance user account.");
      }
    } else if (!selectedBranchId) {
      errors.push("Branch is required.");
    }

    // 4. Source validation
    const validSources = ["Manual", "Payment", "Invoice", "Teacher Pay", "Expense", "Royalty", "Opening Balance"];
    if (!body.source || !validSources.includes(body.source)) {
      errors.push("Source must be one of: Manual, Payment, Invoice, Teacher Pay, Expense, Royalty, Opening Balance.");
    }

    // 5. Source record required if Source needs one
    const requiresSourceRecord = ["Payment", "Invoice", "Teacher Pay", "Expense", "Royalty"].includes(body.source);
    if (requiresSourceRecord && !body.sourceRecordId) {
      errors.push(`A linked source record is required for Source type "${body.source}".`);
    }

    // 6. At least 2 Ledger Lines required
    if (!body.lines || !Array.isArray(body.lines) || body.lines.length < 2) {
      errors.push("At least two Ledger Lines are required for a Journal Entry.");
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
    }

    // Validate each Ledger Line
    let totalDebit = 0;
    let totalCredit = 0;

    for (let i = 0; i < body.lines.length; i++) {
      const line = body.lines[i];
      const rowNum = i + 1;

      if (!line.accountId) {
        errors.push(`Row ${rowNum}: Account is required.`);
        continue;
      }

      const dr = Number(line.debit) || 0;
      const cr = Number(line.credit) || 0;

      if (dr < 0 || cr < 0) {
        errors.push(`Row ${rowNum}: Debit and Credit amounts cannot be negative.`);
      }

      // Must have either Debit or Credit, NEVER both and NEVER neither
      if ((dr > 0 && cr > 0) || (dr === 0 && cr === 0)) {
        errors.push(`Row ${rowNum}: Each line must have EITHER a Debit OR a Credit amount, but never both and never neither.`);
      }

      totalDebit += dr;
      totalCredit += cr;
    }

    // Validate total debit equals total credit
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      errors.push(`Unbalanced Journal Entry: Total Debit (${totalDebit.toFixed(2)} KGS) must equal Total Credit (${totalCredit.toFixed(2)} KGS).`);
    }

    // Validate selected accounts exist and are active
    const lineAccountIds = Array.from(new Set(body.lines.map(l => l.accountId)));
    const accountsInDb = await prisma.account.findMany({
      where: { id: { in: lineAccountIds } },
    });

    const accountMap = new Map(accountsInDb.map(a => [a.id, a]));
    for (let i = 0; i < body.lines.length; i++) {
      const line = body.lines[i];
      const acc = accountMap.get(line.accountId);
      if (!acc) {
        errors.push(`Row ${i + 1}: Selected Account does not exist.`);
      } else if (!acc.active) {
        errors.push(`Row ${i + 1}: Account "${acc.accountNo} - ${acc.accountName}" is inactive.`);
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
    }

    // Generate Entry No
    const entryNo = await generateNextEntryNo();
    const entryDate = new Date(body.date!);

    // --- STEP 1: Create Journal Entry in Airtable & Postgres with Posted = false ---
    const jeAirtableData: Record<string, any> = {
      "fldu9Nus6mibMGB6y": entryNo,                          // Entry No
      "fldqPoazkusrbYqQf": entryDate.toISOString().split("T")[0], // Date
      "fldMHUDO2IdD35980": body.memo.trim(),                  // Memo
      "fldnV5JMpmeqxtXSF": body.source,                      // Source
      "fldBGfyt6xbhx17IX": false,                            // Posted = false
      "fldgcbUNdIvRUGhad": [selectedBranchId],                // Branch
    };

    if (body.source === "Payment" && body.sourceRecordId) {
      jeAirtableData["fldffqBvi4ncVZb1t"] = [body.sourceRecordId];
    } else if (body.source === "Invoice" && body.sourceRecordId) {
      jeAirtableData["fldpStiRtD6fFRHI8"] = [body.sourceRecordId];
    } else if (body.source === "Teacher Pay" && body.sourceRecordId) {
      jeAirtableData["fldbYkzLl4EgOzgo5"] = [body.sourceRecordId];
    } else if (body.source === "Expense" && body.sourceRecordId) {
      jeAirtableData["fld2OPToscmtytOhJ"] = [body.sourceRecordId];
    } else if (body.source === "Royalty" && body.sourceRecordId) {
      jeAirtableData["fldNMKiGrB0LdElYN"] = [body.sourceRecordId];
    }

    let createdAirtableJE;
    try {
      createdAirtableJE = await airtableProxy.createRecord("journalentry", jeAirtableData);
    } catch (err: any) {
      console.error("[Journal Entry Airtable Step 1 Error]", err);
      return NextResponse.json({ error: `Airtable synchronization failed at Step 1 (Journal Entry creation): ${err.message}` }, { status: 502 });
    }

    // Save initial unposted JE to Postgres
    const newJE = await prisma.journalEntry.create({
      data: {
        id: createdAirtableJE.id,
        entryNo,
        date: entryDate,
        memo: body.memo.trim(),
        source: body.source,
        posted: false,
        branchIds: [selectedBranchId],
      },
    });

    // --- STEP 2: Create Ledger Lines records for every entered row ---
    // Note: Do NOT send Amount (signed) field (fldzZKbOMN2HakwPt) because Airtable computes it automatically!
    const createdLedgerLines: any[] = [];
    try {
      for (let i = 0; i < body.lines.length; i++) {
        const line = body.lines[i];
        const lineLabel = `LL-${entryNo}-${i + 1}`;
        const dr = Number(line.debit) || 0;
        const cr = Number(line.credit) || 0;

        const lineAirtableData: Record<string, any> = {
          "fldfFrbrl6dWvF8sJ": lineLabel,                      // Line label
          "fldJlDJdWvxeLQQMv": line.memo ? line.memo.trim() : body.memo.trim(), // Memo
          "fldY5mi0w7NNTTtWd": [createdAirtableJE.id],         // Journal Entry link
          "fldUhVBX0AVaVj1X6": [line.accountId],               // Account link
          "fldAWBH3eOpp1XMyP": [selectedBranchId],             // Branch link
        };

        if (dr > 0) lineAirtableData["fldcnvYSMp1fgjQRe"] = dr; // Debit (KGS)
        if (cr > 0) lineAirtableData["fld3IioZDzgMRWTMJ"] = cr; // Credit (KGS)

        // Create in Airtable
        const createdAirtableLine = await airtableProxy.createRecord("ledgerline", lineAirtableData);

        // Save in Postgres
        const createdPgLine = await prisma.ledgerLine.create({
          data: {
            id: createdAirtableLine.id,
            line: lineLabel,
            debit: dr > 0 ? dr : null,
            credit: cr > 0 ? cr : null,
            memo: line.memo ? line.memo.trim() : body.memo.trim(),
            journalEntryIds: [createdAirtableJE.id],
            accountIds: [line.accountId],
            branchIds: [selectedBranchId],
          },
        });

        createdLedgerLines.push(createdPgLine);
      }
    } catch (lineError: any) {
      console.error("[Ledger Lines Creation Failed]", lineError);
      // Fail-safe: Journal Entry remains Posted = false and error is returned to user
      return NextResponse.json(
        {
          error: `Ledger Line creation failed: ${lineError.message}. Journal Entry ${entryNo} has NOT been marked as Posted.`,
          journalEntryId: newJE.id,
        },
        { status: 500 }
      );
    }

    // --- STEP 3: ONLY after ALL Ledger Lines succeed, update Journal Entry to Posted = true ---
    try {
      await airtableProxy.updateRecord("journalentry", createdAirtableJE.id, {
        "fldBGfyt6xbhx17IX": true, // Posted = true
      });
    } catch (postError: any) {
      console.error("[Journal Entry Step 3 Airtable Post Error]", postError);
      return NextResponse.json(
        {
          error: `Failed to mark Journal Entry ${entryNo} as Posted in Airtable: ${postError.message}.`,
        },
        { status: 502 }
      );
    }

    const postedJE = await prisma.journalEntry.update({
      where: { id: newJE.id },
      data: { posted: true },
    });

    logAudit(
      {
        userId: dbUser.id,
        role: dbUser.role || "finance",
        action: "create",
        target: "JournalEntry",
        status: "SUCCESS",
        details: `Created and posted Journal Entry ${entryNo} (${body.memo}) with ${createdLedgerLines.length} ledger lines totalling ${totalDebit} KGS.`,
      },
      request
    );

    return NextResponse.json(
      {
        ...postedJE,
        ledgerLines: createdLedgerLines,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Create Journal Entry Error]", error);
    return NextResponse.json({ error: error.message || "Internal server error." }, { status: 500 });
  }
}
