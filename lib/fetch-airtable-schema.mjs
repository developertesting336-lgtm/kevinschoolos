/**
 * fetch-airtable-schema.mjs
 *
 * Shared utility to fetch Airtable base schema from the Metadata API.
 * Used by generate-field-map.mjs and generate-schema-baseline.mjs.
 *
 * NEVER fetches record data — only table/field metadata.
 */

import { createHash } from "node:crypto";

/**
 * Allowed base IDs — hard-coded allow-list per Build Guide.
 */
const ALLOWED_BASE_IDS = ["appT1VyuwHzKGhOId"];

/**
 * Validate environment variables, fetch schema from the Airtable Meta API.
 *
 * @returns {Promise<{baseId: string, tables: Array, raw: object}>}
 *   baseId – the Airtable base ID
 *   tables – the array of table objects from the API
 *   raw – the full API response object
 */
export async function fetchBaseSchema() {
  const baseId = process.env.AIRTABLE_BASE_ID;
  const pat = process.env.AIRTABLE_PAT;

  if (!baseId) {
    throw new Error("FATAL: AIRTABLE_BASE_ID is not set.");
  }
  if (!pat) {
    throw new Error("FATAL: AIRTABLE_PAT is not set.");
  }

  if (!ALLOWED_BASE_IDS.includes(baseId)) {
    throw new Error(
      `FATAL: Unknown base "${baseId}". Allowed: ${ALLOWED_BASE_IDS.join(", ")}`
    );
  }

  const url = `https://api.airtable.com/v0/meta/bases/${baseId}/tables`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept: "application/json",
      Connection: "close",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status} from Airtable API: ${errorText}`);
  }

  const data = await response.json();

  if (!data.tables || !Array.isArray(data.tables)) {
    throw new Error("FATAL: Unexpected API response shape – missing 'tables' array.");
  }

  return { baseId, tables: data.tables, raw: data };
}

/**
 * Airtable field types that are computed / read-only.
 */
export const READONLY_TYPES = new Set([
  "formula",
  "rollup",
  "lookup",
  "multipleLookupValues",
  "count",
  "createdTime",
  "lastModifiedTime",
  "autoNumber",
  "createdBy",
  "lastModifiedBy",
  "button",
  "externalSyncSource",
]);

/**
 * Check if a field type is inherently read-only.
 */
export function isReadOnlyField(fieldType) {
  return READONLY_TYPES.has(fieldType);
}

/**
 * Generate a deterministic SHA-256 schema hash from table metadata.
 *
 * The hash depends ONLY on:
 *   - table IDs (sorted)
 *   - field IDs (sorted per table)
 *   - field names
 *   - field types
 *
 * It does NOT depend on:
 *   - timestamps
 *   - formatting / whitespace
 *   - ordering beyond the deterministic sort
 *
 * @param {Array} tables — the tables array from the Airtable Meta API
 * @returns {string} hex-encoded SHA-256 hash
 */
export function generateSchemaHash(tables) {
  // Build a deterministic canonical string
  const sortedTables = [...tables].sort((a, b) => a.id.localeCompare(b.id));

  const parts = [];

  for (const table of sortedTables) {
    parts.push(table.id);
    const sortedFields = [...table.fields].sort((a, b) => a.id.localeCompare(b.id));
    for (const field of sortedFields) {
      parts.push(field.id);
      parts.push(field.name);
      parts.push(field.type);
    }
  }

  // Build a single canonical string — no newlines, no formatting
  const canonical = parts.join("|");

  return createHash("sha256").update(canonical, "utf-8").digest("hex");
}