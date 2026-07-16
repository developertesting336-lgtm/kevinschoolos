/**
 * GET /healthz
 *
 * Liveness probe.
 * No authentication required. Always available.
 * Returns HTTP 200 when the application process is alive.
 * No Airtable, database, or field-map dependency.
 */

import { NextResponse } from "next/server";
import { logRequest } from "@/lib/logger";
import { extractRequestId, withRequestIdHeader } from "@/lib/request-id";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const start = performance.now();
  const requestId = extractRequestId(request);

  const responseHeaders = new Headers();
  withRequestIdHeader(responseHeaders, requestId);

  const response = NextResponse.json(
    { status: "ok" },
    { status: 200, headers: responseHeaders },
  );

  const responseTimeMs = Math.round(performance.now() - start);
  logRequest({
    requestId,
    method: "GET",
    url: "/healthz",
    statusCode: 200,
    responseTimeMs,
  });

  return response;
}