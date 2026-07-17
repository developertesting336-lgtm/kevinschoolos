import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { normalizeRole } from "@/lib/roles";
import { auditService } from "@/lib/audit";

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

    // Gate access: only Owner, Office Admin, and SMM can access.
    if (userRole !== "owner" && userRole !== "office_admin" && userRole !== "smm") {
      auditService.logFailure(
        { id: dbUser.id, email: dbUser.email, role: dbUser.role },
        "PERMISSION_DENIED",
        "ChannelPerformance",
        `Unauthorized analytics read attempt by role: ${dbUser.role}`
      );
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userBranchIds = dbUser.branchIds || [];
    let branchScopedFilter: any = {};
    if (userRole !== "owner") {
      branchScopedFilter = { branchIds: { hasSome: userBranchIds } };
    }

    // Parse parameters
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "10", 10));
    const skip = (page - 1) * limit;

    const search = searchParams.get("search") || "";
    const channelFilter = searchParams.get("channel") || "";
    const monthFilter = searchParams.get("month") || "";
    const branchFilter = searchParams.get("branchId") || searchParams.get("branch");

    // Build Prisma filters
    const whereConditions: any[] = [];
    if (userRole !== "owner") {
      whereConditions.push(branchScopedFilter);
    }

    // Enforce branch filter parameter securely
    if (branchFilter) {
      if (userRole !== "owner") {
        if (!userBranchIds.includes(branchFilter)) {
          whereConditions.push({ branchIds: { has: "UNAUTHORIZED_BRANCH_ID" } });
        } else {
          whereConditions.push({ branchIds: { has: branchFilter } });
        }
      } else {
        whereConditions.push({ branchIds: { has: branchFilter } });
      }
    }

    // Channel Filter
    if (channelFilter) {
      whereConditions.push({ channel: { equals: channelFilter, mode: "insensitive" } });
    }

    // Month Filter
    if (monthFilter) {
      whereConditions.push({ month: { equals: monthFilter, mode: "insensitive" } });
    }

    // Search Filter
    if (search) {
      whereConditions.push({
        OR: [
          { channel: { contains: search, mode: "insensitive" } },
          { month: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    const where = whereConditions.length > 0 ? { AND: whereConditions } : {};

    // Fetch aggregate statistics (calculated server-side for high performance)
    const aggregateResult = await prisma.channelPerformance.aggregate({
      where,
      _sum: {
        leads: true,
        trialsBooked: true,
        trialsAttended: true,
        enrolled: true,
        lost: true,
      },
      _max: {
        updatedAt: true,
      },
    });

    const sum = aggregateResult._sum;
    const totalLeads = sum.leads || 0;
    const totalBooked = sum.trialsBooked || 0;
    const totalAttended = sum.trialsAttended || 0;
    const totalEnrolled = sum.enrolled || 0;
    const totalLost = sum.lost || 0;
    const overallCloseRate = totalAttended > 0 ? (totalEnrolled / totalAttended) * 100 : 0;

    // Fetch paginated records
    const [total, records] = await Promise.all([
      prisma.channelPerformance.count({ where }),
      prisma.channelPerformance.findMany({
        where,
        orderBy: [{ month: "desc" }, { leads: "desc" }],
        skip,
        take: limit,
      }),
    ]);

    // Calculate rates for each row record
    const data = records.map((r) => {
      const leadsCount = r.leads || 0;
      const bookedCount = r.trialsBooked || 0;
      const attendedCount = r.trialsAttended || 0;
      const enrolledCount = r.enrolled || 0;

      const trialBookingRate = leadsCount > 0 ? (bookedCount / leadsCount) * 100 : 0;
      const trialShowRate = bookedCount > 0 ? (attendedCount / bookedCount) * 100 : 0;
      const closeRate = attendedCount > 0 ? (enrolledCount / attendedCount) * 100 : 0;

      return {
        ...r,
        trialBookingRate,
        trialShowRate,
        closeRate,
      };
    });

    // Write audit event
    auditService.logSensitiveRead(
      { id: dbUser.id, email: dbUser.email, role: dbUser.role },
      "ChannelPerformance",
      records.map((r) => r.id),
      ["id", "channel", "month", "leads", "trialsBooked", "trialsAttended", "enrolled", "lost"]
    );

    return NextResponse.json({
      data,
      stats: {
        totalLeads,
        totalBooked,
        totalAttended,
        totalEnrolled,
        totalLost,
        overallCloseRate,
      },
      lastUpdated: aggregateResult._max.updatedAt?.toISOString() || new Date().toISOString(),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[Channel Performance API Error]", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
