/**
 * Request ID utilities.
 *
 * Generates, extracts, and propagates unique request identifiers
 * throughout the request lifecycle.
 */

import { randomUUID } from "node:crypto";

/**
 * Header name used for request ID propagation.
 * Clients may supply this header; if absent the server generates one.
 */
export const REQUEST_ID_HEADER = "x-request-id";

/**
 * Generate a new unique request ID.
 */
export function generateRequestId(): string {
  return randomUUID();
}

/**
 * Extract a request ID from the incoming request headers,
 * falling back to a generated value when the client did not supply one.
 */
export function extractRequestId(request: Request): string {
  const existing = request.headers.get(REQUEST_ID_HEADER);
  if (existing && typeof existing === "string" && existing.length > 0) {
    return existing;
  }
  return generateRequestId();
}

/**
 * Return a response header object with the request ID set.
 * Merges with any existing headers.
 */
export function withRequestIdHeader(
  headers: Headers,
  requestId: string,
): void {
  headers.set(REQUEST_ID_HEADER, requestId);
}