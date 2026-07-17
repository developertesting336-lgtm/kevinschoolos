import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkRBAC, getScopingFilter, applyRedactions, normalizeRole } from "@/lib/rbac";
import { auditService, getVisibleFieldIds } from "@/lib/audit";

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
    auditService.logFailure(
      undefined,
      "PERMISSION_DENIED",
      table,
      "No active session found.",
      request
    );

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch full user details (role and branchIds)
  const dbUser = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (!dbUser) {
    auditService.logFailure(
      undefined,
      "PERMISSION_DENIED",
      table,
      `User ID ${session.userId} not found in database.`,
      request
    );

    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }

  const userRole = dbUser.role || "staff";
  const userBranchIds = dbUser.branchIds || [];

  // Check if target table is valid
  const normalizedTable = table.toLowerCase();
  const prismaModelName = modelMapping[normalizedTable];

  if (!prismaModelName) {
    auditService.logFailure(
      { id: dbUser.id, email: dbUser.email, role: userRole },
      "PERMISSION_DENIED",
      table,
      `Table '${table}' not recognized in schema.`,
      request
    );

    return NextResponse.json({ error: `Table '${table}' not found.` }, { status: 404 });
  }

  // 2. RBAC Access check
  const rbacCheck = checkRBAC(userRole, prismaModelName, "read", isBreakGlass);
  if (!rbacCheck.allowed) {
    auditService.logFailure(
      { id: dbUser.id, email: dbUser.email, role: userRole },
      "PERMISSION_DENIED",
      prismaModelName,
      rbacCheck.reason,
      request
    );

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
    auditService.logFailure(
      { id: dbUser.id, email: dbUser.email, role: userRole },
      "PERMISSION_DENIED",
      prismaModelName,
      `Scoping resolution error: ${err.message || String(err)}`,
      request
    );

    return NextResponse.json({ error: "Failed to resolve data scope." }, { status: 500 });
  }

  try {
    // Parse query params
    const search = searchParams.get("search") || undefined;
    const pageStr = searchParams.get("page");
    const limitStr = searchParams.get("limit") || "10";
    const sortBy = searchParams.get("sortBy") || undefined;
    const sortOrder = searchParams.get("sortOrder") || "asc";

    // Build Search Filter & Custom Filters
    let combinedWhere: Record<string, any> = { ...whereFilter };

    if (prismaModelName === "lead" && search) {
      // Find parent records matching the search term
      const matchingParents = await prisma.parent.findMany({
        where: {
          parentName: {
            contains: search,
            mode: "insensitive",
          },
        },
        select: { id: true },
      });
      const parentIds = matchingParents.map((p) => p.id);

      const searchConditions: any[] = [
        ...searchableFields.lead.map((field) => ({
          [field]: {
            contains: search,
            mode: "insensitive",
          },
        })),
      ];

      if (parentIds.length > 0) {
        searchConditions.push({
          parentIds: {
            hasSome: parentIds,
          },
        });
      }

      combinedWhere = {
        ...combinedWhere,
        AND: [
          ...(combinedWhere.AND as any[] || []),
          { OR: searchConditions }
        ],
      };
    } else if (prismaModelName === "payment" && search) {
      const matchingParents = await prisma.parent.findMany({
        where: {
          parentName: {
            contains: search,
            mode: "insensitive",
          },
        },
        select: { id: true },
      });
      const parentIds = matchingParents.map((p) => p.id);

      const matchingInvoices = await prisma.invoice.findMany({
        where: {
          invoiceNo: {
            contains: search,
            mode: "insensitive",
          },
        },
        select: { id: true },
      });
      const invoiceIds = matchingInvoices.map((inv) => inv.id);

      const matchingStudents = await prisma.student.findMany({
        where: {
          studentName: {
            contains: search,
            mode: "insensitive",
          },
        },
        select: { id: true, parentIds: true },
      });
      const studentIds = matchingStudents.map((s) => s.id);
      const studentParentIds = Array.from(new Set(matchingStudents.flatMap((s) => s.parentIds)));

      let invoiceIdsFromStudents: string[] = [];
      if (studentIds.length > 0) {
        const invoicesForStudents = await prisma.invoice.findMany({
          where: {
            studentIds: {
              hasSome: studentIds,
            },
          },
          select: { id: true },
        });
        invoiceIdsFromStudents = invoicesForStudents.map((inv) => inv.id);
      }

      const combinedInvoiceIds = Array.from(new Set([...invoiceIds, ...invoiceIdsFromStudents]));
      const combinedParentIds = Array.from(new Set([...parentIds, ...studentParentIds]));

      const searchConditions: any[] = [
        {
          paymentRef: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];

      if (combinedParentIds.length > 0) {
        searchConditions.push({
          parentIds: {
            hasSome: combinedParentIds,
          },
        });
      }

      if (combinedInvoiceIds.length > 0) {
        searchConditions.push({
          invoiceIds: {
            hasSome: combinedInvoiceIds,
          },
        });
      }

      combinedWhere = {
        ...combinedWhere,
        AND: [
          ...(combinedWhere.AND as any[] || []),
          { OR: searchConditions }
        ],
      };
    } else if (prismaModelName === "enrollment" && search) {
      const matchingStudents = await prisma.student.findMany({
        where: {
          studentName: {
            contains: search,
            mode: "insensitive",
          },
        },
        select: { id: true },
      });
      const studentIds = matchingStudents.map((s) => s.id);

      const matchingParents = await prisma.parent.findMany({
        where: {
          parentName: {
            contains: search,
            mode: "insensitive",
          },
        },
        select: { studentIds: true },
      });
      const parentStudentIds = Array.from(new Set(matchingParents.flatMap((p) => p.studentIds)));

      const targetStudentIds = Array.from(new Set([...studentIds, ...parentStudentIds]));

      const matchingCGs = await prisma.classGroup.findMany({
        where: {
          groupName: {
            contains: search,
            mode: "insensitive",
          },
        },
        select: { id: true },
      });
      const cgIds = matchingCGs.map((cg) => cg.id);

      const matchingCourses = await prisma.course.findMany({
        where: {
          courseName: {
            contains: search,
            mode: "insensitive",
          },
        },
        select: { id: true },
      });
      const courseIds = matchingCourses.map((c) => c.id);

      let targetCgIds = [...cgIds];
      if (courseIds.length > 0) {
        const cgByCourses = await prisma.classGroup.findMany({
          where: {
            courseIds: {
              hasSome: courseIds,
            },
          },
          select: { id: true },
        });
        targetCgIds = Array.from(new Set([...targetCgIds, ...cgByCourses.map((cg) => cg.id)]));
      }

      const searchConditions: any[] = [
        {
          enrollmentId: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];

      if (targetStudentIds.length > 0) {
        searchConditions.push({
          studentIds: {
            hasSome: targetStudentIds,
          },
        });
      }

      if (targetCgIds.length > 0) {
        searchConditions.push({
          classGroupIds: {
            hasSome: targetCgIds,
          },
        });
      }

      combinedWhere = {
        ...combinedWhere,
        AND: [
          ...(combinedWhere.AND as any[] || []),
          { OR: searchConditions }
        ],
      };
    } else if (search && searchableFields[prismaModelName]) {
      combinedWhere = {
        ...combinedWhere,
        AND: [
          ...(combinedWhere.AND as any[] || []),
          {
            OR: searchableFields[prismaModelName].map((field) => ({
              [field]: {
                contains: search,
                mode: "insensitive",
              },
            })),
          }
        ]
      };
    }

    // Apply specific filters for "lead" table
    if (prismaModelName === "lead") {
      const branchFilter = searchParams.get("branch");
      const statusFilter = searchParams.get("status");
      const ownerFilter = searchParams.get("owner");
      const sourceFilter = searchParams.get("source");
      const trialDateFilter = searchParams.get("trialDate");

      const filterConditions: any[] = [];

      if (branchFilter) {
        filterConditions.push({ branchIds: { has: branchFilter } });
      }
      if (statusFilter) {
        filterConditions.push({ status: { equals: statusFilter, mode: "insensitive" } });
      }
      if (ownerFilter) {
        filterConditions.push({ ownerIds: { has: ownerFilter } });
      }
      if (sourceFilter) {
        filterConditions.push({ channel: { equals: sourceFilter, mode: "insensitive" } });
      }
      if (trialDateFilter) {
        const targetDate = new Date(trialDateFilter);
        if (!isNaN(targetDate.getTime())) {
          const startOfDay = new Date(targetDate);
          startOfDay.setUTCHours(0, 0, 0, 0);
          const endOfDay = new Date(targetDate);
          endOfDay.setUTCHours(23, 59, 59, 999);

          const matchingTrials = await prisma.trial.findMany({
            where: {
              dateTime: {
                gte: startOfDay,
                lte: endOfDay,
              },
            },
            select: { leadIds: true },
          });
          const leadIds = Array.from(new Set(matchingTrials.flatMap((t) => t.leadIds)));
          filterConditions.push({ id: { in: leadIds } });
        }
      }

      if (filterConditions.length > 0) {
        combinedWhere = {
          ...combinedWhere,
          AND: [
            ...(combinedWhere.AND as any[] || []),
            ...filterConditions,
          ],
        };
      }
    } else if (prismaModelName === "enrollment") {
      const branchFilter = searchParams.get("branch");
      const statusFilter = searchParams.get("onboardingStatus");
      const ownerFilter = searchParams.get("owner");
      const enrollDateFilter = searchParams.get("enrollDate");

      const filterConditions: any[] = [];

      if (branchFilter) {
        filterConditions.push({ branchIds: { has: branchFilter } });
      }
      if (statusFilter) {
        if (statusFilter.toLowerCase() === "pending") {
          filterConditions.push({
            OR: [
              { onboardingStatus: { equals: "Pending", mode: "insensitive" } },
              { onboardingStatus: null },
              { onboardingStatus: "" },
            ],
          });
        } else {
          filterConditions.push({ onboardingStatus: { equals: statusFilter, mode: "insensitive" } });
        }
      }
      if (ownerFilter) {
        const matchingClassGroups = await prisma.classGroup.findMany({
          where: { teacherIds: { has: ownerFilter } },
          select: { id: true },
        });
        const cgIds = matchingClassGroups.map((cg) => cg.id);
        filterConditions.push({ classGroupIds: { hasSome: cgIds } });
      }
      if (enrollDateFilter) {
        const targetDate = new Date(enrollDateFilter);
        if (!isNaN(targetDate.getTime())) {
          const startOfDay = new Date(targetDate);
          startOfDay.setUTCHours(0, 0, 0, 0);
          const endOfDay = new Date(targetDate);
          endOfDay.setUTCHours(23, 59, 59, 999);

          filterConditions.push({
            enrollDate: {
              gte: startOfDay,
              lte: endOfDay,
            },
          });
        }
      }

      if (filterConditions.length > 0) {
        combinedWhere = {
          ...combinedWhere,
          AND: [
            ...(combinedWhere.AND as any[] || []),
            ...filterConditions,
          ],
        };
      }
    } else if (prismaModelName === "payment") {
      const branchFilter = searchParams.get("branch");
      const paymentTypeFilter = searchParams.get("paymentType");
      const paymentMethodFilter = searchParams.get("paymentMethod");
      const dateFilter = searchParams.get("date");

      const filterConditions: any[] = [];

      if (branchFilter) {
        filterConditions.push({ branchIds: { has: branchFilter } });
      }
      if (paymentTypeFilter) {
        filterConditions.push({
          paymentType: {
            contains: paymentTypeFilter,
            mode: "insensitive",
          },
        });
      }
      if (paymentMethodFilter) {
        filterConditions.push({ method: { equals: paymentMethodFilter, mode: "insensitive" } });
      }
      if (dateFilter) {
        const targetDate = new Date(dateFilter);
        if (!isNaN(targetDate.getTime())) {
          const startOfDay = new Date(targetDate);
          startOfDay.setUTCHours(0, 0, 0, 0);
          const endOfDay = new Date(targetDate);
          endOfDay.setUTCHours(23, 59, 59, 999);

          filterConditions.push({
            date: {
              gte: startOfDay,
              lte: endOfDay,
            },
          });
        }
      }

      if (filterConditions.length > 0) {
        combinedWhere = {
          ...combinedWhere,
          AND: [
            ...(combinedWhere.AND as any[] || []),
            ...filterConditions,
          ],
        };
      }
    }

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

    // Define sensitive tables for action classification
    const T1_TABLES = ["Account", "JournalEntry", "LedgerLine", "Vendor", "Expense", "FranchiseRoyalty", "TeacherPay", "TeacherHours"];
    const T2_TABLES = ["User", "Parent", "Student", "Enrollment", "Invoice", "Payment", "NotificationLog"];
    const isSensitive = T1_TABLES.includes(prismaModelName) || T2_TABLES.includes(prismaModelName);
    const action = isSensitive ? "SENSITIVE_ACCESS" : "VIEW";

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

      // Audit after query is executed
      const recordIds = (records as any[]).map((r: any) => r.id).filter(Boolean);
      const fieldIds = getVisibleFieldIds(userRole, prismaModelName, paymentContext);
      let details = `Viewed table ${prismaModelName}. Scoped query filter: ${JSON.stringify(whereFilter)}`;
      if (normalizeRole(userRole) === "tech_admin" && isBreakGlass) {
        details = `Tech Admin breaking glass to view ${prismaModelName} table. Scoped to ${JSON.stringify(whereFilter)}.`;
      }

      auditService.log({
        actorId: dbUser.id,
        actorEmail: dbUser.email,
        role: userRole,
        branchIds: userBranchIds,
        action,
        tableName: prismaModelName,
        recordIds,
        fieldIds,
        result: "SUCCESS",
        details,
      }, request);

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

      // Audit after query is executed
      const recordIds = (records as any[]).map((r: any) => r.id).filter(Boolean);
      const fieldIds = getVisibleFieldIds(userRole, prismaModelName, paymentContext);
      let details = `Viewed table ${prismaModelName}. Scoped query filter: ${JSON.stringify(whereFilter)}`;
      if (normalizeRole(userRole) === "tech_admin" && isBreakGlass) {
        details = `Tech Admin breaking glass to view ${prismaModelName} table. Scoped to ${JSON.stringify(whereFilter)}.`;
      }

      auditService.log({
        actorId: dbUser.id,
        actorEmail: dbUser.email,
        role: userRole,
        branchIds: userBranchIds,
        action,
        tableName: prismaModelName,
        recordIds,
        fieldIds,
        result: "SUCCESS",
        details,
      }, request);

      return NextResponse.json(redactedRecords);
    }
  } catch (error: any) {
    console.error(`[Data Route GET Error] Table: ${table}`, error);
    auditService.logFailure(
      { id: dbUser.id, email: dbUser.email, role: userRole },
      "VIEW",
      prismaModelName,
      `Internal database error: ${error.message || String(error)}`,
      request
    );
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
