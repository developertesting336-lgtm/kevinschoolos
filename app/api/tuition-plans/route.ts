import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { normalizeRole } from "@/lib/rbac";
import * as airtableProxy from "@/lib/airtableProxy";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// GET /api/tuition-plans
export async function GET(request: NextRequest) {
  try {
    const session = await validateSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId }
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const userRole = dbUser.role || "staff";
    const normRole = normalizeRole(userRole);

    // Allowed roles: Owner, Office Admin, SMM, Finance
    if (!["owner", "office_admin", "smm", "finance"].includes(normRole)) {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions." }, { status: 403 });
    }

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "10", 10));
    const search = searchParams.get("search") || "";
    const activeParam = searchParams.get("active");
    const billingPeriod = searchParams.get("billingPeriod");
    const courseId = searchParams.get("courseId");
    const branchId = searchParams.get("branchId");
    const sortBy = searchParams.get("sortBy") || "planName";
    const sortOrder = (searchParams.get("sortOrder") || "asc") as "asc" | "desc";

    const whereConditions: any[] = [];

    // Search filter
    if (search) {
      whereConditions.push({
        OR: [
          { planName: { contains: search, mode: "insensitive" } },
          { nameRussian: { contains: search, mode: "insensitive" } },
          { nameKyrgyz: { contains: search, mode: "insensitive" } }
        ]
      });
    }

    // Active status filter
    if (activeParam === "true") {
      whereConditions.push({ active: true });
    } else if (activeParam === "false") {
      whereConditions.push({ active: false });
    }

    // Billing Period filter
    if (billingPeriod) {
      whereConditions.push({ billingPeriod: { equals: billingPeriod, mode: "insensitive" } });
    }

    // Course filter
    if (courseId) {
      whereConditions.push({ courseIds: { has: courseId } });
    }

    // Branch filter (Resolves via active class groups)
    if (branchId) {
      const classGroups = await prisma.classGroup.findMany({
        where: { branchIds: { has: branchId } },
        select: { courseIds: true }
      });
      const courseIdsInBranch = Array.from(new Set(classGroups.flatMap(cg => cg.courseIds)));
      whereConditions.push({
        courseIds: {
          hasSome: courseIdsInBranch
        }
      });
    }

    const where = whereConditions.length > 0 ? { AND: whereConditions } : {};

    const [total, records] = await Promise.all([
      prisma.tuitionPlan.count({ where }),
      prisma.tuitionPlan.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit
      })
    ]);

    // Fetch enrollments count for each plan
    const recordsWithCount = await Promise.all(
      records.map(async (tp) => {
        const enrollmentsCount = await prisma.enrollment.count({
          where: { tuitionPlanIds: { has: tp.id } }
        });
        return {
          ...tp,
          enrollmentsCount
        };
      })
    );

    return NextResponse.json({
      data: recordsWithCount,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error("[Tuition Plans GET Error]", error);
    return NextResponse.json({ error: error.message || "Internal server error." }, { status: 500 });
  }
}

