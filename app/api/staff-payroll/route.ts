import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { normalizeRole } from "@/lib/roles";
import * as airtableProxy from "@/lib/airtableProxy";

export const dynamic = "force-dynamic";

// Allowed roles in the Users table for staff payroll
const STAFF_ROLES = ["teacher", "cleaner", "smm"];

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "") || "staff";
}

function parseLocalDate(dateStr?: string): Date {
  if (!dateStr) return new Date();
  // Standardize YYYY-MM-DD or ISO strings to UTC noon to prevent timezone date shifting
  const cleanDateStr = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
  const parts = cleanDateStr.split("-").map(Number);
  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    const yr = parts[0];
    const mo = parts[1];
    const da = parts[2] || 1;
    return new Date(Date.UTC(yr, mo - 1, da, 12, 0, 0));
  }
  return new Date(dateStr);
}

function formatDateISO(dateObj: Date): string {
  return dateObj.toISOString().split("T")[0];
}

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
    if (userRole !== "owner" && userRole !== "office_admin") {
      return NextResponse.json(
        { error: "Forbidden. Only Owner and Office/Admin can access Staff Payroll." },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "10", 10));
    const skip = (page - 1) * limit;
    const search = searchParams.get("search")?.trim() || "";
    const period = searchParams.get("period")?.trim() || ""; // e.g. "2026-05"
    const selectedRole = searchParams.get("role")?.toLowerCase().trim() || "all";

    // 1. Build User query filters
    const userWhereConditions: any[] = [];

    if (selectedRole !== "all") {
      userWhereConditions.push({
        role: { equals: selectedRole, mode: "insensitive" },
      });
    } else {
      userWhereConditions.push({
        OR: STAFF_ROLES.map((r) => ({
          role: { equals: r, mode: "insensitive" },
        })),
      });
    }

    if (search) {
      userWhereConditions.push({
        OR: [
          { fullName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    const userWhere = userWhereConditions.length > 0 ? { AND: userWhereConditions } : {};

    // 2. Fetch staff Users paginated
    const [totalUsers, staffUsers] = await Promise.all([
      prisma.user.count({ where: userWhere }),
      prisma.user.findMany({
        where: userWhere,
        select: {
          id: true,
          fullName: true,
          role: true,
          email: true,
          phone: true,
          branchIds: true,
        },
        orderBy: { fullName: "asc" },
        skip,
        take: limit,
      }),
    ]);

    const staffUserIds = staffUsers.map((u) => u.id);

    // Fetch Branch details for branch names
    const allBranchIds = Array.from(new Set(staffUsers.flatMap((u) => u.branchIds || [])));
    const branches = allBranchIds.length > 0
      ? await prisma.branch.findMany({
          where: { id: { in: allBranchIds } },
          select: { id: true, name: true },
        })
      : [];
    const branchMap = new Map(branches.map((b) => [b.id, b.name]));

    // 3. Fetch TeacherPay records for these staff users
    let payRunWhere: any = {
      teacherIds: { hasSome: staffUserIds },
    };

    let periodStart: Date | null = null;
    let periodEnd: Date | null = null;

    if (period) {
      const [yrStr, moStr] = period.split("-");
      const yr = parseInt(yrStr, 10);
      const mo = parseInt(moStr, 10);
      if (!isNaN(yr) && !isNaN(mo)) {
        periodStart = new Date(Date.UTC(yr, mo - 1, 1, 0, 0, 0, 0));
        periodEnd = new Date(Date.UTC(yr, mo, 0, 23, 59, 59, 999));
        payRunWhere.OR = [
          { datePaid: { gte: periodStart, lte: periodEnd } },
          { period: { gte: periodStart, lte: periodEnd } },
        ];
      }
    }

    const payRuns = staffUserIds.length > 0
      ? await prisma.teacherPay.findMany({
          where: payRunWhere,
          orderBy: { datePaid: "desc" },
        })
      : [];

    // Map pay runs by teacher ID
    const payRunByTeacherMap = new Map<string, any>();
    for (const pr of payRuns) {
      for (const tId of pr.teacherIds) {
        if (!payRunByTeacherMap.has(tId)) {
          payRunByTeacherMap.set(tId, pr);
        }
      }
    }

    // 4. Fetch TeacherHours for these staff users if period specified
    let teacherHoursWhere: any = {
      teacherIds: { hasSome: staffUserIds },
    };
    if (periodStart && periodEnd) {
      teacherHoursWhere.date = { gte: periodStart, lte: periodEnd };
    }
    const teacherHours = staffUserIds.length > 0
      ? await prisma.teacherHours.findMany({
          where: teacherHoursWhere,
          select: { teacherIds: true, hours: true },
        })
      : [];

    const hoursByTeacherMap = new Map<string, number>();
    for (const th of teacherHours) {
      for (const tId of th.teacherIds) {
        const cur = hoursByTeacherMap.get(tId) || 0;
        hoursByTeacherMap.set(tId, cur + (th.hours || 0));
      }
    }

    // 5. Construct response data
    const data = staffUsers.map((u) => {
      const payRecord = payRunByTeacherMap.get(u.id);
      const primaryBranchId = u.branchIds && u.branchIds[0];
      const branchName = primaryBranchId ? branchMap.get(primaryBranchId) || primaryBranchId : "HQ";
      const loggedHours = hoursByTeacherMap.get(u.id) || 0;

      let status: "Paid" | "Approved" | "Draft" = "Draft";
      if (payRecord) {
        if (payRecord.status === "Paid" || payRecord.status === "Approved") {
          status = payRecord.status as any;
        } else {
          status = "Paid";
        }
      }

      return {
        id: u.id,
        fullName: u.fullName,
        role: u.role || "Staff",
        email: u.email,
        phone: u.phone,
        branchIds: u.branchIds || [],
        branchName,
        loggedHours,
        status,
        paymentRecord: payRecord
          ? {
              id: payRecord.id,
              payRunNo: payRecord.payRunNo,
              period: payRecord.period ? formatDateISO(payRecord.period) : null,
              payType: payRecord.payType,
              hours: payRecord.hours,
              rate: payRecord.rate,
              grossPay: payRecord.grossPay,
              paymentMethod: payRecord.paymentMethod,
              status: status,
              datePaid: payRecord.datePaid ? formatDateISO(payRecord.datePaid) : null,
              notes: payRecord.notes,
            }
          : null,
      };
    });

    return NextResponse.json({
      data,
      pagination: {
        total: totalUsers,
        page,
        limit,
        totalPages: Math.ceil(totalUsers / limit) || 1,
      },
    });
  } catch (error: any) {
    console.error("[GET /api/staff-payroll Error]", error);
    return NextResponse.json(
      { error: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await validateSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const userRole = normalizeRole(dbUser.role || "staff");
    if (userRole !== "owner" && userRole !== "office_admin") {
      return NextResponse.json(
        { error: "Forbidden. Only Owner and Office/Admin can submit Staff Payroll." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      userId,
      datePaid,
      period,
      payType = "Monthly Salary",
      hours = 0,
      rate = 0,
      grossPay = 0,
      paymentMethod = "Bank Transfer",
      notes = "",
      branchId,
    } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required." }, { status: 400 });
    }

    // Fetch target staff user details
    const staffUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, role: true, branchIds: true },
    });

    if (!staffUser) {
      return NextResponse.json({ error: "Target staff user not found." }, { status: 404 });
    }

    // 1. Accurate local date parsing & pattern generation for Pay Run No: PAY-YYYY-MM-<teacher>
    const paidDateObj = parseLocalDate(datePaid);
    const yearStr = paidDateObj.getUTCFullYear();
    const monthStr = String(paidDateObj.getUTCMonth() + 1).padStart(2, "0");
    const teacherSlug = slugifyName(staffUser.fullName);

    const payRunNo = `PAY-${yearStr}-${monthStr}-${teacherSlug}`;
    const parsedPeriod = period ? parseLocalDate(period) : paidDateObj;
    const datePaidISO = formatDateISO(paidDateObj);
    const periodISO = formatDateISO(parsedPeriod);

    const targetBranchId = branchId || (staffUser.branchIds && staffUser.branchIds[0]) || "main";

    // 2. Write TeacherPay record to Airtable first
    const teacherPayAirtableData: Record<string, any> = {
      "fldB5lN65eMtTeL4n": payRunNo,
      "fldwHAgLQsZtRZ9P8": periodISO,
      "fldJOfszdvJczMqrp": payType || "Monthly Salary",
      "fldv7gRIK4beCmHwJ": Number(hours) || 0,
      "fldhLllLgDhMO2Bfk": Number(rate) || 0,
      "fldQMUw8FXYdNWmCP": Number(grossPay) || 0,
      "fldmudyERr4jqoZTw": paymentMethod || "Bank Transfer",
      "fldBoXhWuU6cCKSZY": "Paid",
      "fldVmd0aCzGeMDKG5": datePaidISO,
      "fldTfIdi9QNbbK2pP": [userId],
      "fldYvb8tUOa7nRZEt": [targetBranchId],
    };

    if (notes) {
      teacherPayAirtableData["fldMrOoD74xoLjfmt"] = notes;
    }

    let createdAirtableTP: any = null;
    let payRunId: string;

    try {
      createdAirtableTP = await airtableProxy.createRecord("teacherpay", teacherPayAirtableData);
      payRunId = createdAirtableTP.id;
    } catch (airtableErr: any) {
      console.warn("[TeacherPay Airtable Write Warning]", airtableErr);
      payRunId = `tp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }

    // 3. Write TeacherPay record to Prisma Postgres DB
    const newTeacherPay = await prisma.teacherPay.create({
      data: {
        id: payRunId,
        payRunNo,
        period: parsedPeriod,
        payType: payType || "Monthly Salary",
        hours: Number(hours) || 0,
        rate: Number(rate) || 0,
        grossPay: Number(grossPay) || 0,
        paymentMethod: paymentMethod || "Bank Transfer",
        status: "Paid",
        datePaid: paidDateObj,
        notes: notes || null,
        teacherIds: [userId],
        branchIds: [targetBranchId],
      },
    });

    // 4. Update matching TeacherHours if any exist for this teacher and period
    try {
      const matchingHours = await prisma.teacherHours.findMany({
        where: { teacherIds: { has: userId } },
      });
      for (const th of matchingHours) {
        if (!th.payRunIds.includes(payRunId)) {
          await prisma.teacherHours.update({
            where: { id: th.id },
            data: { payRunIds: { push: payRunId } },
          });
        }
      }
    } catch (thErr) {
      console.warn("[TeacherHours update warning]", thErr);
    }

    // 5. Automatically create Journal Entry in both Airtable & Prisma
    const entryNo = `JE-${payRunNo}`;
    const memoText = `Staff Payroll Payment for ${staffUser.fullName} (${staffUser.role || "Staff"}) - ${payRunNo}`;

    const jeAirtableData: Record<string, any> = {
      "fldu9Nus6mibMGB6y": entryNo,
      "fldqPoazkusrbYqQf": datePaidISO,
      "fldMHUDO2IdD35980": memoText,
      "fldnV5JMpmeqxtXSF": "Teacher Pay",
      "fldBGfyt6xbhx17IX": true, // Posted = true
      "fldgcbUNdIvRUGhad": [targetBranchId],
      "fldbYkzLl4EgOzgo5": [payRunId],
    };

    let createdAirtableJE: any = null;
    let jeId: string;

    try {
      createdAirtableJE = await airtableProxy.createRecord("journalentry", jeAirtableData);
      jeId = createdAirtableJE.id;
    } catch (jeAirtableErr: any) {
      console.warn("[JournalEntry Airtable Write Warning]", jeAirtableErr);
      jeId = `je_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }

    let newJournalEntry = null;
    try {
      newJournalEntry = await prisma.journalEntry.create({
        data: {
          id: jeId,
          entryNo,
          date: paidDateObj,
          memo: memoText,
          source: "Staff Payroll",
          posted: true,
          branchIds: [targetBranchId],
        },
      });
    } catch (prismaJeErr) {
      console.error("[JournalEntry Prisma Error]", prismaJeErr);
    }

    return NextResponse.json({
      success: true,
      data: newTeacherPay,
      journalEntry: newJournalEntry,
      message: `Payment ${payRunNo} processed successfully as Paid in both Airtable and Prisma.`,
    });
  } catch (error: any) {
    console.error("[POST /api/staff-payroll Error]", error);
    return NextResponse.json(
      { error: error.message || "Failed to process staff payment." },
      { status: 500 }
    );
  }
}
