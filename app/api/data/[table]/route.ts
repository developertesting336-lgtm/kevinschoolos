import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkRBAC, getScopingFilter, applyRedactions } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const modelMapping: { [key: string]: string } = {
  branch: "branch",
  user: "user",
  course: "course",
  tuitionplan: "tuitionPlan",
  term: "term",
  room: "room",
  lead: "lead",
  trial: "trial",
  parent: "parent",
  student: "student",
  classgroup: "classGroup",
  enrollment: "enrollment",
  session: "session",
  attendance: "attendance",
  invoice: "invoice",
  payment: "payment",
  account: "account",
  journalentry: "journalEntry",
  ledgerline: "ledgerLine",
  vendor: "vendor",
  expense: "expense",
  franchiseroyalty: "franchiseRoyalty",
  teacherpay: "teacherPay",
  teacherhours: "teacherHours",
  activity: "activity",
  channelperformance: "channelPerformance",
  notificationlog: "notificationLog",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  const { table } = await params;
  const searchParams = request.nextUrl.searchParams;
  const isBreakGlass = searchParams.get("breakGlass") === "true";
  const paymentContext = searchParams.get("paymentContext") === "true";

  // 1. Resolve User session
  const session = await validateSession();
  if (!session) {
    logAudit({
      action: "read",
      target: table,
      status: "DENIED",
      details: "No active session found.",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch full user details (role and branchIds)
  const dbUser = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (!dbUser) {
    logAudit({
      action: "read",
      target: table,
      status: "DENIED",
      details: `User ID ${session.userId} not found in database.`,
    });
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }

  const userRole = dbUser.role || "staff";
  const userBranchIds = dbUser.branchIds || [];

  // Check if target table is valid
  const normalizedTable = table.toLowerCase();
  const prismaModelName = modelMapping[normalizedTable];

  if (!prismaModelName) {
    logAudit({
      userId: dbUser.id,
      role: userRole,
      action: "read",
      target: table,
      status: "INVALID_TABLE",
      details: `Table '${table}' not recognized in schema.`,
    });
    return NextResponse.json({ error: `Table '${table}' not found.` }, { status: 404 });
  }

  // 2. RBAC Access check
  const rbacCheck = checkRBAC(userRole, prismaModelName, "read", isBreakGlass);
  if (!rbacCheck.allowed) {
    logAudit({
      userId: dbUser.id,
      role: userRole,
      action: "read",
      target: prismaModelName,
      status: "DENIED",
      details: rbacCheck.reason,
    });
    return NextResponse.json({ error: rbacCheck.reason }, { status: 403 });
  }

  // Handle break-glass logging audit
  if (userRole.toLowerCase() === "tech_admin" && isBreakGlass) {
    logAudit({
      userId: dbUser.id,
      role: userRole,
      action: "read",
      target: prismaModelName,
      status: "BREAK_GLASS_APPROVED",
      details: `Tech Admin breaking glass to view ${prismaModelName} table.`,
    });
  } else {
    // Standard access audit
    logAudit({
      userId: dbUser.id,
      role: userRole,
      action: "read",
      target: prismaModelName,
      status: "APPROVED",
    });
  }

  try {
    // 3. Branch Scoping and role filters
    const whereFilter = await getScopingFilter(
      { id: dbUser.id, role: userRole, branchIds: userBranchIds },
      prismaModelName
    );

    // 4. Query data
    const prismaClient = prisma as unknown as Record<
      string,
      { findMany: (args: Record<string, unknown>) => Promise<unknown[]> }
    >;
    const records = await prismaClient[prismaModelName].findMany({
      where: whereFilter,
    });

    // 5. Apply field-level redactions
    const redactedRecords = applyRedactions(userRole, prismaModelName, records, paymentContext);

    return NextResponse.json(redactedRecords);
  } catch (error) {
    console.error(`[Data Route GET Error] Table: ${table}`, error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

// Block writes
export async function POST() {
  return NextResponse.json(
    { error: "Phase 1 is strictly read-only. Writes are blocked." },
    { status: 403 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: "Phase 1 is strictly read-only. Writes are blocked." },
    { status: 403 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Phase 1 is strictly read-only. Writes are blocked." },
    { status: 403 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { error: "Phase 1 is strictly read-only. Writes are blocked." },
    { status: 403 }
  );
}
