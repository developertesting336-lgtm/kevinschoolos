
import dotenv from "dotenv";
import fs from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchBaseSchema, isReadOnlyField, generateSchemaHash } from "../lib/fetch-airtable-schema.mjs";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CONFIG_DIR = resolve(ROOT, "config");
const BASELINE_PATH = resolve(CONFIG_DIR, "schema-baseline.json");

// ---------------------------------------------------------------------------
// Tier mapping (duplicated from scripts/generate-field-map.mjs to avoid run-time side effects)
// ---------------------------------------------------------------------------
const TIER_MAP = [
  // T1 – Financial / HQ-only
  { match: "Chart of Accounts", tier: "T1", tierName: "Financial" },
  { match: "Journal Entries", tier: "T1", tierName: "Financial" },
  { match: "Ledger Lines", tier: "T1", tierName: "Financial" },
  { match: "Vendors", tier: "T1", tierName: "Financial" },
  { match: "Expenses", tier: "T1", tierName: "Financial" },
  { match: "Franchise Royalties", tier: "T1", tierName: "Financial" },
  { match: "Teacher Pay", tier: "T1", tierName: "Financial" },
  { match: "Teacher Hours", tier: "T1", tierName: "Financial" },

  // T2 – PII / branch-admin
  { match: "Users", tier: "T2", tierName: "PII" },
  { match: "Parents", tier: "T2", tierName: "PII" },
  { match: "Students", tier: "T2", tierName: "PII" },
  { match: "Enrollments", tier: "T2", tierName: "PII" },
  { match: "Invoices", tier: "T2", tierName: "PII" },
  { match: "Payments", tier: "T2", tierName: "PII" },
  { match: "Notifications Log", tier: "T2", tierName: "PII" },

  // T3 – Operational
  { match: "Terms", tier: "T3", tierName: "Operational" },
  { match: "Rooms", tier: "T3", tierName: "Operational" },
  { match: "Leads", tier: "T3", tierName: "Operational" },
  { match: "Trials", tier: "T3", tierName: "Operational" },
  { match: "Class Groups", tier: "T3", tierName: "Operational" },
  { match: "Sessions", tier: "T3", tierName: "Operational" },
  { match: "Attendance", tier: "T3", tierName: "Operational" },
  { match: "Activities", tier: "T3", tierName: "Operational" },

  // T4-RO – Analytics (Automation-Owned)
  { match: "Channel Performance", tier: "T4-RO", tierName: "Analytics" },

  // T4 – Reference / low-risk
  { match: "Branches", tier: "T4", tierName: "Reference" },
  { match: "Courses", tier: "T4", tierName: "Reference" },
  { match: "Tuition Plans", tier: "T4", tierName: "Reference" },
];

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
 * Map camelCase and raw types from Airtable API to polished display strings.
 */
