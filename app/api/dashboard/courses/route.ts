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
        target: "Course",
        status: "DENIED",
        details: "No active session found.",
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. RBAC permissions check
    const rbacCheck = checkRBAC(session.role, "Course", "read", false);
    if (!rbacCheck.allowed) {
      logAudit({
        userId: session.userId,
        role: session.role,
        action: "read",
        target: "Course",
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
        target: "Course",
        status: "DENIED",
        details: `User ID ${session.userId} not found in database.`,
      });
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || undefined;
    const pageStr = searchParams.get("page");
    const limitStr = searchParams.get("limit") || "6";

    // 3. Branch Scoping and Role filters
    const scopingFilter = await getScopingFilter(
      { id: dbUser.id, role: dbUser.role || "staff", branchIds: dbUser.branchIds || [] },
      "Course"
    );

    // 4. Audit step (Authentication -> RBAC -> Scoping -> Audit)
    logAudit({
      userId: dbUser.id,
      role: dbUser.role || "staff",
      action: "read",
      target: "Course",
      status: "APPROVED",
      details: `Courses list scoped: ${JSON.stringify(scopingFilter)}`,
    });

    const combinedWhere = {
      AND: [
        scopingFilter,
        search
          ? {
              OR: [
                {
                  courseName: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
                {
                  nameRussian: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
              ],
            }
          : undefined,
      ].filter(Boolean) as any[],
    };

    const page = pageStr ? (parseInt(pageStr, 10) || 1) : null;
    const limit = parseInt(limitStr, 10) || 6;

    if (page !== null) {
      const skip = (page - 1) * limit;
      const [totalCount, courses] = await Promise.all([
        prisma.course.count({ where: combinedWhere }),
        prisma.course.findMany({
          where: combinedWhere,
          skip,
          take: limit,
          orderBy: { courseName: "asc" },
        }),
      ]);

      return NextResponse.json({
        data: courses,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
        },
      });
    } else {
      const coursesCount = await prisma.course.count({ where: combinedWhere });
      const coursesList = await prisma.course.findMany({
        where: combinedWhere,
        take: 6,
        orderBy: { courseName: "asc" },
      });

      return NextResponse.json({
        count: coursesCount,
        courses: coursesList,
      });
    }
  } catch (error) {
    console.error("[Dashboard Courses API Error]", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
