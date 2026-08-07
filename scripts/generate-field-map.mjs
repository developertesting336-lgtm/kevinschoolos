
import dotenv from "dotenv";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchBaseSchema, isReadOnlyField, generateSchemaHash } from "../lib/fetch-airtable-schema.mjs";
import {
  resolveTier,
  resolveTableFlags,
  resolvePrismaModel,
  getRegistryEntry,
} from "../lib/table-registry.mjs";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CONFIG_DIR = resolve(ROOT, "config");

const FIELD_MAP_PATH = resolve(CONFIG_DIR, "field-map.json");
const BASELINE_PATH = resolve(CONFIG_DIR, "schema-baseline.json");

// ---------------------------------------------------------------------------
// CLI flags
// ---------------------------------------------------------------------------
const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes("--dry-run") || ARGS.includes("--check");
// Tables 28-39 carry proposed (unratified) tiers. Baking a proposed tier into
// committed config is an Owner decision under gates #4/#5, so the generator
// refuses unless this flag is passed explicitly.
const ACCEPT_PROPOSED = ARGS.includes("--accept-proposed");

/**
 * Build a deterministic, sorted copy of tables/fields from the raw API data.
 */
function buildSortedFieldMap(tables) {
  const fieldMap = {};

  for (const table of tables) {
    const tableId = table.id;
    const tableName = table.name;
    const { tier, tierName } = resolveTier(tableId, tableName);
    const tableFlags = resolveTableFlags(tableId);
    const prismaModel = resolvePrismaModel(tableId);
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

      if (fieldType === "multipleRecordLinks" && field.options?.linkedTableId) {
        fields[fieldId].linkedTableId = field.options.linkedTableId;
      }

      if (fieldDescription !== null) {
        fields[fieldId].description = fieldDescription;
      }
    }

    fieldMap[tableId] = {
      tableId,
      tableName,
      prismaModel,
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
  // Validate BEFORE writing.
  //
  // The previous ordering wrote both frozen config files first and validated
  // afterwards, so a validation failure left modified config on disk.
  // -----------------------------------------------------------------------
  if (!validateFieldMap(sortedFieldMap, rawData)) {
    console.error("\n✗ Field map validation failed. Nothing was written.");
    process.exit(1);
  }
  console.error("✓ Field map validations passed.");

  if (!validateBaseline(baseline)) {
    console.error("\n✗ Schema baseline validation failed. Nothing was written.");
    process.exit(1);
  }
  console.error("✓ Schema baseline validations passed.");

  // -----------------------------------------------------------------------
  // Gate #4/#5 guard: refuse to bake unratified tiers into committed config.
  // -----------------------------------------------------------------------
  const proposedLive = tables
    .map((t) => getRegistryEntry(t.id))
    .filter((e) => e?.proposed);

  if (proposedLive.length > 0 && !ACCEPT_PROPOSED) {
    console.error(
      `\n✗ ${proposedLive.length} live table(s) have PROPOSED (unratified) tiers:`
    );
    for (const e of proposedLive) {
      console.error(`    ${e.displayName} -> ${e.tier} ${e.tierName}`);
    }
    console.error(
      "\n  Tier assignment drives redaction and role access, so it is an Owner\n" +
        "  decision under gates #4/#5. Nothing was written.\n\n" +
        "  Once the Owner has signed off, drop `proposed: true` in\n" +
        "  lib/table-registry.mjs, or re-run with --accept-proposed.\n"
    );
    process.exit(1);
  }

  // -----------------------------------------------------------------------
  // Write both files
  // -----------------------------------------------------------------------
  if (DRY_RUN) {
    console.error("\n✓ --dry-run: validated, nothing written.");
    console.error(`  Would write ${FIELD_MAP_PATH}`);
    console.error(`    ${tables.length} table(s), ${countAllFields(sortedFieldMap)} field(s) total`);
    console.error(`  Would write ${BASELINE_PATH}`);
    console.error(`    ${baseline.totalTables} table(s), ${baseline.totalFields} field(s), hash=${baseline.schemaHash}\n`);
    return;
  }

  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(FIELD_MAP_PATH, JSON.stringify(fieldMapOutput, null, 2), "utf-8");
  writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2), "utf-8");

  console.error(`\n✓ Wrote ${FIELD_MAP_PATH}`);
  console.error(`  ${tables.length} table(s), ${countAllFields(sortedFieldMap)} field(s) total`);

  console.error(`\n✓ Wrote ${BASELINE_PATH}`);
  console.error(`  ${baseline.totalTables} table(s), ${baseline.totalFields} field(s), hash=${baseline.schemaHash}\n`);
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