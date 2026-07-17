import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { normalizeRole } from "@/lib/roles";
import { auditService } from "@/lib/audit";
import { checkRBAC } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await validateSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, fullName: true, email: true, role: true, branchIds: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const userRole = normalizeRole(dbUser.role || "staff");

    // Enforce authorization: only Owner and Office Admin roles have access.
    if (userRole !== "owner" && userRole !== "office_admin") {
      auditService.logFailure(
        { id: dbUser.id, email: dbUser.email, role: dbUser.role },
        "PERMISSION_DENIED",
        "NotificationLog",
        `Unauthorized access attempt by role: ${dbUser.role}`
      );
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userBranchIds = dbUser.branchIds || [];
    let branchScopedFilter: any = {};
    if (userRole === "office_admin") {
      branchScopedFilter = { branchIds: { hasSome: userBranchIds } };
    }

    // Parse parameters
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "10", 10));
    const skip = (page - 1) * limit;

    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const channel = searchParams.get("channel") || "";
    const branchFilter = searchParams.get("branchId") || searchParams.get("branch");
    const recipientTypeFilter = searchParams.get("recipientType") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    // Build Prisma filters
    const whereConditions: any[] = [];
    if (userRole === "office_admin") {
      whereConditions.push(branchScopedFilter);
    }

    // Enforce branch filter (ensure Office Admin is scoped)
    if (branchFilter) {
      if (userRole === "office_admin") {
        if (!userBranchIds.includes(branchFilter)) {
          // Attempting to query an unallowed branch -> restrict
          whereConditions.push({ branchIds: { has: "UNAUTHORIZED_BRANCH_ID" } });
        } else {
          whereConditions.push({ branchIds: { has: branchFilter } });
        }
      } else {
        whereConditions.push({ branchIds: { has: branchFilter } });
      }
    }

    // Status Filter
    if (status) {
      whereConditions.push({ status: { equals: status, mode: "insensitive" } });
    }

    // Channel Filter
    if (channel) {
      whereConditions.push({ channel: { equals: channel, mode: "insensitive" } });
    }

    // Recipient Type Filter
    if (recipientTypeFilter) {
      if (recipientTypeFilter.toLowerCase() === "parent") {
        whereConditions.push({ NOT: { parentIds: { equals: [] } } });
      } else if (recipientTypeFilter.toLowerCase() === "lead") {
        whereConditions.push({ NOT: { leadIds: { equals: [] } } });
      }
    }

    // Date Range Filter
    if (startDate || endDate) {
      const dateCond: any = {};
      if (startDate) {
        dateCond.gte = new Date(startDate);
      }
      if (endDate) {
        dateCond.lte = new Date(endDate);
      }
      whereConditions.push({
        OR: [
          { scheduledFor: dateCond },
          { sentAt: dateCond },
        ],
      });
    }

    // Search Filter
    if (search) {
      const orConditions: any[] = [];
      orConditions.push({ notificationId: { contains: search, mode: "insensitive" } });
      orConditions.push({ message: { contains: search, mode: "insensitive" } });

      // Match Parents
      const matchingParents = await prisma.parent.findMany({
        where: { parentName: { contains: search, mode: "insensitive" } },
        select: { id: true },
      });
      if (matchingParents.length > 0) {
        orConditions.push({ parentIds: { hasSome: matchingParents.map((p) => p.id) } });
      }

      // Match Students -> Parents
      const matchingStudents = await prisma.student.findMany({
        where: { studentName: { contains: search, mode: "insensitive" } },
        select: { parentIds: true },
      });
      const parentIdsFromStudents = Array.from(new Set(matchingStudents.flatMap((s) => s.parentIds)));
      if (parentIdsFromStudents.length > 0) {
        orConditions.push({ parentIds: { hasSome: parentIdsFromStudents } });
      }

      // Match Leads
      const matchingLeads = await prisma.lead.findMany({
        where: { leadName: { contains: search, mode: "insensitive" } },
        select: { id: true },
      });
      if (matchingLeads.length > 0) {
        orConditions.push({ leadIds: { hasSome: matchingLeads.map((l) => l.id) } });
      }

      // Match Invoices
      const matchingInvoices = await prisma.invoice.findMany({
        where: { invoiceNo: { contains: search, mode: "insensitive" } },
        select: { id: true },
      });
      if (matchingInvoices.length > 0) {
        orConditions.push({ invoiceIds: { hasSome: matchingInvoices.map((i) => i.id) } });
      }

      whereConditions.push({ OR: orConditions });
    }

    const where = whereConditions.length > 0 ? { AND: whereConditions } : {};

    // Fetch metrics (server-side counts calculated based on scoping/filters)
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setUTCHours(23, 59, 59, 999);

    const [scheduledCount, sentCount, failedCount, todayCount] = await Promise.all([
      prisma.notificationLog.count({
        where: { ...where, status: { equals: "Scheduled", mode: "insensitive" } },
      }),
      prisma.notificationLog.count({
        where: { ...where, status: { equals: "Sent", mode: "insensitive" } },
      }),
      prisma.notificationLog.count({
        where: { ...where, status: { equals: "Failed", mode: "insensitive" } },
      }),
      prisma.notificationLog.count({
        where: {
          ...where,
          OR: [
            { scheduledFor: { gte: startOfToday, lte: endOfToday } },
            { sentAt: { gte: startOfToday, lte: endOfToday } },
          ],
        },
      }),
    ]);

    // Fetch main history data
    const [total, notifications] = await Promise.all([
      prisma.notificationLog.count({ where }),
      prisma.notificationLog.findMany({
        where,
        orderBy: { scheduledFor: "desc" },
        skip,
        take: limit,
      }),
    ]);

    // Extract all relation IDs to batch fetch details
    const parentIds = Array.from(new Set(notifications.flatMap((n) => n.parentIds)));
    const leadIds = Array.from(new Set(notifications.flatMap((n) => n.leadIds)));
    const trialIds = Array.from(new Set(notifications.flatMap((n) => n.trialIds)));
    const enrollmentIds = Array.from(new Set(notifications.flatMap((n) => n.enrollmentIds)));
    const invoiceIds = Array.from(new Set(notifications.flatMap((n) => n.invoiceIds)));
    const branchIds = Array.from(new Set(notifications.flatMap((n) => n.branchIds)));

    const [parents, leads, trials, enrollments, invoices, branches] = await Promise.all([
      parentIds.length > 0 ? prisma.parent.findMany({ where: { id: { in: parentIds } } }) : [],
      leadIds.length > 0 ? prisma.lead.findMany({ where: { id: { in: leadIds } } }) : [],
      trialIds.length > 0 ? prisma.trial.findMany({ where: { id: { in: trialIds } } }) : [],
      enrollmentIds.length > 0 ? prisma.enrollment.findMany({ where: { id: { in: enrollmentIds } } }) : [],
      invoiceIds.length > 0 ? prisma.invoice.findMany({ where: { id: { in: invoiceIds } } }) : [],
      branchIds.length > 0 ? prisma.branch.findMany({ where: { id: { in: branchIds } } }) : [],
    ]);

    const parentMap = new Map(parents.map((p) => [p.id, p]));
    const leadMap = new Map(leads.map((l) => [l.id, l]));
    const trialMap = new Map(trials.map((t) => [t.id, t]));
    const enrollmentMap = new Map(enrollments.map((e) => [e.id, e]));
    const invoiceMap = new Map(invoices.map((i) => [i.id, i]));
    const branchMap = new Map(branches.map((b) => [b.id, b]));

    // Resolve details drawer linked records & redact under RBAC constraints
    const getAuthorizedRef = (record: any, modelName: string, labelField: string) => {
      if (!record) return null;

      // 1. Check table authorization
      const tableCheck = checkRBAC(dbUser.role || "staff", modelName, "read");
      if (!tableCheck.allowed) {
        return { id: record.id, label: "Restricted", type: modelName, restricted: true };
      }

      // 2. Check row branch visibility (Office Admin is scoped)
      if (userRole !== "owner") {
        const recordBranchIds = record.branchIds || [];
        const hasAccess = recordBranchIds.some((bid: string) => userBranchIds.includes(bid));
        if (!hasAccess) {
          return { id: record.id, label: "Restricted", type: modelName, restricted: true };
        }
      }

      return {
        id: record.id,
        label: record[labelField] || record.id,
        type: modelName,
        restricted: false,
      };
    };

    const data = notifications.map((n) => {
      // Determine recipient type
      let recipientType = "—";
      let recipientName = "—";
      let recipientRestricted = false;

      if (n.parentIds.length > 0) {
        recipientType = "Parent";
        const parent = parentMap.get(n.parentIds[0]);
        const ref = getAuthorizedRef(parent, "Parent", "parentName");
        recipientName = ref ? ref.label : "—";
        recipientRestricted = ref ? ref.restricted : false;
      } else if (n.leadIds.length > 0) {
        recipientType = "Lead";
        const lead = leadMap.get(n.leadIds[0]);
        const ref = getAuthorizedRef(lead, "Lead", "leadName");
        recipientName = ref ? ref.label : "—";
        recipientRestricted = ref ? ref.restricted : false;
      }

      // Resolve linked related records
      const links: any[] = [];
      n.parentIds.forEach((pid) => {
        const ref = getAuthorizedRef(parentMap.get(pid), "Parent", "parentName");
        if (ref) links.push(ref);
      });
      n.leadIds.forEach((lid) => {
        const ref = getAuthorizedRef(leadMap.get(lid), "Lead", "leadName");
        if (ref) links.push(ref);
      });
      n.trialIds.forEach((tid) => {
        const ref = getAuthorizedRef(trialMap.get(tid), "Trial", "trialId");
        if (ref) links.push(ref);
      });
      n.enrollmentIds.forEach((eid) => {
        const ref = getAuthorizedRef(enrollmentMap.get(eid), "Enrollment", "enrollmentId");
        if (ref) links.push(ref);
      });
      n.invoiceIds.forEach((iid) => {
        const ref = getAuthorizedRef(invoiceMap.get(iid), "Invoice", "invoiceNo");
        if (ref) links.push(ref);
      });

      // Branch names
      const resolvedBranches = n.branchIds.map((bid) => branchMap.get(bid)?.name).filter(Boolean);

      return {
        ...n,
        recipientType,
        recipientName,
        recipientRestricted,
        branchName: resolvedBranches.join(", ") || "General",
        createdBy: "System Automation",
        links,
      };
    });

    // Write audit event (never log actual message bodies or PII)
    auditService.logSensitiveRead(
      { id: dbUser.id, email: dbUser.email, role: dbUser.role },
      "NotificationLog",
      notifications.map((n) => n.id),
      ["id", "notificationId", "status", "type", "channel", "scheduledFor", "sentAt", "branchIds"]
    );

    return NextResponse.json({
      data,
      stats: {
        scheduled: scheduledCount,
        sent: sentCount,
        failed: failedCount,
        today: todayCount,
      },
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[Notifications API Error]", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
