import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkRBAC, getScopingFilter, applyRedactions, normalizeRole } from "@/lib/rbac";
import { auditService } from "@/lib/audit";

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

const searchableFields: Record<string, string[]> = {
  branch: ["name", "city", "address", "phone", "notes"],
  user: ["fullName", "role", "email", "phone", "workingLanguage", "status"],
  course: ["courseName", "nameRussian", "nameKyrgyz", "description"],
  tuitionPlan: ["planName", "nameRussian", "nameKyrgyz"],
  term: ["termName", "nameRussian"],
  room: ["roomName", "nameRussian"],
  lead: ["leadName", "phone", "whatsapp", "notes"],
  trial: ["trialId", "notes", "outcome"],
  parent: ["parentName", "phone", "whatsapp", "email", "address", "notes"],
  student: ["studentName", "notes", "medicalNotes", "gender", "status"],
  classGroup: ["groupName", "status"],
  enrollment: ["enrollmentId", "status", "onboardingStatus"],
  session: ["sessionId", "status"],
  attendance: ["attendanceId", "status"],
  invoice: ["invoiceNo", "status"],
  payment: ["paymentRef", "method", "paymentType"],
  account: ["accountNo", "accountName", "nameRussian", "notes"],
  journalEntry: ["entryNo", "memo", "source"],
  ledgerLine: ["line", "memo"],
  vendor: ["vendorName", "phone", "email", "notes"],
  expense: ["expenseNo", "description", "notes"],
  franchiseRoyalty: ["royaltyNo", "notes"],
  teacherPay: ["payRunNo", "notes"],
  teacherHours: ["entry", "notes"],
  activity: ["activityId", "notes"],
  channelPerformance: ["channel", "month"],
  notificationLog: ["notificationId", "message"],
};

