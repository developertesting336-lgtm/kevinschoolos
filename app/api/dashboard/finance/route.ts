import { NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { normalizeRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await validateSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.userId;

    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, branchIds: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const userRole = normalizeRole(dbUser.role || "staff");
    if (userRole !== "finance") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userBranchIds = dbUser.branchIds || [];

    // Fetch branches scoped to Finance
    const branches = await prisma.branch.findMany({
      where: { id: { in: userBranchIds } },
      select: { id: true, name: true },
    });

    const branchScopedFilter = { branchIds: { hasSome: userBranchIds } };

    // Fetch recent invoices, payments, expenses, and accounts in parallel
    const [invoices, payments, expenses, accounts] = await Promise.all([
      prisma.invoice.findMany({
        where: branchScopedFilter,
        orderBy: { issueDate: "desc" },
        take: 4,
      }),
      prisma.payment.findMany({
        where: branchScopedFilter,
        orderBy: { date: "desc" },
        take: 4,
      }),
      prisma.expense.findMany({
        where: branchScopedFilter,
        orderBy: { date: "desc" },
        take: 4,
      }),
      prisma.account.findMany({
        where: branchScopedFilter,
        orderBy: { accountNo: "asc" },
        take: 4,
      }),
    ]);

    return NextResponse.json({
      branches,
      invoices,
      payments,
      expenses,
      accounts,
    });
  } catch (error) {
    console.error("[Finance Dashboard API Error]", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
