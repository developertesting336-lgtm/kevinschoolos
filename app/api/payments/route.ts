import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { normalizeRole } from "@/lib/rbac";
import * as airtableProxy from "@/lib/airtableProxy";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// GET /api/payments
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

    // Allowed roles: Owner, Office Admin, Finance
    if (!["owner", "office_admin", "finance"].includes(normRole)) {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions." }, { status: 403 });
    }

    const { searchParams } = request.nextUrl;
    const action = searchParams.get("action");

    // 1. Action: getBalance
    if (action === "getBalance") {
      const invoiceId = searchParams.get("invoiceId");
      if (!invoiceId) {
        return NextResponse.json({ error: "invoiceId is required." }, { status: 400 });
      }
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId }
      });
      if (!invoice) {
        return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
      }
      const payments = await prisma.payment.findMany({
        where: { invoiceIds: { has: invoiceId } }
      });
      const paid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const balance = Math.max(0, (invoice.amount || 0) - paid);
      return NextResponse.json({ outstandingBalance: balance });
    }

    // 2. Action: searchInvoices
    if (action === "searchInvoices") {
      const q = searchParams.get("q") || "";

      // Build the invoice query — also search by student/parent name
      let invoices: any[] = [];
      if (q) {
        // Find students and parents matching the query first
        const [matchingStudents, matchingParents] = await Promise.all([
          prisma.student.findMany({
            where: { studentName: { contains: q, mode: "insensitive" } },
            select: { id: true }
          }),
          prisma.parent.findMany({
            where: { parentName: { contains: q, mode: "insensitive" } },
            select: { id: true }
          })
        ]);
        const studentIds = matchingStudents.map((s: any) => s.id);
        const parentIds = matchingParents.map((p: any) => p.id);

        // Build OR conditions: by invoiceNo, by studentId, by parentId
        const orConditions: any[] = [
          { invoiceNo: { contains: q, mode: "insensitive" } }
        ];
        studentIds.forEach((id: string) => orConditions.push({ studentIds: { has: id } }));
        parentIds.forEach((id: string) => orConditions.push({ parentIds: { has: id } }));

        invoices = await prisma.invoice.findMany({
          where: { OR: orConditions },
          take: 50
        });
      } else {
        invoices = await prisma.invoice.findMany({ take: 50 });
      }

      const resolved = await Promise.all(invoices.map(async (inv) => {
        const student = inv.studentIds[0] ? await prisma.student.findUnique({ where: { id: inv.studentIds[0] } }) : null;
        const parent = inv.parentIds[0] ? await prisma.parent.findUnique({ where: { id: inv.parentIds[0] } }) : null;
        const branch = inv.branchIds[0] ? await prisma.branch.findUnique({ where: { id: inv.branchIds[0] } }) : null;

        const payments = await prisma.payment.findMany({
          where: { invoiceIds: { has: inv.id } }
        });
        const paid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const balance = Math.max(0, (inv.amount || 0) - paid);

        return {
          id: inv.id,
          invoiceNo: inv.invoiceNo,
          amount: inv.amount,
          status: inv.status,
          dueDate: inv.dueDate,
          studentName: student?.studentName || "Unknown Student",
          parentName: parent?.parentName || "Unknown Parent",
          parentIds: inv.parentIds,
          branchName: branch?.name || "Unknown Branch",
          branchIds: inv.branchIds,
          outstandingBalance: balance
        };
      }));

      let result = resolved;
      if (q) {
        const lowerQ = q.toLowerCase();
        result = resolved.filter(inv =>
          inv.invoiceNo.toLowerCase().includes(lowerQ) ||
          inv.studentName.toLowerCase().includes(lowerQ) ||
          inv.parentName.toLowerCase().includes(lowerQ)
        );
      }
      return NextResponse.json(result);
    }
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "20", 10));
    const search = searchParams.get("search") || "";
    const branch = searchParams.get("branch") || "";
    const paymentType = searchParams.get("paymentType") || "";
    const paymentMethod = searchParams.get("paymentMethod") || "";
    const date = searchParams.get("date") || "";

    const whereConditions: any[] = [];

    // Search filter
    if (search) {
      whereConditions.push({
        paymentRef: { contains: search, mode: "insensitive" }
      });
    }

    // Branch filter
    if (branch) {
      whereConditions.push({
        branchIds: { has: branch }
      });
    }

    // Type filter
    if (paymentType) {
      whereConditions.push({
        paymentType: { equals: paymentType, mode: "insensitive" }
      });
    }

    // Method filter
    if (paymentMethod) {
      whereConditions.push({
        method: { equals: paymentMethod, mode: "insensitive" }
      });
    }

    // Date filter (exact day match)
    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      whereConditions.push({
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      });
    }

    const where = whereConditions.length > 0 ? { AND: whereConditions } : {};

    const [total, records] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        orderBy: { date: "desc" },
        skip: (page - 1) * limit,
        take: limit
      })
    ]);

    return NextResponse.json({
      data: records,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error("[Payments GET Error]", error);
    return NextResponse.json({ error: error.message || "Internal server error." }, { status: 500 });
  }
}

