import fs from "fs";
import path from "path";

const LOG_DIR = path.join(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "audit.log");

function mapAction(action: string): string {
  const mapping: Record<string, string> = {
    login: 'login',
    logout: 'logout',
    view: 'read',               
    sensitive_access: 'break_glass', 
    update: 'update',
    delete: 'delete',
    permission_denied: 'break_glass',
  };
  const key = action.toLowerCase();
  return mapping[key] || 'read'; 
};

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
  fieldIds?: string[]; // field names only — never field values
  result: "SUCCESS" | "FAIL";
  details?: string | null;
}

export const auditService = {
  log: (event: AuditEvent, request?: Request) => {
    // Async — never blocks the request lifecycle
    Promise.resolve().then(async () => {
      try {
        let method: string | null = null;
        let endpoint: string | null = null;
        let userAgent: string | null = null;
        let ipAddress: string | null = null;

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
        }

        // Map the rich AuditEvent to the existing audit_log table columns:
        //   actor_email, actor_role, action, table_name, record_ids, fields, result, ip_address, user_agent
        const recordIds = [event.recordId, event.actorId]
          .filter(Boolean)
          .join(",") || null;

        const fieldsPayload = JSON.stringify({
          ...(event.fieldIds?.length ? { fieldIds: event.fieldIds } : {}),
          ...(event.branchIds?.length ? { branchIds: event.branchIds } : {}),
          ...(endpoint ? { endpoint } : {}),
          ...(method ? { method } : {}),
          ...(event.details ? { details: event.details } : {}),
        }) || null;

        // 1. Write to existing audit_log table via Prisma (dynamic import avoids circular deps)
        const { default: prisma } = await import("./prisma");
       await prisma.auditLog.create({
          data: {
            actorEmail: event.actorEmail || "",
            actorRole:  event.role       || "",
            action:     mapAction(event.action),   
            tableName:  event.tableName  || "",
            recordIds,
            fields: fieldsPayload,
            result:     event.result.toLowerCase(), 
            ipAddress,
            userAgent,
          },
        });

        // 2. Also write a local file log for debugging
        if (!fs.existsSync(LOG_DIR)) {
          fs.mkdirSync(LOG_DIR, { recursive: true });
        }
        const logEntry = {
          timestamp: new Date().toISOString(),
          endpoint,
          method,
          ipAddress,
          userAgent,
          ...event,
        };
        fs.appendFileSync(LOG_FILE, JSON.stringify(logEntry) + "\n");
        console.log(`[Audit Log] ${JSON.stringify(logEntry)}`);
      } catch (err) {
        // Logging errors must never crash the application
        console.error("[Audit Service Error] Failed to write audit log:", err);
      }
    });
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
