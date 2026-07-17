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

    // Parse params
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "10", 10));
    const skip = (page - 1) * limit;
    const branchFilter = searchParams.get("branchId") || searchParams.get("branch");

    // Build filters
    const whereConditions: any[] = [];
    if (userRole === "finance") {
      whereConditions.push(branchScopedFilter);
    }
    if (branchFilter) {
      whereConditions.push({ branchIds: { has: branchFilter } });
    }

    const where = whereConditions.length > 0 ? { AND: whereConditions } : {};

    // Fetch TeacherPay runs
    const [total, payRuns] = await Promise.all([
      prisma.teacherPay.count({ where }),
      prisma.teacherPay.findMany({
        where,
        orderBy: { period: "desc" },
        skip,
        take: limit,
      }),
    ]);

    // Fetch teachers (Users) to map IDs to names
    const teacherIds = Array.from(new Set(payRuns.flatMap((pr) => pr.teacherIds)));
    const teachers = teacherIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: teacherIds } },
          select: { id: true, fullName: true },
        })
      : [];
    const teacherMap = new Map(teachers.map((t) => [t.id, t.fullName]));

    // Manually join TeacherHours by payRunIds
    const payRunIds = payRuns.map((pr) => pr.id);
    const teacherHours = payRunIds.length > 0
      ? await prisma.teacherHours.findMany({
          where: {
            payRunIds: { hasSome: payRunIds },
          },
        })
      : [];

    // Calculate adjustments, finalPay, and attach teacher details
    const data = payRuns.map((pr) => {
      const hours = pr.hours || 0;
      const rate = pr.rate || 0;
      const gross = pr.grossPay || 0;
      const computedPay = hours * rate;
      const adjustments = gross - computedPay;

      return {
        ...pr,
        teacherName: pr.teacherIds.map((id) => teacherMap.get(id)).filter(Boolean).join(", ") || "Unknown Teacher",
        adjustments,
        finalPay: gross,
        teacherHours: teacherHours.filter((th) =>
          th.payRunIds.includes(pr.id)
        ),
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
    console.error("[Finance TeacherPay API Error]", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}