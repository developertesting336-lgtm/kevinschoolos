import fs from "fs";
import path from "path";

const LOG_DIR = path.join(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "audit.log");

function mapAction(action: string): string {
  const mapping: Record<string, string> = {
    login: "login",
    logout: "logout",
    view: "read",
    sensitive_access: "read",
    create: "create",
    update: "update",
    delete: "delete",
    permission_denied: "read",
  };
  const key = action.toLowerCase();
  return mapping[key] || "read";
}

/**
 * PII Scrubber safety-net helper. Removes potential emails, phone numbers,
 * and dates from audit log text to ensure no PII is accidentally stored.
 */
function scrubPII(text: string | null | undefined): string | null {
  if (!text) return null;
  // Scrub emails
  let scrubbed = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL]");
  // Scrub phone numbers
  scrubbed = scrubbed.replace(/(?:\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}/g, "[PHONE]");
  // Scrub dates (YYYY-MM-DD)
  scrubbed = scrubbed.replace(/\b\d{4}-\d{2}-\d{2}\b/g, "[DATE]");
  return scrubbed;
}

export interface AuditEvent {
  actorId?: string | null;
  actorEmail?: string | null;
  role?: string | null;
  branchIds?: string[];
  action:
  | "LOGIN"
  | "LOGOUT"
  | "VIEW"
  | "SENSITIVE_ACCESS"
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "PERMISSION_DENIED";
  tableName?: string | null;
  recordId?: string | null;
  recordIds?: string[];
  fieldIds?: string[]; // field IDs only — never values
  result: "SUCCESS" | "FAIL";
  details?: string | null;
  requestId?: string | null;
}

export const auditService = {
  log: (event: AuditEvent, request?: Request) => {
    // Run asynchronously to prevent blocking the request lifecycle
    Promise.resolve().then(async () => {
      try {
        let method: string | null = null;
        let endpoint: string | null = null;
        let userAgent: string | null = null;
        let ipAddress: string | null = null;
        let requestId = event.requestId || null;

        if (request) {
          method = request.method;
          try {
            endpoint = new URL(request.url).pathname;
          } catch {
            endpoint = request.url;
          }
          userAgent = request.headers.get("user-agent") || null;
          ipAddress =
            request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
            request.headers.get("x-real-ip") ||
            null;
          requestId = requestId || request.headers.get("x-request-id") || null;
        }

        // 1. Snapshot Actor Email and Role. If not provided but actorId exists, fetch dynamically
        let actorEmail = event.actorEmail || "";
        let actorRole = event.role || "";

        if (event.actorId && (!actorEmail || !actorRole)) {
          const { default: prisma } = await import("./prisma");
          const user = await prisma.user.findUnique({
            where: { id: event.actorId },
            select: { email: true, role: true },
          });
          if (user) {
            actorEmail = actorEmail || user.email || "";
            actorRole = actorRole || user.role || "";
          }
        }

        // 2. Consolidate record IDs (join recordId, recordIds list, and optionally actorId if action is user-linked)
        const allRecordIds = [
          ...(event.recordIds || []),
          event.recordId,
          event.actorId,
        ].filter(Boolean);

        const recordIdsColumn = allRecordIds.join(",") || null;

        // Scrub any PII from details
        const cleanDetails = scrubPII(event.details);

        const fieldsPayload = JSON.stringify({
          ...(event.fieldIds?.length ? { fieldIds: event.fieldIds } : {}),
          ...(event.branchIds?.length ? { branchIds: event.branchIds } : {}),
          ...(endpoint ? { endpoint } : {}),
          ...(method ? { method } : {}),
          ...(cleanDetails ? { details: cleanDetails } : {}),
          ...(requestId ? { requestId } : {}),
        }) || null;

        // Map result to allowed database check constraint values: 'success', 'denied', 'error'
        const dbResult = event.result.toLowerCase() === "fail"
          ? (event.action === "PERMISSION_DENIED" ? "denied" : "error")
          : "success";

        // 3. Write to Postgres audit_log table
        const { default: prisma } = await import("./prisma");
        await prisma.auditLog.create({
          data: {
            actorEmail,
            actorRole,
            action: mapAction(event.action),
            tableName: event.tableName || "",
            recordIds: recordIdsColumn,
            fields: fieldsPayload,
            result: dbResult,
            ipAddress,
            userAgent,
          },
        });

        // 4. Write to local file log (audit.log)
        if (!fs.existsSync(LOG_DIR)) {
          fs.mkdirSync(LOG_DIR, { recursive: true });
        }
        const logEntry = {
          timestamp: new Date().toISOString(),
          endpoint,
          method,
          ipAddress,
          userAgent,
          requestId,
          actorEmail,
          actorRole,
          action: event.action,
          tableName: event.tableName,
          recordIds: allRecordIds,
          fieldIds: event.fieldIds,
          result: event.result,
          details: cleanDetails,
        };
        fs.appendFileSync(LOG_FILE, JSON.stringify(logEntry) + "\n");
        // console.log(`[Audit Log] ${JSON.stringify(logEntry)}`);
      } catch (err) {
        // Must never crash the main application process
        console.error("[Audit Service Error] Failed to write audit log:", err);
      }
    });
  },

  /**
   * Helper to audit sensitive reads (e.g. Students, Parents, Invoices, Payments, etc.)
   */
  logSensitiveRead: (
    actor: { id: string; email?: string | null; role?: string | null },
    tableName: string,
    recordIds: string[],
    fieldIds: string[],
    request?: Request
  ) => {
    auditService.log(
      {
        actorId: actor.id,
        actorEmail: actor.email,
        role: actor.role,
        action: "SENSITIVE_ACCESS",
        tableName,
        recordIds,
        fieldIds,
        result: "SUCCESS",
        details: `Sensitive read of ${recordIds.length} records in table ${tableName}.`,
      },
      request
    );
  },

  /**
   * Helper to audit failures (e.g. authentication, permission denied, missing records, etc.)
   */
  logFailure: (
    actor: { id?: string | null; email?: string | null; role?: string | null } | undefined,
    action: AuditEvent["action"],
    tableName: string | undefined,
    details: string,
    request?: Request
  ) => {
    auditService.log(
      {
        actorId: actor?.id,
        actorEmail: actor?.email,
        role: actor?.role,
        action,
        tableName: tableName || null,
        result: "FAIL",
        details,
      },
      request
    );
  },
};

