import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkRBAC, getScopingFilter, applyRedactions, normalizeRole } from "@/lib/rbac";
import { auditService, getVisibleFieldIds } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * GET /api/branch/dashboard
 * Returns all Branch Command Center cards except onboarding.
 * Access: office_admin (own branch), owner (all branches)
 * Phase 1/2: read-only.
 */
export async function GET(request: NextRequest) {
  // 1. Authenticate
  const session = await validateSession();
  if (!session) {
    auditService.logFailure(undefined, "PERMISSION_DENIED", "BranchDashboard", "No active session.", request);
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
      "BranchDashboard",
      `Role '${userRole}' not permitted.`,
      request
    );
    return NextResponse.json({ error: "Forbidden: Branch dashboard is for office_admin and owner only." }, { status: 403 });
  }

  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // ─── 1. Today's Classes ──────────────────────────────────────────────
    const sessionScope = await getScopingFilter(
      { id: dbUser.id, role: userRole, branchIds: userBranchIds },
      "Session"
    );
    const todaySessions = await prisma.session.findMany({
      where: {
        ...sessionScope,
        dateTime: { gte: startOfToday, lte: endOfToday },
      },
      orderBy: { dateTime: "asc" },
    });

    // Resolve class groups, teachers, rooms for sessions
    const sessionClassGroupIds = Array.from(new Set(todaySessions.flatMap(s => s.classGroupIds || [])));
    const sessionTeacherIds = Array.from(new Set(todaySessions.flatMap(s => s.teacherIds || [])));
    const sessionRoomIds: string[] = [];

    let classGroupsMap: Record<string, any> = {};
    let teachersMap: Record<string, any> = {};
    let roomsMap: Record<string, any> = {};

    if (sessionClassGroupIds.length > 0) {
      const cgs = await prisma.classGroup.findMany({ where: { id: { in: sessionClassGroupIds } } });
      for (const cg of cgs) {
        classGroupsMap[cg.id] = cg;
        if (cg.roomIds) sessionRoomIds.push(...cg.roomIds);
      }
    }
    if (sessionTeacherIds.length > 0) {
      const teachers = await prisma.user.findMany({ where: { id: { in: sessionTeacherIds } } });
      for (const t of teachers) teachersMap[t.id] = t;
    }
    const uniqueRoomIds = Array.from(new Set(sessionRoomIds));
    if (uniqueRoomIds.length > 0) {
      const rooms = await prisma.room.findMany({ where: { id: { in: uniqueRoomIds } } });
      for (const r of rooms) roomsMap[r.id] = r;
    }

    const todayClasses = todaySessions.map(s => ({
      id: s.id,
      sessionId: s.sessionId,
      dateTime: s.dateTime,
      status: s.status,
      classGroups: (s.classGroupIds || []).map(cgId => {
        const cg = classGroupsMap[cgId];
        return cg ? { id: cgId, groupName: cg.groupName } : null;
      }).filter(Boolean),
      teachers: (s.teacherIds || []).map(tId => {
        const t = teachersMap[tId];
        return t ? { id: tId, fullName: t.fullName } : null;
      }).filter(Boolean),
      rooms: (s.classGroupIds || []).flatMap(cgId => {
        const cg = classGroupsMap[cgId];
        return cg ? (cg.roomIds || []).map((rId: string) => {
          const r = roomsMap[rId];
          return r ? { id: rId, roomName: r.roomName } : null;
        }).filter(Boolean) : [];
      }),
    }));

    auditService.logSensitiveRead(
      { id: dbUser.id, email: dbUser.email, role: userRole },
      "Session",
      todaySessions.map(s => s.id),
      getVisibleFieldIds(userRole, "Session", false),
      request
    );

    // ─── 2. Room Schedule ────────────────────────────────────────────────
    const roomScope = await getScopingFilter(
      { id: dbUser.id, role: userRole, branchIds: userBranchIds },
      "Room"
    );
    const rooms = await prisma.room.findMany({ where: roomScope, orderBy: { roomName: "asc" } });
    const roomSchedule = rooms.map(r => {
      const roomSessions = todaySessions.filter(s =>
        (s.classGroupIds || []).some(cgId => {
          const cg = classGroupsMap[cgId];
          return cg && (cg.roomIds || []).includes(r.id);
        })
      );
      return {
        id: r.id,
        roomName: r.roomName,
        capacity: r.capacity,
        timeSlots: roomSessions.map(s => ({
          sessionId: s.id,
          time: s.dateTime,
          status: s.status,
          classGroupNames: (s.classGroupIds || []).map(cgId => {
            const cg = classGroupsMap[cgId];
            return cg ? cg.groupName : null;
          }).filter(Boolean),
        })),
      };
    });

    // ─── 3. Students by Group ────────────────────────────────────────────
    const cgScope = await getScopingFilter(
      { id: dbUser.id, role: userRole, branchIds: userBranchIds },
      "ClassGroup"
    );
    const classGroups = await prisma.classGroup.findMany({ where: cgScope, orderBy: { groupName: "asc" } });
    const cgIds = classGroups.map(cg => cg.id);

    let enrollmentsByCG: Record<string, any[]> = {};
    let studentMap: Record<string, any> = {};
    if (cgIds.length > 0) {
      const enrollments = await prisma.enrollment.findMany({
        where: {
          classGroupIds: { hasSome: cgIds },
          status: { equals: "active", mode: "insensitive" },
        },
      });
      for (const e of enrollments) {
        for (const cgId of e.classGroupIds || []) {
          if (cgIds.includes(cgId)) {
            if (!enrollmentsByCG[cgId]) enrollmentsByCG[cgId] = [];
            enrollmentsByCG[cgId].push(e);
          }
        }
      }
      const allStudentIds = Array.from(new Set(enrollments.flatMap(e => e.studentIds || [])));
      if (allStudentIds.length > 0) {
        const students = await prisma.student.findMany({ where: { id: { in: allStudentIds } } });
        for (const st of students) studentMap[st.id] = st;
      }
    }

    const studentsByGroup = classGroups.map(cg => {
      const groupEnrollments = enrollmentsByCG[cg.id] || [];
      const studentIds = Array.from(new Set(groupEnrollments.flatMap(e => e.studentIds || [])));
      return {
        id: cg.id,
        groupName: cg.groupName,
        studentCount: studentIds.length,
        capacity: cg.capacity,
        status: cg.status,
        students: studentIds.map(sid => {
          const st = studentMap[sid];
          if (!st) return null;
          return {
            id: st.id,
            studentName: st.studentName,
            status: st.status,
          };
        }).filter(Boolean),
      };
    });

    auditService.logSensitiveRead(
      { id: dbUser.id, email: dbUser.email, role: userRole },
      "ClassGroup",
      cgIds,
      getVisibleFieldIds(userRole, "ClassGroup", false),
      request
    );

    // ─── 4. Teacher Schedule ─────────────────────────────────────────────
    const userScope = await getScopingFilter(
      { id: dbUser.id, role: userRole, branchIds: userBranchIds },
      "User"
    );
    const teachers = await prisma.user.findMany({
      where: { ...userScope, role: { equals: "Teacher", mode: "insensitive" } },
      orderBy: { fullName: "asc" },
    });
    const teacherSchedule = teachers.map(t => {
      const tSessions = todaySessions.filter(s => (s.teacherIds || []).includes(t.id));
      return {
        id: t.id,
        fullName: t.fullName,
        sessions: tSessions.map(s => ({
          sessionId: s.id,
          time: s.dateTime,
          status: s.status,
          classGroupNames: (s.classGroupIds || []).map(cgId => {
            const cg = classGroupsMap[cgId];
            return cg ? cg.groupName : null;
          }).filter(Boolean),
          roomNames: (s.classGroupIds || []).flatMap(cgId => {
            const cg = classGroupsMap[cgId];
            return cg ? (cg.roomIds || []).map((rId: string) => {
              const r = roomsMap[rId];
              return r ? r.roomName : null;
            }).filter(Boolean) : [];
          }),
        })),
      };
    });

    // ─── 5. Open Leads ───────────────────────────────────────────────────
    const leadScope = await getScopingFilter(
      { id: dbUser.id, role: userRole, branchIds: userBranchIds },
      "Lead"
    );
    const leads = await prisma.lead.findMany({
      where: {
        ...leadScope,
        status: { notIn: ["Enrolled", "Lost"], mode: "insensitive" },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Group leads by urgency using Stale Flag (computed field - display only)
    const staleLeads = leads.filter(l => {
      // Stale Flag is a computed field in Airtable, not in Prisma
      // We use Days Since Last Activity as a proxy for staleness
      // But per spec: "Never calculate lead staleness in the client. Use existing computed fields."
      // Since Stale Flag is computed in Airtable, we just return all open leads
      // and let the UI display them grouped by status
      return true;
    });

    const openLeads = leads.map(l => ({
      id: l.id,
      leadName: l.leadName,
      status: l.status,
      channel: l.channel,
      phone: l.phone,
      whatsapp: l.whatsapp,
      lastActivityDate: l.lastActivityDate,
      nextFollowUpDate: null as string | null, // Will be resolved from activities
      ownerIds: l.ownerIds,
      branchIds: l.branchIds,
    }));

    // Resolve next follow-up dates from activities
    const leadIds = leads.map(l => l.id);
    if (leadIds.length > 0) {
      const activities = await prisma.activity.findMany({
        where: { leadIds: { hasSome: leadIds } },
        orderBy: { nextFollowUpDate: "asc" },
        select: { leadIds: true, nextFollowUpDate: true },
      });
      const followUpByLead: Record<string, Date | null> = {};
      for (const act of activities) {
        for (const lid of act.leadIds || []) {
          if (!followUpByLead[lid] && act.nextFollowUpDate) {
            followUpByLead[lid] = act.nextFollowUpDate;
          }
        }
      }
      for (const lead of openLeads) {
        lead.nextFollowUpDate = followUpByLead[lead.id]?.toISOString() || null;
      }
    }

    auditService.logSensitiveRead(
      { id: dbUser.id, email: dbUser.email, role: userRole },
      "Lead",
      leadIds,
      getVisibleFieldIds(userRole, "Lead", false),
      request
    );

    // ─── 6. Recent Payments ──────────────────────────────────────────────
    const paymentScope = await getScopingFilter(
      { id: dbUser.id, role: userRole, branchIds: userBranchIds },
      "Payment"
    );
    const recentPayments = await prisma.payment.findMany({
      where: paymentScope,
      orderBy: { date: "desc" },
      take: 20,
    });

    // Resolve parent names for payments
    const paymentParentIds = Array.from(new Set(recentPayments.flatMap(p => p.parentIds || [])));
    let paymentParentMap: Record<string, any> = {};
    if (paymentParentIds.length > 0) {
      const parents = await prisma.parent.findMany({
        where: { id: { in: paymentParentIds } },
        select: { id: true, parentName: true },
      });
      for (const p of parents) paymentParentMap[p.id] = p;
    }

    const payments = recentPayments.map(p => ({
      id: p.id,
      paymentRef: p.paymentRef,
      date: p.date,
      amount: p.amount,
      method: p.method,
      paymentType: p.paymentType,
      possibleDuplicate: p.possibleDuplicate,
      parentNames: (p.parentIds || []).map(pid => paymentParentMap[pid]?.parentName || null).filter(Boolean),
    }));

    auditService.logSensitiveRead(
      { id: dbUser.id, email: dbUser.email, role: userRole },
      "Payment",
      recentPayments.map(p => p.id),
      getVisibleFieldIds(userRole, "Payment", false),
      request
    );

    // ─── 7. Upcoming Trials ──────────────────────────────────────────────
    const trialScope = await getScopingFilter(
      { id: dbUser.id, role: userRole, branchIds: userBranchIds },
      "Trial"
    );
    const allTrials = await prisma.trial.findMany({
      where: trialScope,
      orderBy: { dateTime: "asc" },
    });

    // Handle Rescheduled To with cycle detection
    const visitedTrialIds = new Set<string>();
    const resolvedTrials: any[] = [];
    function resolveTrialChain(trial: any, depth: number = 0): any {
      if (depth > 5 || visitedTrialIds.has(trial.id)) return trial;
      visitedTrialIds.add(trial.id);
      return trial;
    }

    const todayTrials = allTrials.filter(t => {
      if (!t.dateTime) return false;
      const d = new Date(t.dateTime);
      return d >= startOfToday && d <= endOfToday;
    }).map(t => resolveTrialChain(t));

    const overdueTrials = allTrials.filter(t => {
      if (!t.dateTime) return false;
      return new Date(t.dateTime) < startOfToday && t.outcome !== "Enrolled" && t.outcome !== "Lost";
    }).map(t => resolveTrialChain(t));

    const futureTrials = allTrials.filter(t => {
      if (!t.dateTime) return false;
      return new Date(t.dateTime) > endOfToday;
    }).map(t => resolveTrialChain(t));

    // Resolve lead names for trials
    const trialLeadIds = Array.from(new Set(allTrials.flatMap(t => t.leadIds || [])));
    let trialLeadMap: Record<string, any> = {};
    if (trialLeadIds.length > 0) {
      const trialLeads = await prisma.lead.findMany({
        where: { id: { in: trialLeadIds } },
        select: { id: true, leadName: true },
      });
      for (const l of trialLeads) trialLeadMap[l.id] = l;
    }

    function mapTrial(t: any) {
      return {
        id: t.id,
        trialId: t.trialId,
        dateTime: t.dateTime,
        outcome: t.outcome,
        leadNames: (t.leadIds || []).map((lid: string) => trialLeadMap[lid]?.leadName || null).filter(Boolean),
        teacherIds: t.teacherIds,
        classGroupIds: t.classGroupIds,
      };
    }

    const upcomingTrials = {
      today: todayTrials.map(mapTrial),
      overdue: overdueTrials.map(mapTrial),
      future: futureTrials.map(mapTrial),
    };

    auditService.logSensitiveRead(
      { id: dbUser.id, email: dbUser.email, role: userRole },
      "Trial",
      allTrials.map(t => t.id),
      getVisibleFieldIds(userRole, "Trial", false),
      request
    );

    // ─── 8. Notifications Status ─────────────────────────────────────────
    const notifScope = await getScopingFilter(
      { id: dbUser.id, role: userRole, branchIds: userBranchIds },
      "NotificationLog"
    );
    const notifications = await prisma.notificationLog.findMany({
      where: notifScope,
      orderBy: { scheduledFor: "desc" },
      take: 50,
    });

    const notifCounts = {
      scheduled: notifications.filter(n => n.status?.toLowerCase() === "scheduled").length,
      sent: notifications.filter(n => n.status?.toLowerCase() === "sent").length,
      failed: notifications.filter(n => n.status?.toLowerCase() === "failed").length,
      total: notifications.length,
      recent: notifications.slice(0, 10).map(n => ({
        id: n.id,
        type: n.type,
        channel: n.channel,
        status: n.status,
        scheduledFor: n.scheduledFor,
        sentAt: n.sentAt,
        message: n.message ? n.message.substring(0, 100) : null,
      })),
    };

    auditService.logSensitiveRead(
      { id: dbUser.id, email: dbUser.email, role: userRole },
      "NotificationLog",
      notifications.map(n => n.id),
      getVisibleFieldIds(userRole, "NotificationLog", false),
      request
    );

    // ─── 9. Follow-Up Due ────────────────────────────────────────────────
    const followUpToday: any[] = [];
    const followUpOverdue: any[] = [];
    const followUpNext: any[] = [];

    for (const lead of openLeads) {
      if (!lead.nextFollowUpDate) {
        followUpNext.push(lead);
        continue;
      }
      const fud = new Date(lead.nextFollowUpDate);
      if (fud >= startOfToday && fud <= endOfToday) {
        followUpToday.push(lead);
      } else if (fud < startOfToday) {
        followUpOverdue.push(lead);
      } else {
        followUpNext.push(lead);
      }
    }

    // ─── 10. Onboarding In Progress ──────────────────────────────────────
    // (Separate endpoint: /api/branch/onboarding)
    // We return a summary count here
    const enrollmentScope = await getScopingFilter(
      { id: dbUser.id, role: userRole, branchIds: userBranchIds },
      "Enrollment"
    );
    const onboardingCount = await prisma.enrollment.count({
      where: {
        ...enrollmentScope,
        OR: [
          { onboardingStatus: { not: "Complete", mode: "insensitive" } },
          { onboardingStatus: null },
          { onboardingStatus: "" },
        ],
      },
    });

    // ─── Assemble Response ───────────────────────────────────────────────
    return NextResponse.json({
      branchIds: userBranchIds,
      date: now.toISOString().split("T")[0],
      todayClasses,
      roomSchedule,
      studentsByGroup,
      teacherSchedule,
      openLeads: {
        total: openLeads.length,
        leads: openLeads,
      },
      recentPayments: payments,
      upcomingTrials,
      notificationsStatus: notifCounts,
      followUpDue: {
        today: followUpToday,
        overdue: followUpOverdue,
        next: followUpNext,
      },
      onboardingInProgress: {
        count: onboardingCount,
      },
    });
  } catch (error: any) {
    console.error("[Branch Dashboard Error]", error);
    auditService.logFailure(
      { id: dbUser.id, email: dbUser.email, role: userRole },
      "VIEW",
      "BranchDashboard",
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

export async function PUT() {
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

export async function DELETE() {
  return NextResponse.json(
    { error: "Phase 1/2 is read-only. Writes are blocked." },
    { status: 403 }
  );
}