import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkRBAC, getScopingFilter } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // 1. Authentication
    const session = await validateSession();
    if (!session) {
      logAudit({
        action: "read",
        target: "ClassGroup",
        status: "DENIED",
        details: "No active session found.",
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. RBAC permissions check
    const rbacCheck = checkRBAC(session.role, "ClassGroup", "read", false);
    if (!rbacCheck.allowed) {
      logAudit({
        userId: session.userId,
        role: session.role,
        action: "read",
        target: "ClassGroup",
        status: "DENIED",
        details: rbacCheck.reason,
      });
      return NextResponse.json({ error: rbacCheck.reason }, { status: 403 });
    }

    // Fetch full user context for database scoping
    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!dbUser) {
      logAudit({
        userId: session.userId,
        role: session.role,
        action: "read",
        target: "ClassGroup",
        status: "DENIED",
        details: `User ID ${session.userId} not found in database.`,
      });
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || undefined;
    const pageStr = searchParams.get("page");
    const limitStr = searchParams.get("limit") || "5";

    // 3. Branch Scoping and Role filters
    const scopingFilter = await getScopingFilter(
      { id: dbUser.id, role: dbUser.role || "staff", branchIds: dbUser.branchIds || [] },
      "ClassGroup"
    );

    // 4. Audit step (Authentication -> RBAC -> Scoping -> Audit)
    logAudit({
      userId: dbUser.id,
      role: dbUser.role || "staff",
      action: "read",
      target: "ClassGroup",
      status: "APPROVED",
      details: `Active Groups list scoped: ${JSON.stringify(scopingFilter)}`,
    });

    const baseWhere = {
      status: { equals: "active", mode: "insensitive" } as const,
    };

    const combinedWhere = {
      AND: [
        baseWhere,
        scopingFilter,
        search
          ? {
              groupName: {
                contains: search,
                mode: "insensitive" as const,
              },
            }
          : undefined,
      ].filter(Boolean) as any[],
    };

    let dbGroups;
    let total = 0;
    const page = pageStr ? (parseInt(pageStr, 10) || 1) : null;
    const limit = parseInt(limitStr, 10) || 5;

    if (page !== null) {
      const skip = (page - 1) * limit;
      const [totalCount, groups] = await Promise.all([
        prisma.classGroup.count({ where: combinedWhere }),
        prisma.classGroup.findMany({
          where: combinedWhere,
          skip,
          take: limit,
          orderBy: { groupName: "asc" },
        }),
      ]);
      total = totalCount;
      dbGroups = groups;
    } else {
      dbGroups = await prisma.classGroup.findMany({
        where: combinedWhere,
        take: 10,
        orderBy: { groupName: "asc" },
      });
    }

    const dbEnrollments = await prisma.enrollment.findMany({
      where: { status: { equals: "active", mode: "insensitive" } },
    });

    const groupData = dbGroups.map((group) => {
      const studentCount = dbEnrollments.filter((e) =>
        e.classGroupIds.includes(group.id),
      ).length;

      return {
        id: group.id,
        name: group.groupName,
        studentCount,
        capacity: group.capacity || 8,
      };
    });

    if (page !== null) {
      return NextResponse.json({
        data: groupData,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    return NextResponse.json(groupData);
  } catch (error) {
    console.error("[Dashboard Groups API Error]", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