function formatFieldType(type) {
  if (!type) return "Unknown";
  const specialMaps = {
    singleLineText: "Single Line Text",
    multilineText: "Multiline Text",
    multipleRecordLinks: "Multiple Record Links",
    multipleSelects: "Multiple Selects",
    singleSelect: "Single Select",
    currency: "Currency",
    percent: "Percent",
    dateTime: "Date Time",
    createdTime: "Created Time",
    lastModifiedTime: "Last Modified Time",
    autoNumber: "Auto Number",
    createdBy: "Created By",
    lastModifiedBy: "Last Modified By",
    externalSyncSource: "External Sync Source",
  };
  if (specialMaps[type]) {
    return specialMaps[type];
  }
  return type
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Safely scrub secrets from error messages before printing them.
 */
function cleanErrorMessage(err) {
  let msg = err.message || String(err);
  msg = msg.replace(/pat_[a-zA-Z0-9]{15,}/g, "pat_***");
  msg = msg.replace(/Bearer\s+[a-zA-Z0-9_\-\.]+/gi, "Bearer ***");
  msg = msg.replace(/"Authorization":\s*"[^"]*"/gi, '"Authorization": "***"');
  msg = msg.replace(/Authorization:\s*[^\s\n]+/gi, "Authorization: ***");
  return msg;
}

async function main() {
  // -------------------------------------------------------------------------
  // 1. Load baseline
  // -------------------------------------------------------------------------
  let baseline;
  try {
    if (!fs.existsSync(BASELINE_PATH)) {
      console.error(`✗ Error: Baseline file is missing at "${BASELINE_PATH}"`);
      process.exit(1);
    }
    const rawBaseline = fs.readFileSync(BASELINE_PATH, "utf-8");
    try {
      baseline = JSON.parse(rawBaseline);
    } catch (parseErr) {
      console.error(`✗ Error: Baseline file at "${BASELINE_PATH}" is invalid JSON.`);
      process.exit(1);
    }
    if (!baseline || typeof baseline !== "object" || !Array.isArray(baseline.tables) || !baseline.schemaHash) {
      console.error(`✗ Error: Baseline file at "${BASELINE_PATH}" has an invalid schema format.`);
      process.exit(1);
    }
  } catch (err) {
    console.error("✗ Error loading baseline:", cleanErrorMessage(err));
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // 2. Fetch live schema
  // -------------------------------------------------------------------------
  let liveData;
  try {
    liveData = await fetchBaseSchema();
  } catch (err) {
    console.error("✗ Error fetching live schema from Airtable:", cleanErrorMessage(err));
    const msg = err.message;
    if (msg.includes("HTTP 401")) {
      console.error("  -> Likely cause: Invalid Airtable Personal Access Token (PAT).");
    } else if (msg.includes("HTTP 404")) {
      console.error("  -> Likely cause: Invalid Airtable Base ID or Base not found.");
    } else if (msg.includes("fetch failed") || msg.includes("timeout") || msg.includes("ENOTFOUND")) {
      console.error("  -> Likely cause: Airtable API is unavailable or network timed out.");
    }
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // 3. Compare schemas
  // -------------------------------------------------------------------------
  const currentHash = generateSchemaHash(liveData.tables);

  const baselineTablesMap = new Map(baseline.tables.map((t) => [t.tableId, t]));
  const liveTablesMap = new Map(liveData.tables.map((t) => [t.id, t]));

  const breakingIssues = [];
  const warnings = [];
  let tablesChecked = 0;
  let fieldsChecked = 0;
  const okTables = [];

  // Check baseline tables against live
  for (const [tableId, baseTable] of baselineTablesMap) {
    tablesChecked++;
    const liveTable = liveTablesMap.get(tableId);

    if (!liveTable) {
      breakingIssues.push({
        tableName: baseTable.tableName,
        details: `Table removed`
      });
      continue;
    }

    let hasTableBreaking = false;
    let hasTableWarning = false;

    // Table renamed
    if (baseTable.tableName !== liveTable.name) {
      warnings.push({
        tableName: liveTable.name,
        details: `Table renamed` // Warning only
      });
      hasTableWarning = true;
    }

    // Table tier changed
    const baseTier = resolveTier(baseTable.tableName, baseTable.tableId).tier;
    const liveTier = resolveTier(liveTable.name, liveTable.id).tier;
    if (baseTier !== liveTier) {
      breakingIssues.push({
        tableName: liveTable.name,
        details: `Table tier changed\n\n${baseTier}\n↓\n\n${liveTier}`
      });
      hasTableBreaking = true;
    }

    // Check fields in the table
    const baseFieldsMap = new Map(baseTable.fields.map((f) => [f.fieldId, f]));
    const liveFieldsMap = new Map(liveTable.fields.map((f) => [f.id, f]));

    for (const [fieldId, baseField] of baseFieldsMap) {
      fieldsChecked++;
      const liveField = liveFieldsMap.get(fieldId);

      if (!liveField) {
        breakingIssues.push({
          tableName: liveTable.name,
          details: `Field removed:\n${fieldId}`
        });
        hasTableBreaking = true;
        continue;
      }

      // Check field renamed
      if (baseField.fieldName !== liveField.name) {
        warnings.push({
          tableName: liveTable.name,
          details: `Field renamed:\n${fieldId}\nOld:\n${baseField.fieldName}\n\nNew:\n${liveField.name}`
        });
        hasTableWarning = true;
      }

      // Check field type changed
      if (baseField.fieldType !== liveField.type) {
        breakingIssues.push({
          tableName: liveTable.name,
          details: `Field type changed\n\n${formatFieldType(baseField.fieldType)}\n↓\n\n${formatFieldType(liveField.type)}`
        });
        hasTableBreaking = true;
      } else {
        // Check readOnly status changed
        const baseReadOnly = isReadOnlyField(baseField.fieldType);
        const liveReadOnly = isReadOnlyField(liveField.type);
        if (baseReadOnly !== liveReadOnly) {
          breakingIssues.push({
            tableName: liveTable.name,
            details: `Field readOnly flag changed\nOld: ${baseReadOnly}\nNew: ${liveReadOnly}`
          });
          hasTableBreaking = true;
        }
      }
    }

    // Check for added fields
    for (const liveField of liveTable.fields) {
      if (!baseFieldsMap.has(liveField.id)) {
        warnings.push({
          tableName: liveTable.name,
          details: `Field added:\n${liveField.id}\nName:\n${liveField.name}`
        });
        hasTableWarning = true;
      }
    }

    if (!hasTableBreaking && !hasTableWarning) {
      const cleanName = liveTable.name.replace(/^\d+\s+/, "").split("/")[0].trim();
      okTables.push(cleanName);
    }
  }

  // Check for added tables
  for (const [tableId, liveTable] of liveTablesMap) {
    if (!baselineTablesMap.has(tableId)) {
      warnings.push({
        tableName: liveTable.name,
        details: `Table added:\n${tableId}`
      });
    }
  }

  // -------------------------------------------------------------------------
  // 4. Output Report
  // -------------------------------------------------------------------------
  console.log("Schema Drift Report");
  console.log("===================");
  console.log(`Baseline hash:  ${baseline.schemaHash}`);
  console.log(`Current hash:   ${currentHash}`);
  console.log(`Tables checked: ${tablesChecked}`);
  console.log(`Fields checked: ${fieldsChecked}`);
  console.log("-------------------");
  console.log("");

  // Sort and print OK tables
  okTables.sort();
  for (const table of okTables) {
    console.log(`✓ ${table}`);
  }
  console.log("");

  // Print Warnings
  if (warnings.length > 0) {
    console.log("WARNING");
    console.log("--------");
    for (const warn of warnings) {
      console.log(warn.details);
      console.log("");
    }
  }

  // Print Breaking Issues
  if (breakingIssues.length > 0) {
    for (const issue of breakingIssues) {
      console.log("BREAKING");
      console.log("--------");
      console.log(issue.tableName);
      console.log("");
      console.log(issue.details);
      console.log("");
    }
  }

  // Final line and exit status
  if (breakingIssues.length > 0) {
    console.log("✗ Breaking schema drift detected");
    process.exitCode = 1;
    return;
  } else {
    console.log("✓ Schema matches baseline");
    return;
  }
}

main().catch((err) => {
  console.error("FATAL: Unhandled error:", cleanErrorMessage(err));
  process.exitCode = 1;
});
