import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import * as airtableProxy from "@/lib/airtableProxy";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// GET /api/students/fees?month=YYYY-MM
export async function GET(request: NextRequest) {
  try {
    const session = await validateSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    let month = searchParams.get("month");
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      const now = new Date();
      month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }

    const [yearStr, monthStr] = month.split("-");
    const year = parseInt(yearStr, 10);
    const monthIdx = parseInt(monthStr, 10) - 1;

    const startOfMonth = new Date(Date.UTC(year, monthIdx, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, monthIdx + 1, 0, 23, 59, 59, 999));

    // Query payments in this date range
    const payments = await prisma.payment.findMany({
      where: {
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      orderBy: { date: "desc" },
    });

    // Collect all invoice IDs linked to these payments
    const invoiceIds = Array.from(new Set(payments.flatMap((p) => p.invoiceIds)));
    const invoices = invoiceIds.length > 0
      ? await prisma.invoice.findMany({
          where: { id: { in: invoiceIds } },
        })
      : [];

    const invoiceMap = new Map(invoices.map((inv) => [inv.id, inv]));

    // Map studentId -> fee record summary
    const feeRecords: Record<
      string,
      {
        status: "Paid" | "Unpaid";
        amount?: number;
        paymentRef?: string;
        date?: string;
        method?: string;
        paymentId?: string;
      }
    > = {};

    for (const payment of payments) {
      let linkedStudentIds: string[] = [];

      for (const invId of payment.invoiceIds) {
        const inv = invoiceMap.get(invId);
        if (inv && inv.studentIds && inv.studentIds.length > 0) {
          linkedStudentIds.push(...inv.studentIds);
        }
      }

      // If no student ID from invoice, check if parents match students
      if (linkedStudentIds.length === 0 && payment.parentIds && payment.parentIds.length > 0) {
        const parents = await prisma.parent.findMany({
          where: { id: { in: payment.parentIds } },
          select: { studentIds: true },
        });
        linkedStudentIds = parents.flatMap((p) => p.studentIds);
      }

      for (const studentId of linkedStudentIds) {
        if (!feeRecords[studentId]) {
          feeRecords[studentId] = {
            status: "Paid",
            amount: payment.amount || 0,
            paymentRef: payment.paymentRef,
            date: payment.date ? payment.date.toISOString().split("T")[0] : "",
            method: payment.method || "Cash",
            paymentId: payment.id,
          };
        }
      }
    }

    return NextResponse.json({
      month,
      feeRecords,
    });
  } catch (error: any) {
    console.error("[Student Fees GET Error]", error);
    return NextResponse.json({ error: error.message || "Internal server error." }, { status: 500 });
  }
}

// POST /api/students/fees
export async function POST(request: NextRequest) {
  try {
    const session = await validateSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    if ((dbUser.role || "").toLowerCase().trim() === "teacher") {
      return NextResponse.json({ error: "Teachers do not have permission to submit fee records." }, { status: 403 });
    }

    const body = await request.json();
    const { studentId, amount, date, method = "Cash", month } = body;

    // 1. Validation
    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required." }, { status: 400 });
    }
    if (amount === undefined || amount === null || Number(amount) <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number." }, { status: 400 });
    }
    if (!["Cash", "Bank Transfer", "Card"].includes(method)) {
      return NextResponse.json({ error: "Method must be Cash, Bank Transfer, or Card." }, { status: 400 });
    }

    // 2. Fetch Student details to resolve Parent and Branch automatically
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found." }, { status: 404 });
    }

    const parentIds = student.parentIds && student.parentIds.length > 0 ? student.parentIds : [];
    const branchIds = student.branchIds && student.branchIds.length > 0 ? student.branchIds : [];

    let nameForRef = student.studentName;
    if (parentIds.length > 0) {
      const parentRecord = await prisma.parent.findUnique({
        where: { id: parentIds[0] },
      });
      if (parentRecord && parentRecord.parentName) {
        nameForRef = parentRecord.parentName;
      }
    }

    // Submission Date formatting (YYYY-MM-DD)
    const paymentDateObj = date ? new Date(date) : new Date();
    const dateStr = paymentDateObj.toISOString().split("T")[0];

    // Build Payment Ref following exact Airtable format: YYYY-MM-DD - [Name]
    const paymentRef = `${dateStr} - ${nameForRef}`;

    // 3. Find or Create Invoice for student for month
    let invoice = await prisma.invoice.findFirst({
      where: {
        studentIds: { has: studentId },
      },
      orderBy: { issueDate: "desc" },
    });

    if (!invoice) {
      // Create fallback Invoice in Prisma
      const invoiceNo = `INV-${studentId.slice(-4)}-${dateStr.replace(/-/g, "")}`;
      invoice = await prisma.invoice.create({
        data: {
          id: `recInv${Date.now()}${Math.floor(Math.random() * 1000)}`,
          invoiceNo,
          issueDate: paymentDateObj,
          dueDate: paymentDateObj,
          amount: Number(amount),
          amountPaid: Number(amount),
          status: "Paid",
          parentIds,
          studentIds: [studentId],
          branchIds,
        },
      });

      // Try creating Invoice in Airtable as well
      try {
        await airtableProxy.createRecord("invoice", {
          "fldH7V3d1Jd7xT02z": invoiceNo, // Invoice No
          "fldqJey7ciPEqd59k": "Paid",    // Status
          "fldA0z94yK9mQ9v4n": Number(amount), // Amount
          "fldQZk9cM1Y7nS1kL": [studentId], // Student
          "fldp8N4zQk0b0X1mM": parentIds,    // Parent
          "fldX1Y2Z3A4B5C6D7": branchIds,    // Branch
        });
      } catch (airtableInvErr) {
        console.warn("[Airtable Invoice Create Warning]", airtableInvErr);
      }
    } else {
      // Update Invoice status to Paid
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: "Paid",
          amountPaid: Number(amount),
        },
      });

      try {
        await airtableProxy.updateRecord("invoice", invoice.id, {
          "fldqJey7ciPEqd59k": "Paid",
        });
      } catch (airtableInvErr) {
        console.warn("[Airtable Invoice Update Warning]", airtableInvErr);
      }
    }

    // 4. Save Payment to Airtable Proxy (tbliFcGpMbqnMaD9S - 16 Payments)
    const airtableData: Record<string, any> = {
      "fldm73NgmVL0vFOuF": paymentRef,
      "fldBtNTeQVfZk1sWL": dateStr,
      "fldNRFTgAgktyLZ4V": Number(amount),
      "fldvC8KDDOXvuavro": method,
      "fld22tf9Mn0HGsmzN": [invoice.id],
      "fld1dSpRaL2A6EK6Q": "Tuition / Абонемент",
    };
    if (parentIds.length > 0) {
      airtableData["fldNVXBMA6RO2Xovb"] = parentIds;
    }
    if (branchIds.length > 0) {
      airtableData["fldTkBn9cMAnnA0YF"] = branchIds;
    }

    let createdAirtable;
    try {
      createdAirtable = await airtableProxy.createRecord("payment", airtableData);
    } catch (err: any) {
      console.error("[Payment Airtable Write Error]", err);
      return NextResponse.json({ error: `Airtable synchronization failed: ${err.message}` }, { status: 502 });
    }

    // 5. Save Payment to PostgreSQL via Prisma
    const newPayment = await prisma.payment.create({
      data: {
        id: createdAirtable.id || `recPay${Date.now()}`,
        paymentRef,
        date: paymentDateObj,
        amount: Number(amount),
        method,
        paymentType: "Tuition / Абонемент",
        invoiceIds: [invoice.id],
        parentIds,
        branchIds,
      },
    });

    // 6. Log Audit
    logAudit(
      {
        userId: dbUser.id,
        role: dbUser.role || "staff",
        action: "create",
        target: "Payment",
        status: "APPROVED",
        details: `Submitted monthly fee of ${amount} KGS for Student ID ${studentId} (${student.studentName}). Payment Ref: ${paymentRef}`,
      },
      request
    );

    return NextResponse.json({
      success: true,
      payment: newPayment,
      studentId,
    });
  } catch (error: any) {
    console.error("[Student Fee Submission Error]", error);
    return NextResponse.json({ error: error.message || "Internal server error." }, { status: 500 });
  }
}