// Backward-compatible wrapper for existing logAudit() callsites
export function logAudit(
  event: {
    userId?: string;
    role?: string;
    action: string;
    target: string;
    status: string;
    details?: string;
  },
  request?: Request
) {
  const result: AuditEvent["result"] = event.status === "DENIED" ? "FAIL" : "SUCCESS";
  let action: AuditEvent["action"] = "VIEW";

  const up = event.action?.toUpperCase();
  if (event.status === "DENIED") {
    action = "PERMISSION_DENIED";
  } else if (up === "LOGIN") {
    action = "LOGIN";
  } else if (up === "LOGOUT") {
    action = "LOGOUT";
  }

  auditService.log(
    {
      actorId: event.userId,
      role: event.role,
      action,
      tableName: event.target,
      result,
      details: event.details,
    },
    request
  );
}

/**
 * Resolves the non-redacted Airtable field IDs for a given table and user role.
 */
export function getVisibleFieldIds(role: string, tableName: string, paymentContext: boolean = false): string[] {
  try {
    const normRole = (role || "").toLowerCase();
    const cleanTableName = (tableName || "").toLowerCase();

    // Load field-map.json directly
    const fieldMapPath = path.join(process.cwd(), "config", "field-map.json");
    if (!fs.existsSync(fieldMapPath)) return [];

    const fieldMap = JSON.parse(fs.readFileSync(fieldMapPath, "utf8"));
    const tables = fieldMap.tables || {};

    // Find table by name or ID
    const table = Object.values(tables).find((t: any) =>
      t.tableName.toLowerCase() === cleanTableName ||
      t.tableId.toLowerCase() === cleanTableName ||
      (t.prismaModel && t.prismaModel.toLowerCase() === cleanTableName)
    ) as any;

    if (!table || !table.fields) return [];

    const fieldIds: string[] = [];

    for (const field of Object.values(table.fields) as any[]) {
      const name = (field.fieldName || "").toLowerCase();
      let isRedacted = false;

      if (cleanTableName === "student" || table.prismaModel?.toLowerCase() === "student") {
        if (["teacher", "smm", "finance"].includes(normRole)) {
          if (name.includes("date of birth") || name.includes("medical notes")) {
            isRedacted = true;
          }
        }
      } else if (cleanTableName === "parent" || table.prismaModel?.toLowerCase() === "parent") {
        const isTeacherOrSmm = ["teacher", "smm"].includes(normRole);
        const isFinanceWithoutContext = normRole === "finance" && !paymentContext;
        if (isTeacherOrSmm || isFinanceWithoutContext) {
          if (
            name.includes("phone") ||
            name.includes("whatsapp") ||
            name.includes("email")
          ) {
            isRedacted = true;
          }
        }
      } else if (cleanTableName === "vendor" || table.prismaModel?.toLowerCase() === "vendor") {
        if (["teacher", "smm"].includes(normRole)) {
          if (name.includes("phone") || name.includes("email")) {
            isRedacted = true;
          }
        }
      }

      if (!isRedacted) {
        fieldIds.push(field.fieldId);
      }
    }

    return fieldIds;
  } catch (err) {
    console.error("[Audit Service] Failed to get visible field IDs:", err);
    return [];
  }
}