// POST /api/payments
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

    // Allowed roles: Owner, Office Admin, Finance
    if (!["owner", "office_admin", "finance"].includes(normRole)) {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions." }, { status: 403 });
    }

    const body = await request.json();
    const {
      paymentRef,
      date,
      amount,
      method,
      paymentType,
      invoiceIds,
      parentIds,
      branchIds,
      force = false
    } = body;

    // 1. Validations
    if (!paymentRef || !paymentRef.trim()) {
      return NextResponse.json({ error: "Payment Reference is required." }, { status: 400 });
    }
    if (!date) {
      return NextResponse.json({ error: "Date is required." }, { status: 400 });
    }
    if (amount === undefined || amount === null || Number(amount) <= 0) {
      return NextResponse.json({ error: "Amount must be greater than zero." }, { status: 400 });
    }
    if (!method || !["Cash", "Bank Transfer", "Card"].includes(method)) {
      return NextResponse.json({ error: "Method must be Cash, Bank Transfer, or Card." }, { status: 400 });
    }
    const validTypes = [
      "Tuition / Абонемент",
      "Play room / Игровая",
      "Masterclass / Мастер-класс",
      "Merchandise / Товары",
      "Other / Прочее"
    ];
    if (!paymentType || !validTypes.includes(paymentType)) {
      return NextResponse.json({ error: "Invalid Payment Type." }, { status: 400 });
    }
    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return NextResponse.json({ error: "At least one Invoice ID is required." }, { status: 400 });
    }
    if (!parentIds || !Array.isArray(parentIds) || parentIds.length === 0) {
      return NextResponse.json({ error: "At least one Parent ID is required." }, { status: 400 });
    }
    if (!branchIds || !Array.isArray(branchIds) || branchIds.length === 0) {
      return NextResponse.json({ error: "At least one Branch ID is required." }, { status: 400 });
    }

    // Verify Invoice exists
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceIds[0] } });
    if (!invoice) {
      return NextResponse.json({ error: "Associated Invoice does not exist." }, { status: 400 });
    }

    // Verify Parent exists
    const parent = await prisma.parent.findUnique({ where: { id: parentIds[0] } });
    if (!parent) {
      return NextResponse.json({ error: "Associated Parent does not exist." }, { status: 400 });
    }

    // Verify Branch exists
    const branchRecord = await prisma.branch.findUnique({ where: { id: branchIds[0] } });
    if (!branchRecord) {
      return NextResponse.json({ error: "Associated Branch does not exist." }, { status: 400 });
    }

    // 2. Duplicate Check
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const duplicate = await prisma.payment.findFirst({
      where: {
        paymentRef: { equals: paymentRef, mode: "insensitive" },
        amount: Number(amount),
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    if (duplicate && !force) {
      return NextResponse.json(
        { possibleDuplicate: true, message: "A payment already exists with the same Reference, Date, and Amount." },
        { status: 409 }
      );
    }

    const isDuplicateConfirmed = !!duplicate && force;

    // 3. Write to Airtable Proxy
    // Field IDs sourced from field-map.json for table tbliFcGpMbqnMaD9S (16 Payments)
    const airtableData: Record<string, any> = {
      "fldm73NgmVL0vFOuF": paymentRef,           // Payment Ref / Назначение платежа
      "fldBtNTeQVfZk1sWL": new Date(date).toISOString().split("T")[0], // Date / Дата
      "fldNRFTgAgktyLZ4V": Number(amount),       // Amount (KGS) / Сумма (сом)
      "fldvC8KDDOXvuavro": method,               // Method / Способ оплаты
      "fld22tf9Mn0HGsmzN": invoiceIds,           // Invoice
      "fldNVXBMA6RO2Xovb": parentIds,            // Parent
      "fldTkBn9cMAnnA0YF": branchIds,            // Branch
      "fld1dSpRaL2A6EK6Q": paymentType,          // Payment Type / Тип платежа
    };
    if (isDuplicateConfirmed) {
      airtableData["fldXYyFJX04FtXzE2"] = true; // Possible Duplicate / Возможный дубль
    }

    let createdAirtable;
    try {
      createdAirtable = await airtableProxy.createRecord("payment", airtableData);
    } catch (err: any) {
      console.error("[Payment Airtable Write Error]", err);
      return NextResponse.json({ error: `Airtable synchronization failed: ${err.message}` }, { status: 502 });
    }

    // 4. Save to Postgres
    const newPayment = await prisma.payment.create({
      data: {
        id: createdAirtable.id,
        paymentRef,
        date: new Date(date),
        amount: Number(amount),
        method,
        paymentType,
        invoiceIds,
        parentIds,
        branchIds,
        possibleDuplicate: isDuplicateConfirmed
      }
    });

    // 5. Log Audit
    logAudit({
      userId: dbUser.id,
      role: dbUser.role || "staff",
      action: "create",
      target: "Payment",
      status: "APPROVED",
      details: `Recorded payment of ${amount} KGS against Invoice ID ${invoiceIds[0]}. Ref: ${paymentRef}. Duplicate: ${isDuplicateConfirmed}.`
    }, request);

    return NextResponse.json(newPayment);
  } catch (error: any) {
    console.error("[Create Payment Error]", error);
    return NextResponse.json({ error: error.message || "Internal server error." }, { status: 500 });
  }
}