// POST /api/tuition-plans
export async function POST(request: NextRequest) {
  try {
    const session = await validateSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId }
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const userRole = dbUser.role || "staff";
    const normRole = normalizeRole(userRole);

    // Only Owner and Office Admin can write
    if (!["owner", "office_admin"].includes(normRole)) {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions." }, { status: 403 });
    }

    const body = await request.json();
    const {
      planName,
      courseId,
      amount,
      billingPeriod,
      active = true,
      nameRussian = "",
      nameKyrgyz = "",
      discount = false,
      discountType = null,
      discountValue = null,
      discountReason = null
    } = body;

    // 1. Validations
    if (!planName || !planName.trim()) {
      return NextResponse.json({ error: "Plan Name is required." }, { status: 400 });
    }
    if (!courseId) {
      return NextResponse.json({ error: "Course is required." }, { status: 400 });
    }
    if (amount === undefined || amount === null || Number(amount) <= 0) {
      return NextResponse.json({ error: "Amount must be greater than zero." }, { status: 400 });
    }
    if (!billingPeriod || !["Monthly", "Term", "Annual"].includes(billingPeriod)) {
      return NextResponse.json({ error: "Billing Period must be Monthly, Term, or Annual." }, { status: 400 });
    }

    // Verify course exists
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return NextResponse.json({ error: "Selected Course does not exist." }, { status: 400 });
    }

    // Discount fields validation
    let finalDiscountValue = null;
    let finalDiscountType = null;
    let finalDiscountReason = null;

    if (discount) {
      if (!discountType || !["Percent", "Fixed"].includes(discountType)) {
        return NextResponse.json({ error: "Discount Type must be Percent or Fixed." }, { status: 400 });
      }
      if (discountValue === undefined || discountValue === null || Number(discountValue) <= 0) {
        return NextResponse.json({ error: "Discount Value must be greater than zero." }, { status: 400 });
      }
      if (!discountReason) {
        return NextResponse.json({ error: "Discount Reason is required when discount is enabled." }, { status: 400 });
      }
      finalDiscountValue = Number(discountValue);
      finalDiscountType = discountType;
      finalDiscountReason = discountReason;
    }

    // Recompute Net Amount
    let netAmount = Number(amount);
    if (discount) {
      if (discountType === "Percent") {
        netAmount = Number(amount) - (Number(amount) * finalDiscountValue! / 100);
      } else if (discountType === "Fixed") {
        netAmount = Number(amount) - finalDiscountValue!;
      }
    }

    if (netAmount < 0) {
      return NextResponse.json({ error: "Net Amount cannot be negative." }, { status: 400 });
    }

    // 2. Duplicate validation
    const duplicate = await prisma.tuitionPlan.findFirst({
      where: {
        courseIds: { has: courseId },
        billingPeriod,
        planName: { equals: planName, mode: "insensitive" }
      }
    });

    if (duplicate) {
      return NextResponse.json({ error: "A tuition plan with the same Name, Course, and Billing Period already exists." }, { status: 400 });
    }

    // 3. Write to Airtable Proxy
    const airtableData = {
      "fldXQbeiCiTAeC8Q5": planName,
      "fldOm9NbQvNikr7e5": Number(amount),
      "fldzJoaYdz7VwF6r2": billingPeriod,
      "fldXIJDEPCkEqA2UZ": active,
      "fldUmXiXvDOqVevAy": [courseId],
      "fldzWFoNsJ4Fva7IR": nameRussian || null,
      "fldJah9AdenE3lzDY": nameKyrgyz || null
    };

    let createdAirtable;
    try {
      createdAirtable = await airtableProxy.createRecord("tuitionplan", airtableData);
    } catch (err: any) {
      console.error("[Tuition Plan Airtable Write Error]", err);
      return NextResponse.json({ error: `Airtable synchronization failed: ${err.message}` }, { status: 502 });
    }

    // 4. Save to Postgres
    const newPlan = await prisma.tuitionPlan.create({
      data: {
        id: createdAirtable.id,
        planName,
        amount: Number(amount),
        billingPeriod,
        active,
        courseIds: [courseId],
        nameRussian: nameRussian || null,
        nameKyrgyz: nameKyrgyz || null,
        discount,
        discountType: finalDiscountType,
        discountValue: finalDiscountValue,
        discountReason: finalDiscountReason,
        netAmount
      }
    });

    // 5. Audit creation
    logAudit({
      userId: dbUser.id,
      role: dbUser.role || "staff",
      action: "create",
      target: "TuitionPlan",
      status: "APPROVED",
      details: `Created Tuition Plan ID ${newPlan.id} (${planName}) linked to Course ID ${courseId}. Net Amount: ${netAmount}.`
    }, request);

    return NextResponse.json(newPlan);
  } catch (error: any) {
    console.error("[Create Tuition Plan Error]", error);
    return NextResponse.json({ error: error.message || "Internal server error." }, { status: 500 });
  }
}
