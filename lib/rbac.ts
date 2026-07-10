import fs from "fs";
import path from "path";
import prisma from "./prisma";
import { normalizeRole } from "./roles";
export { normalizeRole };

// Load RBAC Matrix
const matrixPath = path.join(process.cwd(), "config", "rbac-matrix.json");
const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8"));

export interface UserContext {
  id: string;
  role: string;
  branchIds: string[];
}

/**
 * Check if the user role has permissions to access a specific table and action
 */
export function checkRBAC(
  role: string,
  tableName: string,
  action: string, // "read" or "write"
  isBreakGlass: boolean = false
): { allowed: boolean; reason: string } {
  const normRole = normalizeRole(role);

  // Phase 1 is strictly read-only for all production data routes.
  if (action !== "read") {
    return { allowed: false, reason: "Phase 1 is strictly read-only for all production data routes." };
  }

  // Deny cleaner (excluded) immediately
  if (normRole === "cleaner" || normRole === "excluded") {
    return { allowed: false, reason: `Role '${role}' is explicitly excluded from system access.` };
  }

  // Find which tier the table belongs to
  let tableTier: string | null = null;
  for (const [tier, tables] of Object.entries(matrix.tiers)) {
    if ((tables as string[]).some(t => t.toLowerCase() === tableName.toLowerCase())) {
      tableTier = tier;
      break;
    }
  }

  if (!tableTier) {
    return { allowed: false, reason: `Table '${tableName}' is unrecognized or does not exist in any security tier.` };
  }

  // 1. Owner has full read access to all tiers
  if (normRole === "owner") {
    return { allowed: true, reason: "Owner has unrestricted read access." };
  }

  // 2. Tech Admin: standing access only to T4 reference tables. All other tiers require break-glass.
  if (normRole === "tech_admin") {
    if (tableTier === "T4") {
      return { allowed: true, reason: "Tech Admin has standing access to Reference data (T4)." };
    }
    if (isBreakGlass) {
      return { allowed: true, reason: "Tech Admin break-glass access approved." };
    }
    return { allowed: false, reason: `Tech Admin is denied standing access to ${tableTier} table '${tableName}' without break-glass.` };
  }

  // 3. SMM: Branch, Course, TuitionPlan, Lead, Trial, Activity, ChannelPerformance. Deny payments/payroll/ledger.
  if (normRole === "smm") {
    const allowedTables = ["Branch", "Course", "TuitionPlan", "Lead", "Trial", "Activity", "ChannelPerformance"];
    const isT4 = tableTier === "T4" || tableTier === "T4-RO";
    const isAllowedTable = allowedTables.some(t => t.toLowerCase() === tableName.toLowerCase());
    
    if (isT4 || isAllowedTable) {
      return { allowed: true, reason: "SMM allowed read access." };
    }
    return { allowed: false, reason: `SMM is restricted from accessing ${tableTier} table '${tableName}'.` };
  }

  // 4. Teacher: own classes, own sessions, own attendance, own students, T4 read, and newly assigned scoped tables.
  if (normRole === "teacher") {
    const allowedTables = [
      "Branch", "Course", "TuitionPlan", "Term", "Room", "Lead", "Trial",
      "Student", "Enrollment", "Session", "Attendance", "Activity", "Parent",
      "ClassGroup"
    ];
    const isAllowed = allowedTables.some(t => t.toLowerCase() === tableName.toLowerCase());

    if (isAllowed) {
      return { allowed: true, reason: "Teacher allowed scoped read access." };
    }
    return { allowed: false, reason: `Teacher is restricted from accessing ${tableTier} table '${tableName}'.` };
  }

  // 5. Finance: T1, T2, T4 allowed. Denied T3.
  if (normRole === "finance") {
    if (tableTier === "T1" || tableTier === "T2" || tableTier === "T4") {
      return { allowed: true, reason: "Finance allowed read access." };
    }
    return { allowed: false, reason: `Finance is restricted from accessing ${tableTier} table '${tableName}'.` };
  }

  // 6. Office Admin: T2, T3, T4, T4-RO. Denied T1 (finance/payroll).
  if (normRole === "office_admin") {
    if (tableTier === "T1") {
      return { allowed: false, reason: "Office Admin is denied access to T1 finance/payroll tables." };
    }
    if (tableTier === "T2" || tableTier === "T3" || tableTier === "T4" || tableTier === "T4-RO") {
      return { allowed: true, reason: "Office Admin allowed read access." };
    }
    return { allowed: false, reason: `Office Admin is restricted from accessing ${tableTier} table '${tableName}'.` };
  }

  return { allowed: false, reason: "Deny by default: role and permissions do not match." };
}

/**
 * Resolves the Prisma where conditions to restrict data based on branch scoping and role-specific rules
 */
