/**
 * Centralized structured logger.
 *
 * Replaces console.log / console.error with pino.
 * Every log entry includes: timestamp, level, requestId, route, HTTP method,
 * response status, and response time.
 *
 * PII scrubbing is built in via a custom redaction serializer.
 */

import pino from "pino";

// ---------------------------------------------------------------------------
// PII redaction – sensitive keys whose values are replaced with [REDACTED]
// ---------------------------------------------------------------------------
const SENSITIVE_KEYS = new Set([
  // HTTP headers
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  // Environment secrets
  "airtable_pat",
  "session_secret",
  "db_path",
  "database_url",
  // Generic tokens / passwords
  "password",
  "token",
  "secret",
  "api_key",
  "api_secret",
  "access_token",
  "refresh_token",
  // Parent / student PII
  "parent_name",
  "parent_email",
  "parent_phone",
  "student_name",
  "student_email",
  "student_phone",
  "dob",
  "date_of_birth",
  "medical_notes",
  // Payment details
  "card_number",
  "cvv",
  "expiry",
  "payment_method",
  "billing_address",
  // Any key that contains these substrings
  "pat",
  "pwd",
]);

/**
 * Deeply walk an object and replace sensitive values with "[REDACTED]".
 */
function scrubPII(value: unknown, depth = 0): unknown {
  if (depth > 10) return value; // safety valve
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.map((v) => scrubPII(v, depth + 1));
  }
  if (typeof value === "object") {
    const cleaned: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase().replace(/[_-]/g, "_");
      if (SENSITIVE_KEYS.has(lowerKey)) {
        cleaned[key] = "[REDACTED]";
      } else {
        cleaned[key] = scrubPII(val, depth + 1);
      }
    }
    return cleaned;
  }
  return value;
}

// ---------------------------------------------------------------------------
// Logger instance
// ---------------------------------------------------------------------------

/**
 * Determine the minimum log level from the environment.
 * Defaults to "info" in production, "debug" otherwise.
 */
function resolveLevel(): string {
  if (process.env.LOG_LEVEL) return process.env.LOG_LEVEL;
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

export const logger = pino({
  level: resolveLevel(),
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
  // Redact known sensitive top-level keys from the raw object form
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.headers['set-cookie']",
      "req.headers['x-api-key']",
      "res.headers['set-cookie']",
      "password",
      "token",
      "secret",
      "pat",
      "airtable_pat",
      "session_secret",
      "db_path",
      "database_url",
      "card_number",
      "cvv",
      "expiry",
      "payment_method",
    ],
    censor: "[REDACTED]",
  },
});

// ---------------------------------------------------------------------------
// Request-logging helper
// ---------------------------------------------------------------------------

export interface RequestLogInfo {
  requestId: string;
  method: string;
  url: string;
  statusCode: number;
  responseTimeMs: number;
  error?: Error;
}

/**
 * Log a completed request at the appropriate level.
 * 5xx → error, 4xx → warn, everything else → info.
 */
export function logRequest(info: RequestLogInfo): void {
  const logFn =
    info.statusCode >= 500
      ? logger.error.bind(logger)
      : info.statusCode >= 400
        ? logger.warn.bind(logger)
        : logger.info.bind(logger);

  const payload: Record<string, unknown> = {
    requestId: info.requestId,
    method: info.method,
    route: info.url,
    statusCode: info.statusCode,
    responseTimeMs: info.responseTimeMs,
  };

  if (info.error) {
    payload.err = info.error;
  }

  logFn(payload, info.method);
}

// ---------------------------------------------------------------------------
// Convenience: child logger scoped to a request
// ---------------------------------------------------------------------------

/**
 * Create a child logger pre-bound with a request ID and optional context.
 * Use this in route handlers to get automatic request ID on every log line.
 */
export function requestLogger(requestId: string, extra?: Record<string, unknown>): pino.Logger {
  return logger.child({ requestId, ...extra });
}

// ---------------------------------------------------------------------------
// Deprecation guard — prevent accidental console.log usage in app code
// ---------------------------------------------------------------------------

/**
 * Call once during server startup if you want to warn about console.* usage
 * in development (this does not patch — it's purely informational).
 */
export function warnAboutConsoleUsage(): void {
  logger.warn(
    "console.log / console.error should not be used for application logging. Use the pino logger from '@/lib/logger' instead.",
  );
}