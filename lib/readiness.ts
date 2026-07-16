/**
 * Readiness check helpers.
 *
 * Provides reusable functions that /readyz uses to verify the application
 * can serve traffic. Each check returns a structured result so the endpoint
 * can aggregate failures into a single response.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { logger } from "./logger";
import { checkAirtableReachable as proxyCheckAirtable } from "./airtableProxy";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CheckResult {
  name: string;
  ok: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Check: Airtable reachability
// ---------------------------------------------------------------------------

/**
 * Verify that Airtable is reachable and the configured PAT is valid.
 *
 * Uses the Airtable meta API via the AirtableProxy.
 */
export async function checkAirtableReachable(): Promise<CheckResult> {
  const baseId = process.env.AIRTABLE_BASE_ID;

  if (!process.env.AIRTABLE_PAT) {
    return { name: "airtable_pat", ok: false, error: "AIRTABLE_PAT is not configured" };
  }

  if (!baseId) {
    return { name: "airtable_base_id", ok: false, error: "AIRTABLE_BASE_ID is not configured" };
  }

  const ok = await proxyCheckAirtable(baseId);
  if (!ok) {
    return {
      name: "airtable_api",
      ok: false,
      error: "Airtable API is unreachable or PAT/baseId is invalid",
    };
  }

  return { name: "airtable_api", ok: true };
}

// ---------------------------------------------------------------------------
// Check: field-map.json
// ---------------------------------------------------------------------------

/**
 * Verify that config/field-map.json exists and is valid JSON.
 */
export function checkFieldMap(): CheckResult {
  const fieldMapPath = resolve(process.cwd(), "config", "field-map.json");

  if (!existsSync(fieldMapPath)) {
    return {
      name: "field_map",
      ok: false,
      error: "config/field-map.json does not exist",
    };
  }

  try {
    const raw = readFileSync(fieldMapPath, "utf-8");
    JSON.parse(raw);
    return { name: "field_map", ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown parse error";
    return {
      name: "field_map",
      ok: false,
      error: `config/field-map.json is malformed: ${message}`,
    };
  }
}

// ---------------------------------------------------------------------------
// Aggregate runner
// ---------------------------------------------------------------------------

export interface ReadinessReport {
  status: "ready" | "not_ready";
  checks: CheckResult[];
}

/**
 * Run all readiness checks and return an aggregate report.
 */
export async function runReadinessChecks(): Promise<ReadinessReport> {
  const checks = await Promise.all([
    checkAirtableReachable(),
    Promise.resolve(checkFieldMap()),
  ]);

  const allOk = checks.every((c) => c.ok);

  if (!allOk) {
    const failures = checks.filter((c) => !c.ok);
    logger.warn({ checks: failures }, "Readiness check(s) failed");
  }

  return {
    status: allOk ? "ready" : "not_ready",
    checks,
  };
}