export async function getScopingFilter(
  user: UserContext,
  tableName: string
): Promise<Record<string, unknown>> {
  const normRole = normalizeRole(user.role);
  const where: Record<string, unknown> = {};

  // 1. Branch Scoping: Apply to all roles except Owner (which has all access)
  if (normRole !== "owner") {
    if (tableName.toLowerCase() === "branch") {
      where.id = { in: user.branchIds };
    } else if (tableName.toLowerCase() === "activity" && normRole !== "teacher") {
      const branchLeads = await prisma.lead.findMany({
        where: { branchIds: { hasSome: user.branchIds } },
        select: { id: true },
      });
      const leadIds = branchLeads.map((l: any) => l.id);
      where.leadIds = { hasSome: leadIds };
    } else if (tableName.toLowerCase() === "trial" && normRole !== "teacher") {
      const branchLeads = await prisma.lead.findMany({
        where: { branchIds: { hasSome: user.branchIds } },
        select: { id: true },
      });
      const leadIds = branchLeads.map((l: any) => l.id);
      where.leadIds = { hasSome: leadIds };
    } else {
      const modelsWithBranchIds = [
        "user", "room", "lead", "parent", "student", "classgroup",
        "enrollment", "session", "invoice", "payment", "account", "journalentry",
        "ledgerline", "vendor", "expense", "franchiseroyalty", "teacherpay",
        "teacherhours", "channelperformance", "notificationlog"
      ];

      if (modelsWithBranchIds.includes(tableName.toLowerCase())) {
        where.branchIds = { hasSome: user.branchIds };
      }
    }
  }

  // 2. Role-specific Scoping (e.g. Teacher's own classes / own students / own sessions / own attendance / assigned leads & trials)
  if (normRole === "teacher") {
    if (tableName.toLowerCase() === "classgroup") {
      where.teacherIds = { has: user.id };
    } else if (tableName.toLowerCase() === "session") {
      where.teacherIds = { has: user.id };
    } else if (tableName.toLowerCase() === "trial") {
      where.teacherIds = { has: user.id };
    } else if (tableName.toLowerCase() === "lead") {
      where.ownerIds = { has: user.id };
    } else if (tableName.toLowerCase() === "activity") {
      const teacherLeads = await prisma.lead.findMany({
        where: { ownerIds: { has: user.id } },
        select: { id: true },
      });
      const leadIds = teacherLeads.map(l => l.id);
      where.OR = [
        { ownerIds: { has: user.id } },
        { leadIds: { hasSome: leadIds } }
      ];
    } else if (tableName.toLowerCase() === "attendance") {
      const sessions = await prisma.session.findMany({
        where: { teacherIds: { has: user.id } },
        select: { id: true },
      });
      const sessionIds = sessions.map(s => s.id);
      where.sessionIds = { hasSome: sessionIds };
    } else if (tableName.toLowerCase() === "student" || tableName.toLowerCase() === "parent" || tableName.toLowerCase() === "enrollment") {
      const teacherGroups = await prisma.classGroup.findMany({
        where: { teacherIds: { has: user.id } },
        select: { id: true },
      });
      const groupIds = teacherGroups.map(g => g.id);
      
      const enrollments = await prisma.enrollment.findMany({
        where: {
          classGroupIds: { hasSome: groupIds },
          status: { equals: "active", mode: "insensitive" }
        },
        select: { studentIds: true },
      });
      const studentIds = Array.from(new Set(enrollments.flatMap(e => e.studentIds)));
      
      if (tableName.toLowerCase() === "student") {
        where.id = { in: studentIds };
      } else if (tableName.toLowerCase() === "parent") {
        where.studentIds = { hasSome: studentIds };
      } else if (tableName.toLowerCase() === "enrollment") {
        where.studentIds = { hasSome: studentIds };
      }
    }
  }

  return where;
}

/**
 * Redacts sensitive fields from the query results based on the user's role
 */
export function applyRedactions(
  role: string,
  tableName: string,
  data: unknown,
  paymentContext: boolean = false
): unknown {
  if (!data) return data;
  const normRole = normalizeRole(role);

  // If array, map over each item
  if (Array.isArray(data)) {
    return data.map(item => applyRedactions(role, tableName, item, paymentContext));
  }

  const result = { ...(data as Record<string, unknown>) };

  // 1. Students redactions: Hide DOB and Medical Notes from Teacher, SMM, Finance
  if (tableName.toLowerCase() === "student") {
    if (["teacher", "smm", "finance"].includes(normRole)) {
      delete result.dateOfBirth;
      delete result.medicalNotes;
    }
  }

  // 2. Parents redactions: Hide phone, whatsapp, email, whatsappGroupAdded, whatsappGroupName from Teacher and SMM
  if (tableName.toLowerCase() === "parent") {
    const isTeacherOrSmm = ["teacher", "smm"].includes(normRole);
    const isFinanceWithoutContext = normRole === "finance" && !paymentContext;

    if (isTeacherOrSmm || isFinanceWithoutContext) {
      delete result.phone;
      delete result.whatsapp;
      delete result.email;
      delete result.whatsappGroupAdded;
      delete result.whatsappGroupName;
    }
  }

  // 3. Vendors redactions: Hide phone and email from teacher and smm
  if (tableName.toLowerCase() === "vendor") {
    if (["teacher", "smm"].includes(normRole)) {
      delete result.phone;
      delete result.email;
    }
  }

  return result;
}
