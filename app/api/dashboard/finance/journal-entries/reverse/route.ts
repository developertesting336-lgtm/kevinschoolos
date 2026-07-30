import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { normalizeRole } from "@/lib/roles";
import * as airtableProxy from "@/lib/airtableProxy";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

interface ReverseEntryInput {
  journalEntryId: string;
  reversalMemo?: string;
}

// Helper to format entry numbers
async function generateNextEntryNo(): Promise<string> {
  const count = await prisma.journalEntry.count();
  const nextSeq = count + 1;
  return `JE-${String(nextSeq).padStart(4, "0")}`;
}

// POST /api/dashboard/finance/journal-entries/reverse
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
      return NextResponse.json({ error: "Forbidden: Only Finance and Owner users can reverse Journal Entries." }, { status: 403 });
    }

    const body: ReverseEntryInput = await request.json();

    if (!body.journalEntryId) {
      return NextResponse.json({ error: "journalEntryId is required." }, { status: 400 });
    }

    // 1. Fetch target original Journal Entry
    const originalJE = await prisma.journalEntry.findUnique({
      where: { id: body.journalEntryId },
    });

    if (!originalJE) {
      return NextResponse.json({ error: "Target Journal Entry not found." }, { status: 404 });
    }

    // Must be posted to be reversed
    if (!originalJE.posted) {
      return NextResponse.json({ error: "Only posted Journal Entries can be reversed." }, { status: 400 });
    }

    // Check if user has branch permission
    const userBranchIds = dbUser.branchIds || [];
    const origBranchId = originalJE.branchIds[0] || userBranchIds[0];

    if (userRole === "finance" && origBranchId && !userBranchIds.includes(origBranchId)) {
      return NextResponse.json({ error: "Forbidden: You cannot reverse entries for a branch you are not assigned to." }, { status: 403 });
    }

    // Check if already reversed
    const existingReversals = await prisma.journalEntry.findMany({
      where: {
        memo: { contains: `reversal of ${originalJE.entryNo.toLowerCase()}`, mode: "insensitive" },
      },
    });

    if (existingReversals.length > 0) {
      return NextResponse.json(
        { error: `Journal Entry ${originalJE.entryNo} has already been reversed by entry ${existingReversals[0].entryNo}.` },
        { status: 400 }
      );
    }

    // 2. Fetch original Ledger Lines
    const originalLines = await prisma.ledgerLine.findMany({
      where: { journalEntryIds: { has: originalJE.id } },
    });

    if (originalLines.length < 2) {
      return NextResponse.json({ error: "Original Journal Entry has invalid or missing ledger lines." }, { status: 400 });
    }

    // Generate new Entry No for reversal
    const reversalEntryNo = await generateNextEntryNo();
    const todayStr = new Date().toISOString().split("T")[0];
    const defaultMemo = `Reversal of ${originalJE.entryNo}: ${originalJE.memo || "Journal entry correction"}`;
    const memo = body.reversalMemo?.trim() || defaultMemo;

    // --- STEP 1: Create Reversal Journal Entry in Airtable & Postgres with Posted = false ---
    const jeAirtableData: Record<string, any> = {
      "fldu9Nus6mibMGB6y": reversalEntryNo,
      "fldqPoazkusrbYqQf": todayStr,
      "fldMHUDO2IdD35980": memo,
      "fldnV5JMpmeqxtXSF": originalJE.source || "Manual",
      "fldBGfyt6xbhx17IX": false, // Posted = false initially
      "fldgcbUNdIvRUGhad": [origBranchId],
    };

    let createdAirtableJE;
    try {
      createdAirtableJE = await airtableProxy.createRecord("journalentry", jeAirtableData);
    } catch (err: any) {
      console.error("[Reverse Journal Entry Step 1 Error]", err);
      return NextResponse.json({ error: `Airtable synchronization failed during reversal creation: ${err.message}` }, { status: 502 });
    }

    // Save unposted reversal JE to Postgres
    const newReversalJE = await prisma.journalEntry.create({
      data: {
        id: createdAirtableJE.id,
        entryNo: reversalEntryNo,
        date: new Date(todayStr),
        memo,
        source: originalJE.source || "Manual",
        posted: false,
        branchIds: [origBranchId],
      },
    });

    // --- STEP 2: Create new Ledger Lines swapping original Debit and Credit amounts ---
    const createdReversalLines: any[] = [];
    try {
      for (let i = 0; i < originalLines.length; i++) {
        const origLine = originalLines[i];
        const lineLabel = `LL-${reversalEntryNo}-${i + 1}`;
        const accountId = origLine.accountIds[0];

        // Swap original Debit and Credit:
        // Original Debit becomes new Credit, Original Credit becomes new Debit
        const newDebit = origLine.credit ? Number(origLine.credit) : null;
        const newCredit = origLine.debit ? Number(origLine.debit) : null;
        const lineMemo = `Reversal of ${origLine.line}: ${origLine.memo || memo}`;

        const lineAirtableData: Record<string, any> = {
          "fldfFrbrl6dWvF8sJ": lineLabel,                      // Line label
          "fldJlDJdWvxeLQQMv": lineMemo,                       // Memo
          "fldY5mi0w7NNTTtWd": [createdAirtableJE.id],         // Journal Entry link
          "fldUhVBX0AVaVj1X6": [accountId],                    // Account link
          "fldAWBH3eOpp1XMyP": [origBranchId],                 // Branch link
        };

        if (newDebit && newDebit > 0) lineAirtableData["fldcnvYSMp1fgjQRe"] = newDebit;
        if (newCredit && newCredit > 0) lineAirtableData["fld3IioZDzgMRWTMJ"] = newCredit;

        // Create in Airtable
        const createdAirtableLine = await airtableProxy.createRecord("ledgerline", lineAirtableData);

        // Save in Postgres
        const createdPgLine = await prisma.ledgerLine.create({
          data: {
            id: createdAirtableLine.id,
            line: lineLabel,
            debit: newDebit,
            credit: newCredit,
            memo: lineMemo,
            journalEntryIds: [createdAirtableJE.id],
            accountIds: [accountId],
            branchIds: [origBranchId],
          },
        });

        createdReversalLines.push(createdPgLine);
      }
    } catch (lineError: any) {
      console.error("[Reversal Ledger Lines Creation Failed]", lineError);
      return NextResponse.json(
        {
          error: `Failed to create reversal ledger lines: ${lineError.message}. Reversal entry ${reversalEntryNo} remains unposted.`,
          journalEntryId: newReversalJE.id,
        },
        { status: 500 }
      );
    }

    // --- STEP 3: ONLY after ALL reversed Ledger Lines succeed, update Journal Entry to Posted = true ---
    try {
      await airtableProxy.updateRecord("journalentry", createdAirtableJE.id, {
        "fldBGfyt6xbhx17IX": true, // Posted = true
      });
    } catch (postError: any) {
      console.error("[Reversal Journal Entry Step 3 Post Error]", postError);
      return NextResponse.json(
        {
          error: `Failed to mark reversal entry ${reversalEntryNo} as Posted in Airtable: ${postError.message}.`,
        },
        { status: 502 }
      );
    }

    const postedReversalJE = await prisma.journalEntry.update({
      where: { id: newReversalJE.id },
      data: { posted: true },
    });

    logAudit(
      {
        userId: dbUser.id,
        role: dbUser.role || "finance",
        action: "create",
        target: "JournalEntry",
        status: "SUCCESS",
        details: `Reversed Journal Entry ${originalJE.entryNo} via new entry ${reversalEntryNo} with ${createdReversalLines.length} swapped ledger lines.`,
      },
      request
    );

    return NextResponse.json(
      {
        ...postedReversalJE,
        ledgerLines: createdReversalLines,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Reverse Journal Entry Error]", error);
    return NextResponse.json({ error: error.message || "Internal server error." }, { status: 500 });
  }
}
