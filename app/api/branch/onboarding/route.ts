import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkRBAC, getScopingFilter, applyRedactions, normalizeRole } from "@/lib/rbac";
import { auditService, getVisibleFieldIds } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * GET /api/branch/onboarding
 * Returns the onboarding-in-progress card data.
 * Access: office_admin (own branch), owner (all branches)
 * Phase 1/2: read-only.
 */
export async function GET(request: NextRequest) {
  // 1. Authenticate
  const session = await validateSession();
  if (!session) {
    auditService.logFailure(undefined, "PERMISSION_DENIED", "BranchOnboarding", "No active session.", request);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Fetch user
  const dbUser = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!dbUser) {
    auditService.logFailure(undefined, "PERMISSION_DENIED", "User", `User ${session.userId} not found.`, request);
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }

  const userRole = dbUser.role || "staff";
  const userBranchIds = dbUser.branchIds || [];
  const normRole = normalizeRole(userRole);

  // 3. RBAC: only office_admin or owner
  if (!["office_admin", "owner"].includes(normRole)) {
    auditService.logFailure(
      { id: dbUser.id, email: dbUser.email, role: userRole },
      "PERMISSION_DENIED",
      "BranchOnboarding",
      `Role '${userRole}' not permitted.`,
      request
    );
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const enrollmentScope = await getScopingFilter(
      { id: dbUser.id, role: userRole, branchIds: userBranchIds },
      "Enrollment"
    );

    // Fetch enrollments where onboarding is not complete
    const enrollments = await prisma.enrollment.findMany({
      where: {
        ...enrollmentScope,
        OR: [
          { onboardingStatus: { not: "Complete", mode: "insensitive" } },
          { onboardingStatus: null },
          { onboardingStatus: "" },
        ],
      },
      orderBy: { updatedAt: "desc" },
    });

    // Resolve student names
    const studentIds = Array.from(new Set(enrollments.flatMap(e => e.studentIds || [])));
    let studentMap: Record<string, any> = {};
    if (studentIds.length > 0) {
      const students = await prisma.student.findMany({
        where: { id: { in: studentIds } },
        select: { id: true, studentName: true },
      });
      for (const s of students) studentMap[s.id] = s;
    }

    // Resolve class group names
    const cgIds = Array.from(new Set(enrollments.flatMap(e => e.classGroupIds || [])));
    let cgMap: Record<string, any> = {};
    if (cgIds.length > 0) {
      const cgs = await prisma.classGroup.findMany({
        where: { id: { in: cgIds } },
        select: { id: true, groupName: true },
      });
      for (const cg of cgs) cgMap[cg.id] = cg;
    }

    const onboardingData = enrollments.map(e => ({
      id: e.id,
      enrollmentId: e.enrollmentId,
      onboardingStatus: e.onboardingStatus || "Pending",
      studentNames: (e.studentIds || []).map(sid => studentMap[sid]?.studentName || null).filter(Boolean),
      classGroupNames: (e.classGroupIds || []).map(cgId => cgMap[cgId]?.groupName || null).filter(Boolean),
      // Delivery gates
      scheduleDelivered: e.scheduleDelivered,
      calendarDelivered: e.calendarDelivered,
      appInstructionsDelivered: e.appInstructionsDelivered,
      audioRecommendationsDelivered: e.audioRecommendationsDelivered,
      // Contract
      contractSigned: e.contractSigned,
      contractDate: e.contractDate,
      // System
      hdSystemRegistered: e.hdSystemRegistered,
      appCredentialsIssued: e.appCredentialsIssued, // Flag only - never expose actual credentials
      // First lesson
      firstLessonConfirmed: e.firstLessonConfirmed,
      firstLessonDate: e.firstLessonDate,
      // Trial fee
      trialFeeDeducted: e.trialFeeDeducted,
      // Dates
      enrollDate: e.enrollDate,
      updatedAt: e.updatedAt,
    }));

    auditService.logSensitiveRead(
      { id: dbUser.id, email: dbUser.email, role: userRole },
      "Enrollment",
      enrollments.map(e => e.id),
      getVisibleFieldIds(userRole, "Enrollment", false),
      request
    );

    return NextResponse.json({
      total: onboardingData.length,
      enrollments: onboardingData,
    });
  } catch (error: any) {
    console.error("[Branch Onboarding Error]", error);
    auditService.logFailure(
      { id: dbUser.id, email: dbUser.email, role: userRole },
      "VIEW",
      "BranchOnboarding",
      `Internal error: ${error.message || String(error)}`,
      request
    );
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// Block writes
export async function POST() {
  return NextResponse.json(
    { error: "Phase 1/2 is read-only. Writes are blocked." },
    { status: 403 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { error: "Phase 1/2 is read-only. Writes are blocked." },
    { status: 403 }
  );
}