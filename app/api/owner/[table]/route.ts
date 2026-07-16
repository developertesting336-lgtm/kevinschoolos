import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { auditService, getVisibleFieldIds } from "@/lib/audit";
import { ownerTablesConfig } from "@/lib/owner-schema";

export const dynamic = "force-dynamic";

// Sensitive tiers classification for auditing
const SENSITIVE_TABLES = [
  "Account",
  "JournalEntry",
  "LedgerLine",
  "Vendor",
  "Expense",
  "FranchiseRoyalty",
  "TeacherPay",
  "TeacherHours",
  "User",
  "Parent",
  "Student",
  "Enrollment",
  "Invoice",
  "Payment",
];

import { checkRBAC, getScopingFilter } from "@/lib/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  const { table } = await params;
  let dbUser: any = null;
  let prismaModelName = "";

  try {
    // 1. Resolve User session & Authenticate
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

    // 2. Fetch user role
    dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, role: true, branchIds: true },
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

    const normalizedTable = table.toLowerCase();
    const config = ownerTablesConfig[normalizedTable];

    if (!config) {
      auditService.logFailure(
        { id: dbUser.id, email: dbUser.email, role: userRole },
        "PERMISSION_DENIED",
        table,
        `Table '${table}' not recognized in owner schema configuration.`,
        request
      );
      return NextResponse.json({ error: `Table '${table}' not found.` }, { status: 404 });
    }

    // Prisma dynamic model mapping
    prismaModelName = config.modelName;

    // Check RBAC permission for the role and table
    const rbacCheck = checkRBAC(userRole, prismaModelName, "read", false);
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

    // 3. Parse query params
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "10", 10));
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || config.defaultSortBy;
    const sortOrder = (searchParams.get("sortOrder") || config.defaultSortOrder) as "asc" | "desc";

    // 4. Build Select clause (Return only fields required by the UI)
    const selectObj: Record<string, boolean> = {};
    config.columns.forEach((col) => {
      selectObj[col.key] = true;
    });

    // 5. Build Where Filter
    const whereConditions: any[] = [];

    // Search clause
    if (search && config.searchableFields.length > 0) {
      whereConditions.push({
        OR: config.searchableFields.map((field) => ({
          [field]: {
            contains: search,
            mode: "insensitive",
          },
        })),
      });
    }

    // Dynamic column filters
    config.filterableFields.forEach((filter) => {
      const val = searchParams.get(filter.key);
      if (val !== null && val !== "") {
        if (filter.type === "boolean") {
          whereConditions.push({ [filter.key]: val === "true" });
        } else {
          whereConditions.push({
            [filter.key]: {
              equals: val,
              mode: "insensitive",
            },
          });
        }
      }
    });

    // Custom filtering for branchId
    const filterBranchId = searchParams.get("branchId");
    if (filterBranchId) {
      // Check if branchIds is in columns list (e.g. branchIds is String[])
      const hasBranchIds = config.columns.some((c) => c.key === "branchIds");
      if (hasBranchIds) {
        whereConditions.push({
          branchIds: {
            has: filterBranchId,
          },
        });
      } else if (prismaModelName === "branch") {
        whereConditions.push({
          id: filterBranchId,
        });
      }
    }

    // Apply role-based scoping filter
    let scopingFilter = {};
    try {
      scopingFilter = await getScopingFilter(
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
    whereConditions.push(scopingFilter);

    const where = whereConditions.length > 0 ? { AND: whereConditions } : {};

    // 6. Build Sorting
    const orderBy = { [sortBy]: sortOrder };

    const skip = (page - 1) * limit;

    const prismaClient = prisma as unknown as Record<
      string,
      {
        findMany: (args: any) => Promise<any[]>;
        count: (args: any) => Promise<number>;
      }
    >;

    // 7. Parallel fetch (Count and Select query)
    const [total, records] = await Promise.all([
      prismaClient[prismaModelName].count({ where }),
      prismaClient[prismaModelName].findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: selectObj,
      }),
    ]);

    // 8. Log sensitive access to audit log
    const isSensitive = SENSITIVE_TABLES.some(
      (t) => t.toLowerCase() === prismaModelName.toLowerCase()
    );
    const action = isSensitive ? "SENSITIVE_ACCESS" : "VIEW";
    const recordIds = records.map((r: any) => r.id).filter(Boolean);
    const fieldIds = getVisibleFieldIds(userRole, prismaModelName, false);

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
      details: `Owner accessed sensitive table ${prismaModelName} (page ${page}, limit ${limit}, search "${search}").`,
    }, request);

    return NextResponse.json({
      data: records,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error(`[Owner API GET Error] Table: ${table}`, error);
    if (dbUser) {
      auditService.logFailure(
        { id: dbUser.id, email: dbUser.email, role: dbUser.role },
        "VIEW",
        prismaModelName || table,
        `Internal server error: ${error.message || String(error)}`,
        request
      );
    }
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
