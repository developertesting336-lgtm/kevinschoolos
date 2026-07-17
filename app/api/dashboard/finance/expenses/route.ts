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

    // Fetch expenses
    const [total, expenses] = await Promise.all([
      prisma.expense.count({ where }),
      prisma.expense.findMany({
        where,
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
    ]);

    // Fetch related vendors and branches
    const vendorIds = Array.from(new Set(expenses.flatMap((e) => e.vendorIds)));
    const branchIds = Array.from(new Set(expenses.flatMap((e) => e.branchIds)));

    const [vendors, branches] = await Promise.all([
      vendorIds.length > 0
        ? prisma.vendor.findMany({
            where: { id: { in: vendorIds } },
            select: { id: true, vendorName: true, category: true },
          })
        : [],
      branchIds.length > 0
        ? prisma.branch.findMany({
            where: { id: { in: branchIds } },
            select: { id: true, name: true },
          })
        : [],
    ]);

    const vendorMap = new Map(vendors.map((v) => [v.id, v]));
    const branchMap = new Map(branches.map((b) => [b.id, b.name]));

    // Format data, map vendor name/category, branch names, and approval status
    const data = expenses.map((exp) => {
      const vendor = exp.vendorIds.map((id) => vendorMap.get(id)).filter(Boolean)[0] || null;
      return {
        ...exp,
        vendorName: vendor ? vendor.vendorName : "Unknown Vendor",
        category: vendor ? (vendor.category || "Operational") : "Operational",
        branchName: exp.branchIds.map((id) => branchMap.get(id)).filter(Boolean).join(", ") || "General",
        submittedBy: "Branch Admin",
        approvalStatus: exp.paid ? "Approved" : "Pending",
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
    console.error("[Finance Expenses API Error]", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}