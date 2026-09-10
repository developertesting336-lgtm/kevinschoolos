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
    if (!["finance", "owner", "office_admin"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userBranchIds = dbUser.branchIds || [];
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "10", 10));
    const branchFilter = searchParams.get("branchId") || searchParams.get("branch");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search");

    // Build filters
    const whereConditions: any[] = [];
    if (userRole === "finance") {
      whereConditions.push({ branchIds: { hasSome: userBranchIds } });
    }
    if (branchFilter) {
      whereConditions.push({ branchIds: { has: branchFilter } });
    }

    // Date range filter
    if (startDate || endDate) {
      const dateFilter: any = {};
      if (startDate) {
        dateFilter.gte = new Date(`${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        dateFilter.lte = new Date(`${endDate}T23:59:59.999Z`);
      }
      whereConditions.push({ date: dateFilter });
    }

    const where = whereConditions.length > 0 ? { AND: whereConditions } : {};

    // Query candidate payments
    const allPayments = await prisma.payment.findMany({
      where,
      orderBy: { date: "desc" },
    });

    if (allPayments.length === 0) {
      return NextResponse.json({
        data: [],
        pagination: { total: 0, page, limit, totalPages: 1 },
        totalAmount: 0,
      });
    }

    // Collect linked invoices
    const invoiceIds = Array.from(new Set(allPayments.flatMap((p) => p.invoiceIds)));
    const invoices = invoiceIds.length > 0
      ? await prisma.invoice.findMany({
          where: { id: { in: invoiceIds } },
          select: { id: true, studentIds: true, parentIds: true },
        })
      : [];

    const invoiceMap = new Map(invoices.map((inv) => [inv.id, inv]));

    // Gather ALL parentIds first (from payments and invoices)
    const parentIdsSet = new Set<string>();
    allPayments.flatMap((p) => p.parentIds).forEach((pId) => parentIdsSet.add(pId));
    invoices.flatMap((inv) => inv.parentIds || []).forEach((pId) => parentIdsSet.add(pId));

    // Fetch parents to get parentNames and their linked studentIds
    const parentIdsArray = Array.from(parentIdsSet);
    const parents = parentIdsArray.length > 0
      ? await prisma.parent.findMany({
          where: { id: { in: parentIdsArray } },
          select: { id: true, parentName: true, studentIds: true },
        })
      : [];

    const parentMap = new Map(parents.map((p) => [p.id, p]));

    // Now gather ALL studentIds (from invoices, payments, AND parents)
    const studentIdsSet = new Set<string>();
    invoices.flatMap((inv) => inv.studentIds || []).forEach((sId) => studentIdsSet.add(sId));
    parents.flatMap((p) => p.studentIds || []).forEach((sId) => studentIdsSet.add(sId));

    // Fetch ALL students with studentName and parentIds
    const studentIdsArray = Array.from(studentIdsSet);
    const students = studentIdsArray.length > 0
      ? await prisma.student.findMany({
          where: { id: { in: studentIdsArray } },
          select: { id: true, studentName: true, parentIds: true },
        })
      : [];
    const studentMap = new Map(students.map((s) => [s.id, s]));

    // Add any parent IDs found on student records
    for (const s of students) {
      s.parentIds?.forEach((pId) => {
        if (!parentMap.has(pId)) {
          parentIdsSet.add(pId);
        }
      });
    }

    // Fetch any missing parents referenced by students
    const missingParentIds = Array.from(parentIdsSet).filter((pId) => !parentMap.has(pId));
    if (missingParentIds.length > 0) {
      const extraParents = await prisma.parent.findMany({
        where: { id: { in: missingParentIds } },
        select: { id: true, parentName: true, studentIds: true },
      });
      extraParents.forEach((p) => parentMap.set(p.id, p));
    }

    // Fetch branches
    const branchIds = Array.from(new Set(allPayments.flatMap((p) => p.branchIds)));
    const branches = branchIds.length > 0
      ? await prisma.branch.findMany({
          where: { id: { in: branchIds } },
          select: { id: true, name: true },
        })
      : [];
    const branchMap = new Map(branches.map((b) => [b.id, b.name]));

    // Format and filter paid student fee records - ONLY those with a linked parent
    const enrichedPayments: any[] = [];

    for (const payment of allPayments) {
      const sIds = new Set<string>();
      const pNames = new Set<string>();

      // Check payment's own parentIds
      for (const pId of payment.parentIds) {
        const p = parentMap.get(pId);
        if (p) {
          if (p.parentName) pNames.add(p.parentName);
          p.studentIds?.forEach((sId) => sIds.add(sId));
        }
      }

      // Check linked invoices
      for (const invId of payment.invoiceIds) {
        const inv = invoiceMap.get(invId);
        if (inv) {
          inv.studentIds?.forEach((id) => sIds.add(id));
          inv.parentIds?.forEach((pId) => {
            const p = parentMap.get(pId);
            if (p) {
              if (p.parentName) pNames.add(p.parentName);
              p.studentIds?.forEach((sId) => sIds.add(sId));
            }
          });
        }
      }

      // Check linked students for their parentIds
      for (const sId of Array.from(sIds)) {
        const st = studentMap.get(sId);
        if (st && st.parentIds) {
          st.parentIds.forEach((pId) => {
            const p = parentMap.get(pId);
            if (p && p.parentName) pNames.add(p.parentName);
          });
        }
      }

      // Requirement: ONLY return paid student fee data for students who have a linked parent
      if (pNames.size === 0) {
        continue;
      }

      const studentNames = Array.from(sIds)
        .map((id) => studentMap.get(id)?.studentName)
        .filter(Boolean);

      const branchName = payment.branchIds.map((bId) => branchMap.get(bId)).filter(Boolean).join(", ") || "Main Branch";

      enrichedPayments.push({
        id: payment.id,
        paymentRef: payment.paymentRef,
        date: payment.date,
        amount: payment.amount || 0,
        method: payment.method || "Cash",
        paymentType: payment.paymentType || "Tuition Fee",
        status: "Paid",
        studentName: studentNames.length > 0 ? studentNames.join(", ") : "Student",
        parentName: Array.from(pNames).join(", "),
        branchName,
      });
    }

    let filteredPayments = enrichedPayments;
    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      filteredPayments = enrichedPayments.filter((item) =>
        item.studentName.toLowerCase().includes(term)
      );
    }

    const total = filteredPayments.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const totalAmount = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Apply pagination
    const paginatedData = filteredPayments.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
      data: paginatedData,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
      totalAmount,
    });
  } catch (error: any) {
    console.error("[Finance Student Fees API Error]", error);
    return NextResponse.json(
      { error: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}
