#!/usr/bin/env node

/**
 * generate-field-map.mjs
 *
 * Generates config/field-map.json and config/schema-baseline.json
 * from the Airtable Metadata API.
 *
 * This script:
 *  - Fetches schema metadata only (tables, fields, types, descriptions)
 *  - NEVER touches record data (no student, parent, payment rows)
 *  - Keys every entry by Airtable IDs (tableId, fieldId)
 *  - Marks computed fields as readOnly: true
 *  - Assigns a sensitivity tier to every table
 *  - Produces deterministic output (sorted keys)
 *  - Generates a stable schemaHash for drift detection
 *
 * Usage:
 *   AIRTABLE_PAT=pat_xxx AIRTABLE_BASE_ID=appT1VyuwHzKGhOId \
 *     node scripts/generate-field-map.mjs
 */

import dotenv from "dotenv";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchBaseSchema, isReadOnlyField, generateSchemaHash } from "../lib/fetch-airtable-schema.mjs";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CONFIG_DIR = resolve(ROOT, "config");

const FIELD_MAP_PATH = resolve(CONFIG_DIR, "field-map.json");
const BASELINE_PATH = resolve(CONFIG_DIR, "schema-baseline.json");

// ---------------------------------------------------------------------------
// Tier mapping
// ---------------------------------------------------------------------------
// Derived from Build Guide §2.4 (Table tiers) and config/rbac-matrix.json
// Keyed by Airtable table NAME (case-insensitive substring match).
// Names are stable identifiers for tier assignment; the output keys by ID.
const TIER_MAP = [
  // T1 – Financial / HQ-only
  { match: "Chart of Accounts",    tier: "T1", tierName: "Financial" },
  { match: "Journal Entries",      tier: "T1", tierName: "Financial" },
  { match: "Ledger Lines",         tier: "T1", tierName: "Financial" },
  { match: "Vendors",              tier: "T1", tierName: "Financial" },
  { match: "Expenses",             tier: "T1", tierName: "Financial" },
  { match: "Franchise Royalties",  tier: "T1", tierName: "Financial" },
  { match: "Teacher Pay",          tier: "T1", tierName: "Financial" },
  { match: "Teacher Hours",        tier: "T1", tierName: "Financial" },

  // T2 – PII / branch-admin
  { match: "Users",                tier: "T2", tierName: "PII" },
  { match: "Parents",              tier: "T2", tierName: "PII" },
  { match: "Students",             tier: "T2", tierName: "PII" },
  { match: "Enrollments",          tier: "T2", tierName: "PII" },
  { match: "Invoices",             tier: "T2", tierName: "PII" },
  { match: "Payments",             tier: "T2", tierName: "PII" },
  { match: "Notifications Log",    tier: "T2", tierName: "PII" },

  // T3 – Operational
  { match: "Terms",                tier: "T3", tierName: "Operational" },
  { match: "Rooms",                tier: "T3", tierName: "Operational" },
  { match: "Leads",                tier: "T3", tierName: "Operational" },
  { match: "Trials",               tier: "T3", tierName: "Operational" },
  { match: "Class Groups",         tier: "T3", tierName: "Operational" },
  { match: "Sessions",             tier: "T3", tierName: "Operational" },
  { match: "Attendance",           tier: "T3", tierName: "Operational" },
  { match: "Activities",           tier: "T3", tierName: "Operational" },

  // T4-RO – Analytics (Automation-Owned)
  { match: "Channel Performance",  tier: "T4-RO", tierName: "Analytics" },

  // T4 – Reference / low-risk
  { match: "Branches",             tier: "T4", tierName: "Reference" },
  { match: "Courses",              tier: "T4", tierName: "Reference" },
  { match: "Tuition Plans",        tier: "T4", tierName: "Reference" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Table-level flags configuration map based on substring match.
 */
const TABLE_FLAGS_MAP = [
  { match: "Channel Performance", flags: { automationOwned: true, appWritable: false } },
  { match: "Notifications Log", flags: { appendOnly: true } },
];

/**
 * Resolve table-level metadata flags by matching its name.
 */
function resolveTableFlags(tableName) {
  for (const entry of TABLE_FLAGS_MAP) {
    if (tableName.includes(entry.match)) {
      return entry.flags;
    }
  }
  return {};
}

/**
 * Resolve the tier for a table by matching its name against the TIER_MAP.
 */
function resolveTier(tableName, tableId) {
  for (const entry of TIER_MAP) {
    if (tableName.includes(entry.match)) {
      return { tier: entry.tier, tierName: entry.tierName };
    }
  }
  throw new Error(`FATAL: Unmatched table name "${tableName}" (ID: ${tableId || "unknown"}) in TIER_MAP.`);
}

/**
 * Build a deterministic, sorted copy of tables/fields from the raw API data.
 */
function buildSortedFieldMap(tables) {
  const fieldMap = {};

  for (const table of tables) {
    const tableId = table.id;
    const tableName = table.name;
    const { tier, tierName } = resolveTier(tableName, tableId);
    const tableFlags = resolveTableFlags(tableName);
    const tableDescription = table.description ?? null;

    const fields = {};

    for (const field of table.fields) {
      const fieldId = field.id;
      const fieldName = field.name;
      const fieldType = field.type;
      const readOnly = isReadOnlyField(fieldType);
      const fieldDescription = field.description ?? null;

      fields[fieldId] = {
        fieldId,
        fieldName,
        type: fieldType,
        readOnly,
      };

      if (fieldDescription !== null) {
        fields[fieldId].description = fieldDescription;
      }
    }

    fieldMap[tableId] = {
      tableId,
      tableName,
      tier,
      tierName,
      ...tableFlags,
      description: tableDescription,
      fields,
    };
  }

  // Deterministic sort: tables by tableId, fields by fieldId
  const sortedFieldMap = {};
  const sortedTableIds = Object.keys(fieldMap).sort();

  for (const tableId of sortedTableIds) {
    const table = fieldMap[tableId];
    const sortedFieldIds = Object.keys(table.fields).sort();

    const sortedFields = {};
    for (const fieldId of sortedFieldIds) {
      sortedFields[fieldId] = table.fields[fieldId];
    }

    sortedFieldMap[tableId] = {
      ...table,
      fields: sortedFields,
    };
  }

  return sortedFieldMap;
}

/**
 * Build the schema-baseline structure from raw API tables.
 * Uses the same sort approach as buildSortedFieldMap for consistency:
 * default Array.sort() by ID (UTF-16 code units).
 */
function buildSchemaBaseline(baseId, tables, schemaHash) {
  const sortedTables = [...tables].sort((a, b) => {
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });

  let totalFields = 0;

  const baselineTables = [];

  for (const table of sortedTables) {
    const sortedFields = [...table.fields].sort((a, b) => {
      if (a.id < b.id) return -1;
      if (a.id > b.id) return 1;
      return 0;
    });

    const baselineFields = sortedFields.map((f) => ({
      fieldId: f.id,
      fieldName: f.name,
      fieldType: f.type,
    }));

    baselineTables.push({
      tableId: table.id,
      tableName: table.name,
      fieldCount: baselineFields.length,
      fields: baselineFields,
    });

    totalFields += baselineFields.length;
  }

  return {
    baseId,
    generatedAt: new Date().toISOString(),
    schemaVersion: "1.0.0",
    schemaHash,
    totalTables: tables.length,
    totalFields,
    tables: baselineTables,
  };
}

/**
 * Validate the field map after construction.
 */
function validateFieldMap(sortedFieldMap, rawData) {
  let valid = true;

  for (const tableId of Object.keys(sortedFieldMap)) {
    const table = sortedFieldMap[tableId];
    if (!table.tier) {
      console.error(`VALIDATION FAIL: Table ${tableId} (${table.tableName}) has no tier.`);
      valid = false;
    }
  }

  for (const tableId of Object.keys(sortedFieldMap)) {
    const table = sortedFieldMap[tableId];
    for (const fieldId of Object.keys(table.fields)) {
      const field = table.fields[fieldId];
      if (!field.fieldId) {
        console.error(`VALIDATION FAIL: Field ${fieldId} in table ${tableId} has no fieldId.`);
        valid = false;
      }
    }
  }

  for (const tableId of Object.keys(sortedFieldMap)) {
    const table = sortedFieldMap[tableId];
    for (const fieldId of Object.keys(table.fields)) {
      const field = table.fields[fieldId];
      if (field.readOnly !== true && isReadOnlyField(field.type)) {
        console.error(
          `VALIDATION FAIL: Field ${tableId}.${fieldId} (${field.fieldName}) ` +
          `is type "${field.type}" but not marked readOnly.`
        );
        valid = false;
      }
    }
  }

  for (const key of Object.keys(sortedFieldMap)) {
    if (!key.startsWith("tbl")) {
      console.error(`VALIDATION FAIL: Table key "${key}" is not an Airtable table ID (should start with tbl).`);
      valid = false;
    }
  }
  for (const tableId of Object.keys(sortedFieldMap)) {
    const table = sortedFieldMap[tableId];
    for (const key of Object.keys(table.fields)) {
      if (!key.startsWith("fld")) {
        console.error(
          `VALIDATION FAIL: Field key "${key}" in table ${tableId} ` +
          `is not an Airtable field ID (should start with fld).`
        );
        valid = false;
      }
    }
  }

  if (rawData.records) {
    console.error("VALIDATION FAIL: API response contains record data. Aborting.");
    valid = false;
  }

  return valid;
}

/**
 * Validate the schema baseline after construction.
 */
function validateBaseline(baseline) {
  let valid = true;

  if (!baseline.schemaHash) {
    console.error("VALIDATION FAIL: schemaHash is missing.");
    valid = false;
  }

  if (!baseline.baseId) {
    console.error("VALIDATION FAIL: baseId is missing.");
    valid = false;
  }

  if (typeof baseline.totalTables !== "number" || baseline.totalTables < 1) {
    console.error("VALIDATION FAIL: totalTables is missing or zero.");
    valid = false;
  }

  if (typeof baseline.totalFields !== "number" || baseline.totalFields < 1) {
    console.error("VALIDATION FAIL: totalFields is missing or zero.");
    valid = false;
  }

  if (!Array.isArray(baseline.tables)) {
    console.error("VALIDATION FAIL: tables array is missing.");
    valid = false;
  }

  let countedFields = 0;
  for (const table of baseline.tables) {
    if (!table.tableId) {
      console.error(`VALIDATION FAIL: Table in baseline missing tableId.`);
      valid = false;
    }
    for (const field of table.fields) {
      if (!field.fieldId) {
        console.error(`VALIDATION FAIL: Field in baseline missing fieldId.`);
        valid = false;
      }
      if (!field.fieldType) {
        console.error(`VALIDATION FAIL: Field ${field.fieldId} missing fieldType.`);
        valid = false;
      }
      countedFields++;
    }
  }

  if (countedFields !== baseline.totalFields) {
    console.error(
      `VALIDATION FAIL: totalFields (${baseline.totalFields}) does not match counted fields (${countedFields}).`
    );
    valid = false;
  }

  if (baseline.tables.length !== baseline.totalTables) {
    console.error(
      `VALIDATION FAIL: totalTables (${baseline.totalTables}) does not match table count (${baseline.tables.length}).`
    );
    valid = false;
  }

  return valid;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.error("Fetching schema from Airtable Meta API...");

  // Single API call shared by both artifacts
  const { baseId, tables, raw: rawData } = await fetchBaseSchema();

  console.error(`Found ${tables.length} table(s).`);

  // -----------------------------------------------------------------------
  // Generate field-map.json
  // -----------------------------------------------------------------------
  const sortedFieldMap = buildSortedFieldMap(tables);

  const fieldMapOutput = {
    _meta: {
      generatedAt: new Date().toISOString(),
      baseId,
      totalTables: tables.length,
    },
    tables: sortedFieldMap,
  };

  // -----------------------------------------------------------------------
  // Generate schema-baseline.json
  // -----------------------------------------------------------------------
  const schemaHash = generateSchemaHash(tables);

  const baseline = buildSchemaBaseline(baseId, tables, schemaHash);

  // -----------------------------------------------------------------------
  // Write both files
  // -----------------------------------------------------------------------
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(FIELD_MAP_PATH, JSON.stringify(fieldMapOutput, null, 2), "utf-8");
  writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2), "utf-8");

  console.error(`\n✓ Wrote ${FIELD_MAP_PATH}`);
  console.error(`  ${tables.length} table(s), ${countAllFields(sortedFieldMap)} field(s) total`);

  console.error(`\n✓ Wrote ${BASELINE_PATH}`);
  console.error(`  ${baseline.totalTables} table(s), ${baseline.totalFields} field(s), hash=${baseline.schemaHash}`);

  // -----------------------------------------------------------------------
  // Validate field map
  // -----------------------------------------------------------------------
  if (!validateFieldMap(sortedFieldMap, rawData)) {
    console.error("\n✗ Field map validation failed.");
    process.exit(1);
  }
  console.error("✓ Field map validations passed.");

  // -----------------------------------------------------------------------
  // Validate baseline
  // -----------------------------------------------------------------------
  if (!validateBaseline(baseline)) {
    console.error("\n✗ Schema baseline validation failed.");
    process.exit(1);
  }
  console.error("✓ Schema baseline validations passed.\n");
}

function countAllFields(fieldMap) {
  let count = 0;
  for (const tableId of Object.keys(fieldMap)) {
    count += Object.keys(fieldMap[tableId].fields).length;
  }
  return count;
}

main().catch((err) => {
  console.error("FATAL: Unhandled error:", err);
  process.exit(1);
});