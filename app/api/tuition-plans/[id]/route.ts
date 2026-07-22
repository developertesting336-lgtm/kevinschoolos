import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { normalizeRole } from "@/lib/rbac";
import * as airtableProxy from "@/lib/airtableProxy";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// GET /api/tuition-plans/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const plan = await prisma.tuitionPlan.findUnique({
      where: { id }
    });

    if (!plan) {
      return NextResponse.json({ error: "Tuition Plan not found." }, { status: 404 });
    }

    const enrollmentsCount = await prisma.enrollment.count({
      where: { tuitionPlanIds: { has: id } }
    });

    return NextResponse.json({
      ...plan,
      enrollmentsCount
    });
  } catch (error: any) {
    console.error("[Tuition Plan Single GET Error]", error);
    return NextResponse.json({ error: error.message || "Internal server error." }, { status: 500 });
  }
}

// PATCH /api/tuition-plans/:id
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const plan = await prisma.tuitionPlan.findUnique({
      where: { id }
    });

    if (!plan) {
      return NextResponse.json({ error: "Tuition Plan not found." }, { status: 404 });
    }

    const body = await request.json();
    const {
      planName,
      amount,
      billingPeriod,
      active,
      nameRussian,
      nameKyrgyz,
      discount,
      discountType,
      discountValue,
      discountReason
    } = body;

    // 1. Validations
    if (planName !== undefined && (!planName || !planName.trim())) {
      return NextResponse.json({ error: "Plan Name cannot be empty." }, { status: 400 });
    }
    if (amount !== undefined && (amount === null || Number(amount) <= 0)) {
      return NextResponse.json({ error: "Amount must be greater than zero." }, { status: 400 });
    }
    if (billingPeriod !== undefined && !["Monthly", "Term", "Annual"].includes(billingPeriod)) {
      return NextResponse.json({ error: "Billing Period must be Monthly, Term, or Annual." }, { status: 400 });
    }

    const finalPlanName = planName !== undefined ? planName : plan.planName;
    const finalAmount = amount !== undefined ? Number(amount) : (plan.amount || 0);
    const finalBillingPeriod = billingPeriod !== undefined ? billingPeriod : plan.billingPeriod;
    const finalActive = active !== undefined ? active : plan.active;
    const finalNameRussian = nameRussian !== undefined ? nameRussian : plan.nameRussian;
    const finalNameKyrgyz = nameKyrgyz !== undefined ? nameKyrgyz : plan.nameKyrgyz;
    const finalDiscount = discount !== undefined ? discount : plan.discount;

    let finalDiscountValue = plan.discountValue;
    let finalDiscountType = plan.discountType;
    let finalDiscountReason = plan.discountReason;

    if (finalDiscount) {
      const type = discountType !== undefined ? discountType : plan.discountType;
      const value = discountValue !== undefined ? discountValue : plan.discountValue;
      const reason = discountReason !== undefined ? discountReason : plan.discountReason;

      if (!type || !["Percent", "Fixed"].includes(type)) {
        return NextResponse.json({ error: "Discount Type must be Percent or Fixed." }, { status: 400 });
      }
      if (value === undefined || value === null || Number(value) <= 0) {
        return NextResponse.json({ error: "Discount Value must be greater than zero." }, { status: 400 });
      }
      if (!reason) {
        return NextResponse.json({ error: "Discount Reason is required when discount is enabled." }, { status: 400 });
      }
      finalDiscountValue = Number(value);
      finalDiscountType = type;
      finalDiscountReason = reason;
    } else {
      finalDiscountValue = null;
      finalDiscountType = null;
      finalDiscountReason = null;
    }

    // Recompute Net Amount
    let netAmount = Number(finalAmount);
    if (finalDiscount) {
      if (finalDiscountType === "Percent") {
        netAmount = Number(finalAmount) - (Number(finalAmount) * finalDiscountValue! / 100);
      } else if (finalDiscountType === "Fixed") {
        netAmount = Number(finalAmount) - finalDiscountValue!;
      }
    }

    if (netAmount < 0) {
      return NextResponse.json({ error: "Net Amount cannot be negative." }, { status: 400 });
    }

    // 2. Duplicate validation
    if (planName !== undefined || billingPeriod !== undefined) {
      const courseId = plan.courseIds[0];
      if (courseId) {
        const duplicate = await prisma.tuitionPlan.findFirst({
          where: {
            id: { not: id },
            courseIds: { has: courseId },
            billingPeriod: finalBillingPeriod,
            planName: { equals: finalPlanName, mode: "insensitive" }
          }
        });

        if (duplicate) {
          return NextResponse.json({ error: "A tuition plan with the same Name, Course, and Billing Period already exists." }, { status: 400 });
        }
      }
    }

    // 3. Update Airtable Proxy
    const airtableData: Record<string, any> = {};
    if (planName !== undefined) airtableData["fldXQbeiCiTAeC8Q5"] = finalPlanName;
    if (amount !== undefined) airtableData["fldOm9NbQvNikr7e5"] = Number(finalAmount);
    if (billingPeriod !== undefined) airtableData["fldzJoaYdz7VwF6r2"] = finalBillingPeriod;
    if (active !== undefined) airtableData["fldXIJDEPCkEqA2UZ"] = finalActive;
    if (nameRussian !== undefined) airtableData["fldzWFoNsJ4Fva7IR"] = finalNameRussian || null;
    if (nameKyrgyz !== undefined) airtableData["fldJah9AdenE3lzDY"] = finalNameKyrgyz || null;

    try {
      await airtableProxy.updateRecord("tuitionplan", id, airtableData);
    } catch (err: any) {
      console.error("[Tuition Plan Airtable Update Error]", err);
      return NextResponse.json({ error: `Airtable synchronization failed: ${err.message}` }, { status: 502 });
    }

    // 4. Save to Postgres
    const updatedPlan = await prisma.tuitionPlan.update({
      where: { id },
      data: {
        planName: finalPlanName,
        amount: Number(finalAmount),
        billingPeriod: finalBillingPeriod,
        active: finalActive,
        nameRussian: finalNameRussian || null,
        nameKyrgyz: finalNameKyrgyz || null,
        discount: finalDiscount,
        discountType: finalDiscountType,
        discountValue: finalDiscountValue,
        discountReason: finalDiscountReason,
        netAmount
      }
    });

    // 5. Audit update
    logAudit({
      userId: dbUser.id,
      role: dbUser.role || "staff",
      action: "update",
      target: "TuitionPlan",
      status: "APPROVED",
      details: `Updated Tuition Plan ID ${id}. Set Active: ${finalActive}, Net Amount: ${netAmount}.`
    }, request);

    return NextResponse.json(updatedPlan);
  } catch (error: any) {
    console.error("[Update Tuition Plan Error]", error);
    return NextResponse.json({ error: error.message || "Internal server error." }, { status: 500 });
  }
}