// PATCH /api/students/fees — update an existing payment record
export async function PATCH(request: NextRequest) {
  try {
    const session = await validateSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    if ((dbUser.role || "").toLowerCase().trim() === "teacher") {
      return NextResponse.json({ error: "Teachers do not have permission to edit fee records." }, { status: 403 });
    }

    const body = await request.json();
    const { paymentId, studentId, amount, date, method = "Cash", month } = body;

    if (!paymentId) {
      return NextResponse.json({ error: "Payment ID is required for updates." }, { status: 400 });
    }
    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required." }, { status: 400 });
    }
    if (amount === undefined || amount === null || Number(amount) <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number." }, { status: 400 });
    }
    if (!["Cash", "Bank Transfer", "Card"].includes(method)) {
      return NextResponse.json({ error: "Method must be Cash, Bank Transfer, or Card." }, { status: 400 });
    }

    // Fetch existing payment
    const existingPayment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!existingPayment) {
      return NextResponse.json({ error: "Payment record not found." }, { status: 404 });
    }

    // Fetch student to rebuild payment ref
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return NextResponse.json({ error: "Student not found." }, { status: 404 });
    }

    const parentIds = student.parentIds?.length ? student.parentIds : existingPayment.parentIds;
    const branchIds = student.branchIds?.length ? student.branchIds : existingPayment.branchIds;

    let nameForRef = student.studentName;
    if (parentIds.length > 0) {
      const parentRecord = await prisma.parent.findUnique({ where: { id: parentIds[0] } });
      if (parentRecord?.parentName) nameForRef = parentRecord.parentName;
    }

    const paymentDateObj = date ? new Date(date) : new Date();
    const dateStr = paymentDateObj.toISOString().split("T")[0];
    const paymentRef = `${dateStr} - ${nameForRef}`;

    // Update in Prisma
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        paymentRef,
        date: paymentDateObj,
        amount: Number(amount),
        method,
        parentIds,
        branchIds,
      },
    });

    // Update in Airtable (best-effort)
    try {
      await airtableProxy.updateRecord("payment", paymentId, {
        "fldm73NgmVL0vFOuF": paymentRef,
        "fldBtNTeQVfZk1sWL": dateStr,
        "fldNRFTgAgktyLZ4V": Number(amount),
        "fldvC8KDDOXvuavro": method,
      });
    } catch (airtableErr) {
      console.warn("[Payment Airtable Update Warning]", airtableErr);
    }

    // Log audit
    logAudit(
      {
        userId: dbUser.id,
        role: dbUser.role || "staff",
        action: "update",
        target: "Payment",
        status: "APPROVED",
        details: `Updated monthly fee to ${amount} KGS for Student ID ${studentId} (${student.studentName}). Payment Ref: ${paymentRef}`,
      },
      request
    );

    return NextResponse.json({ success: true, payment: updatedPayment, studentId });
  } catch (error: any) {
    console.error("[Student Fee Update Error]", error);
    return NextResponse.json({ error: error.message || "Internal server error." }, { status: 500 });
  }
}
