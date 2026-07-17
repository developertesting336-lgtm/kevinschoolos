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

    // Fetch Franchise Royalties
    const [total, royalties] = await Promise.all([
      prisma.franchiseRoyalty.count({ where }),
      prisma.franchiseRoyalty.findMany({
        where,
        orderBy: { period: "desc" },
        skip,
        take: limit,
      }),
    ]);

    // Format data and calculate royaltyAmount & dueDate
    const data = royalties.map((r) => {
      const revenue = r.revenueBase || 0;
      const pct = r.royaltyPercent || 0;
      const amount = (revenue * pct) / 100;
      
      let dueDate = null;
      if (r.period) {
        const periodDate = new Date(r.period);
        dueDate = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 15).toISOString();
      }

      return {
        ...r,
        royaltyAmount: amount,
        dueDate,
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
    console.error("[Finance Royalties API Error]", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}