const defaultSorts: Record<string, Record<string, string>> = {
  branch: { name: "asc" },
  user: { fullName: "asc" },
  course: { courseName: "asc" },
  student: { studentName: "asc" },
  classGroup: { groupName: "asc" },
  session: { dateTime: "desc" },
  invoice: { invoiceNo: "desc" },
  payment: { date: "desc" },
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
    auditService.log({
      action: "PERMISSION_DENIED",
      tableName: table,
      result: "FAIL",
      details: "No active session found.",
    }, request);

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch full user details (role and branchIds)
  const dbUser = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (!dbUser) {
    auditService.log({
      action: "PERMISSION_DENIED",
      tableName: table,
      result: "FAIL",
      details: `User ID ${session.userId} not found in database.`,
    }, request);

    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }

  const userRole = dbUser.role || "staff";
  const userBranchIds = dbUser.branchIds || [];

  // Check if target table is valid
  const normalizedTable = table.toLowerCase();
  const prismaModelName = modelMapping[normalizedTable];

  if (!prismaModelName) {
    auditService.log({
      actorId: dbUser.id,
      actorEmail: dbUser.email,
      role: userRole,
      branchIds: userBranchIds,
      action: "PERMISSION_DENIED",
      tableName: table,
      result: "FAIL",
      details: `Table '${table}' not recognized in schema.`,
    }, request);

    return NextResponse.json({ error: `Table '${table}' not found.` }, { status: 404 });
  }

  // 2. RBAC Access check
  const rbacCheck = checkRBAC(userRole, prismaModelName, "read", isBreakGlass);
  if (!rbacCheck.allowed) {
    auditService.log({
      actorId: dbUser.id,
      actorEmail: dbUser.email,
      role: userRole,
      branchIds: userBranchIds,
      action: "PERMISSION_DENIED",
      tableName: prismaModelName,
      result: "FAIL",
      details: rbacCheck.reason,
    }, request);

    return NextResponse.json({ error: rbacCheck.reason }, { status: 403 });
  }

  // 3. Branch Scoping and role filters (enforced immediately after RBAC)
  let whereFilter: Record<string, unknown> = {};
  try {
    whereFilter = await getScopingFilter(
      { id: dbUser.id, role: userRole, branchIds: userBranchIds },
      prismaModelName
    );
  } catch (err: any) {
    auditService.log({
      actorId: dbUser.id,
      actorEmail: dbUser.email,
      role: userRole,
      branchIds: userBranchIds,
      action: "PERMISSION_DENIED",
      tableName: prismaModelName,
      result: "FAIL",
      details: `Scoping resolution error: ${err.message || String(err)}`,
    }, request);

    return NextResponse.json({ error: "Failed to resolve data scope." }, { status: 500 });
  }

  // 4. Audit step (executed after Authentication -> RBAC -> Branch Scoping)
  const T1_TABLES = ["Account", "JournalEntry", "LedgerLine", "Vendor", "Expense", "FranchiseRoyalty", "TeacherPay", "TeacherHours"];
  const T2_TABLES = ["User", "Parent", "Student", "Enrollment", "Invoice", "Payment", "NotificationLog"];
  const isSensitive = T1_TABLES.includes(prismaModelName) || T2_TABLES.includes(prismaModelName);
  const action = isSensitive ? "SENSITIVE_ACCESS" : "VIEW";

  if (normalizeRole(userRole) === "tech_admin" && isBreakGlass) {
    auditService.log({
      actorId: dbUser.id,
      actorEmail: dbUser.email,
      role: userRole,
      branchIds: userBranchIds,
      action,
      tableName: prismaModelName,
      result: "SUCCESS",
      details: `Tech Admin breaking glass to view ${prismaModelName} table. Scoped to ${JSON.stringify(whereFilter)}.`,
    }, request);
  } else {
    auditService.log({
      actorId: dbUser.id,
      actorEmail: dbUser.email,
      role: userRole,
      branchIds: userBranchIds,
      action,
      tableName: prismaModelName,
      result: "SUCCESS",
      details: `Viewed table. Scoped query filter: ${JSON.stringify(whereFilter)}`,
    }, request);
  }

  try {

    // Parse query params
    const search = searchParams.get("search") || undefined;
    const pageStr = searchParams.get("page");
    const limitStr = searchParams.get("limit") || "10";
    const sortBy = searchParams.get("sortBy") || undefined;
    const sortOrder = searchParams.get("sortOrder") || "asc";

    // Build Search Filter
    const searchFilter = search && searchableFields[prismaModelName]
      ? {
          OR: searchableFields[prismaModelName].map((field) => ({
            [field]: {
              contains: search,
              mode: "insensitive",
            },
          })),
        }
      : undefined;

    const combinedWhere = searchFilter
      ? { AND: [whereFilter, searchFilter] }
      : whereFilter;

    // Build Sorting
    const orderBy = sortBy
      ? { [sortBy]: sortOrder }
      : defaultSorts[prismaModelName] || undefined;

    // 4. Query data
    const prismaClient = prisma as unknown as Record<
      string,
      {
        findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
        count: (args: Record<string, unknown>) => Promise<number>;
      }
    >;

    if (pageStr) {
      const page = parseInt(pageStr, 10) || 1;
      const limit = parseInt(limitStr, 10) || 10;
      const skip = (page - 1) * limit;

      const [total, records] = await Promise.all([
        prismaClient[prismaModelName].count({ where: combinedWhere }),
        prismaClient[prismaModelName].findMany({
          where: combinedWhere,
          orderBy,
          skip,
          take: limit,
        }),
      ]);

      const redactedRecords = applyRedactions(userRole, prismaModelName, records, paymentContext);

      return NextResponse.json({
        data: redactedRecords,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } else {
      const records = await prismaClient[prismaModelName].findMany({
        where: combinedWhere,
        orderBy,
      });

      const redactedRecords = applyRedactions(userRole, prismaModelName, records, paymentContext);
      return NextResponse.json(redactedRecords);
    }
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
