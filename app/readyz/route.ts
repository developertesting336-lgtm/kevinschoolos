/**
 * GET /readyz
 *
 * Readiness probe.
 * No authentication required.
 *
 * Verifies:
 * 1. Airtable is reachable using the configured PAT.
 * 2. config/field-map.json has been successfully loaded.
 *
 * Returns HTTP 200 only when all checks pass.
 * Returns HTTP 503 with error details when any check fails.
 * Never exposes secrets in error messages.
 */

import { NextResponse } from "next/server";
import { logRequest } from "@/lib/logger";
import { extractRequestId, withRequestIdHeader } from "@/lib/request-id";
import { runReadinessChecks } from "@/lib/readiness";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const start = performance.now();
  const requestId = extractRequestId(request);

  const report = await runReadinessChecks();
  const allOk = report.status === "ready";

  const responseHeaders = new Headers();
  withRequestIdHeader(responseHeaders, requestId);

  // Build a safe error summary — never expose secrets
  const failures = report.checks
    .filter((c) => !c.ok)
    .map((c) => ({
      check: c.name,
      error: c.error,
    }));

  const body = allOk
    ? { status: "ready" }
    : {
        status: "not_ready",
        checks: failures,
      };

  const statusCode = allOk ? 200 : 503;

  const response = NextResponse.json(body, {
    status: statusCode,
    headers: responseHeaders,
  });

  const responseTimeMs = Math.round(performance.now() - start);
  logRequest({
    requestId,
    method: "GET",
    url: "/readyz",
    statusCode,
    responseTimeMs,
  });

  return response;
}