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

    // Parse search parameters
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "10", 10));
    const skip = (page - 1) * limit;

    const search = searchParams.get("search") || "";
    const posted = searchParams.get("posted") || "";
    const branchFilter = searchParams.get("branchId") || searchParams.get("branch");

    // Build Prisma filters
    const whereConditions: any[] = [];
    if (userRole === "finance") {
      whereConditions.push(branchScopedFilter);
    }

    if (branchFilter) {
      if (userRole === "finance") {
        if (!userBranchIds.includes(branchFilter)) {
          whereConditions.push({ branchIds: { has: branchFilter } });
        } else {
          whereConditions.push({ branchIds: { has: branchFilter } });
        }
      } else {
        whereConditions.push({ branchIds: { has: branchFilter } });
      }
    }

    if (search) {
      whereConditions.push({
        OR: [
          { entryNo: { contains: search, mode: "insensitive" } },
          { memo: { contains: search, mode: "insensitive" } },
          { source: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    if (posted === "true") {
      whereConditions.push({ posted: true });
    } else if (posted === "false") {
      whereConditions.push({ posted: false });
    }

    const where = whereConditions.length > 0 ? { AND: whereConditions } : {};

    // Fetch Journal Entries
    const [total, journalEntries] = await Promise.all([
      prisma.journalEntry.count({ where }),
      prisma.journalEntry.findMany({
        where,
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
    ]);

    // Manually join Ledger Lines by journalEntryIds
    const journalEntryIds = journalEntries.map((je) => je.id);
    const ledgerLines = journalEntryIds.length > 0
      ? await prisma.ledgerLine.findMany({
          where: {
            journalEntryIds: { hasSome: journalEntryIds },
          },
        })
      : [];

    // Fetch account details for ledger lines
    const accountIds = Array.from(new Set(ledgerLines.flatMap((ll) => ll.accountIds)));
    const accounts = accountIds.length > 0
      ? await prisma.account.findMany({
          where: { id: { in: accountIds } },
          select: { id: true, accountNo: true, accountName: true },
        })
      : [];
    const accountMap = new Map(accounts.map((a) => [a.id, a]));

    // Fetch lightweight JEs to run heuristic check for reversals
    const allJEs = await prisma.journalEntry.findMany({
      select: { entryNo: true, memo: true },
    });

    // Attach lines, account details and reversal indicator
    const data = journalEntries.map((je) => {
      const lines = ledgerLines.filter((ll) => ll.journalEntryIds.includes(je.id));
      
      const isReversed = allJEs.some(
        (other) =>
          other.memo?.toLowerCase().includes(`reversal of ${je.entryNo?.toLowerCase()}`) ||
          other.memo?.toLowerCase().includes(`reverse of ${je.entryNo?.toLowerCase()}`) ||
          other.entryNo?.toLowerCase() === `${je.entryNo?.toLowerCase()}-rev`
      ) || je.memo?.toLowerCase().includes("reversal") || je.memo?.toLowerCase().includes("reversed");

      return {
        ...je,
        isReversed,
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
  } catch (error) {
    console.error("[Finance Ledger API Error]", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}