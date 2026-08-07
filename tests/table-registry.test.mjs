/**
 * tests/table-registry.test.mjs
 *
 * Consistency net for the table inventory.
 *
 * The inventory used to be hand-maintained in five places, each keyed
 * differently, with nothing asserting they agreed. lib/table-registry.mjs is now
 * the single source of truth; this test asserts every other inventory still
 * lines up with it.
 *
 * Several of the failure modes it guards are silent at runtime — a model missing
 * from rbac-matrix is denied to every role including Owner, and a table missing
 * from the registry cannot be tiered at all.
 *
 * Run with: npm test   (node:test, no external dependencies)
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  TABLE_REGISTRY,
  resolveTier,
  resolveTableFlags,
  buildPrismaToTableId,
} from "../lib/table-registry.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");
const readJson = (p) => JSON.parse(read(p));

const VALID_TIERS = new Set(["T1", "T2", "T3", "T4", "T4-RO"]);

// Ratified = tier and model signed off by the Owner. Proposed entries (tables
// 28-39) are deliberately absent from the frozen config until gates #4/#5 clear.
const ratified = TABLE_REGISTRY.filter((e) => !e.proposed);
const proposed = TABLE_REGISTRY.filter((e) => e.proposed);

const lower = (s) => s.toLowerCase();
const sorted = (a) => [...a].sort();

/** ownerTablesConfig entries that intentionally do not exist (bespoke pages). */
const OWNER_CONFIG_EXCLUSIONS = new Set(["payment", "notificationlog"]);

describe("registry integrity", () => {
  test("table IDs are well-formed and unique", () => {
    for (const e of TABLE_REGISTRY) {
      assert.match(e.tableId, /^tbl[A-Za-z0-9]{14}$/, `bad tableId: ${e.tableId}`);
    }
    const ids = TABLE_REGISTRY.map((e) => e.tableId);
    assert.equal(new Set(ids).size, ids.length, "duplicate tableId in registry");
  });

  test("Prisma model names are unique and PascalCase", () => {
    const models = TABLE_REGISTRY.map((e) => e.prismaModel);
    assert.equal(new Set(models).size, models.length, "duplicate prismaModel in registry");
    for (const m of models) {
      assert.match(m, /^[A-Z][A-Za-z0-9]*$/, `prismaModel not PascalCase: ${m}`);
    }
  });

  test("every entry has a valid tier", () => {
    for (const e of TABLE_REGISTRY) {
      assert.ok(VALID_TIERS.has(e.tier), `${e.displayName} has invalid tier ${e.tier}`);
      assert.ok(e.tierName, `${e.displayName} has no tierName`);
    }
  });

  test("resolveTier is ID-keyed and throws on unknown tables", () => {
    const first = TABLE_REGISTRY[0];
    assert.equal(resolveTier(first.tableId, first.displayName).tier, first.tier);
    assert.throws(
      () => resolveTier("tblDoesNotExist99", "Nope"),
      /not in TABLE_REGISTRY/,
      "unknown table must throw, never silently acquire a tier"
    );
  });

  test("tier resolution does not depend on display-name substrings", () => {
    // Regression: "36 Sub-Franchise Royalties" contains "Franchise Royalties",
    // so the old substring matcher silently resolved it to T1 instead of raising.
    const sub = TABLE_REGISTRY.find((e) => e.displayName.includes("Sub-Franchise Royalties"));
    const parent = TABLE_REGISTRY.find((e) => e.displayName.startsWith("22 Franchise Royalties"));
    assert.ok(sub && parent, "both royalty tables should be present");
    assert.notEqual(sub.tableId, parent.tableId);
    assert.equal(resolveTier(sub.tableId, sub.displayName).tier, sub.tier);
    assert.equal(resolveTier(parent.tableId, parent.displayName).tier, parent.tier);
  });

  test("table flags resolve by ID and default to {}", () => {
    const cp = TABLE_REGISTRY.find((e) => e.prismaModel === "ChannelPerformance");
    assert.deepEqual(resolveTableFlags(cp.tableId), { automationOwned: true, appWritable: false });
    const nl = TABLE_REGISTRY.find((e) => e.prismaModel === "NotificationLog");
    assert.deepEqual(resolveTableFlags(nl.tableId), { appendOnly: true });
    assert.deepEqual(resolveTableFlags("tblDoesNotExist99"), {});
  });

  test("buildPrismaToTableId covers every entry", () => {
    const map = buildPrismaToTableId();
    assert.equal(Object.keys(map).length, TABLE_REGISTRY.length);
    for (const e of TABLE_REGISTRY) {
      assert.equal(map[lower(e.prismaModel)], e.tableId);
    }
  });
});

describe("registry agrees with frozen config", () => {
  test("ratified entries match config/schema-baseline.json exactly", () => {
    const baseline = readJson("config/schema-baseline.json");
    assert.deepEqual(
      sorted(baseline.tables.map((t) => t.tableId)),
      sorted(ratified.map((e) => e.tableId)),
      "schema-baseline tables must equal the ratified registry entries"
    );
  });

  test("ratified entries match config/field-map.json exactly", () => {
    const fm = readJson("config/field-map.json");
    assert.deepEqual(
      sorted(Object.keys(fm.tables)),
      sorted(ratified.map((e) => e.tableId)),
      "field-map tables must equal the ratified registry entries"
    );
  });

  test("display names agree with the baseline", () => {
    const baseline = readJson("config/schema-baseline.json");
    for (const t of baseline.tables) {
      const entry = TABLE_REGISTRY.find((e) => e.tableId === t.tableId);
      assert.ok(entry, `baseline table ${t.tableId} missing from registry`);
      assert.equal(entry.displayName, t.tableName, `display name drift for ${t.tableId}`);
    }
  });

  test("proposed tables are absent from frozen config", () => {
    // Guards against a premature re-freeze baking unratified tiers into the
    // deploy gate. Flip when gates #4/#5 clear and `proposed` is dropped.
    const baselineIds = new Set(readJson("config/schema-baseline.json").tables.map((t) => t.tableId));
    const fmIds = new Set(Object.keys(readJson("config/field-map.json").tables));
    for (const e of proposed) {
      assert.ok(!baselineIds.has(e.tableId), `${e.displayName} is proposed but already in the baseline`);
      assert.ok(!fmIds.has(e.tableId), `${e.displayName} is proposed but already in field-map`);
    }
  });
});

describe("registry agrees with the access layer", () => {
  const rbac = readJson("config/rbac-matrix.json");
  const rbacTierOf = new Map();
  for (const [tier, tables] of Object.entries(rbac.tiers)) {
    for (const name of tables) rbacTierOf.set(lower(name), tier);
  }

  test("ratified models match config/rbac-matrix.json tiers exactly", () => {
    // A model missing here is denied to EVERY role including Owner, because the
    // !tableTier guard in lib/rbac.ts precedes the owner branch.
    assert.deepEqual(
      sorted([...rbacTierOf.keys()]),
      sorted(ratified.map((e) => lower(e.prismaModel))),
      "rbac-matrix tiers must equal the ratified registry models"
    );
  });

  test("tier assignments agree between registry and rbac-matrix", () => {
    for (const e of ratified) {
      assert.equal(rbacTierOf.get(lower(e.prismaModel)), e.tier, `tier mismatch for ${e.prismaModel}`);
    }
  });

  test("proposed models are not yet granted in rbac-matrix", () => {
    for (const e of proposed) {
      assert.ok(!rbacTierOf.has(lower(e.prismaModel)), `${e.prismaModel} granted before Owner sign-off`);
    }
  });
});

describe("registry agrees with the data layer", () => {
  test("every ratified model has a Prisma model", () => {
    const schema = read("prisma/schema.prisma");
    const models = new Set([...schema.matchAll(/^model\s+(\w+)\s*\{/gm)].map((m) => m[1]));
    for (const e of ratified) {
      assert.ok(models.has(e.prismaModel), `no Prisma model for ${e.prismaModel}`);
    }
  });

  test("ratified table IDs match SYNC_CONFIGS exactly", () => {
    const src = read("lib/syncEngine.ts");
    const ids = [...src.matchAll(/airtableTableId:\s*"(tbl[A-Za-z0-9]{14})"/g)].map((m) => m[1]);
    assert.equal(new Set(ids).size, ids.length, "duplicate airtableTableId in SYNC_CONFIGS");
    assert.deepEqual(
      sorted(ids),
      sorted(ratified.map((e) => e.tableId)),
      "SYNC_CONFIGS must cover exactly the ratified registry entries"
    );
  });

  test("SYNC_CONFIGS prismaModel agrees with the registry", () => {
    const src = read("lib/syncEngine.ts");
    const pairs = [
      ...src.matchAll(
        /airtableTableId:\s*"(tbl[A-Za-z0-9]{14})"[\s\S]{0,400}?prismaModel:\s*"(\w+)"/g
      ),
    ];
    assert.equal(pairs.length, ratified.length, "could not parse every SYNC_CONFIGS entry");
    for (const [, tableId, model] of pairs) {
      const entry = TABLE_REGISTRY.find((e) => e.tableId === tableId);
      assert.equal(lower(model), lower(entry.prismaModel), `SYNC_CONFIGS model mismatch for ${tableId}`);
    }
  });
});

describe("registry agrees with the presentation layer", () => {
  test("ownerTablesConfig keys are all known models", () => {
    const src = read("lib/owner-schema.ts");
    const body = src.slice(src.indexOf("ownerTablesConfig"));
    const keys = [...body.matchAll(/^ {2}(\w+):\s*\{$/gm)].map((m) => m[1]);
    assert.ok(keys.length > 0, "failed to parse ownerTablesConfig keys");

    const known = new Set(ratified.map((e) => lower(e.prismaModel)));
    for (const k of keys) {
      assert.ok(known.has(k), `ownerTablesConfig key '${k}' is not a known ratified model`);
    }

    // Documented gap: payment and notificationlog have bespoke pages instead.
    const missing = [...known].filter((m) => !keys.includes(m));
    assert.deepEqual(
      sorted(missing),
      sorted([...OWNER_CONFIG_EXCLUSIONS]),
      "ownerTablesConfig coverage changed - update OWNER_CONFIG_EXCLUSIONS deliberately"
    );
  });

  test("modelsWithBranchIds only lists known models", () => {
    // A model missing from this list gets `where = {}` - an unscoped,
    // all-branch query. It fails silently, so keep the list honest.
    const src = read("lib/rbac.ts");
    const block = src.slice(src.indexOf("const modelsWithBranchIds"));
    const listed = [...block.slice(0, block.indexOf("]")).matchAll(/"(\w+)"/g)].map((m) => m[1]);
    assert.ok(listed.length > 0, "failed to parse modelsWithBranchIds");

    const known = new Set(ratified.map((e) => lower(e.prismaModel)));
    for (const m of listed) {
      assert.ok(known.has(m), `modelsWithBranchIds lists unknown model '${m}'`);
    }
  });
});

describe("column references resolve against the Prisma schema", () => {
  /** model name (any case) -> Set of column names */
  const prismaCols = new Map();
  {
    const schema = read("prisma/schema.prisma");
    for (const m of schema.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
      const cols = new Set([...m[2].matchAll(/^ {2}(\w+)\s/gm)].map((x) => x[1]));
      prismaCols.set(m[1].toLowerCase(), cols);
    }
  }

  test("ownerTablesConfig column keys exist on their model", () => {
    // These keys build the Prisma `select` at app/api/owner/[table]/route.ts:148-150,
    // so an unknown key is a runtime failure, not a cosmetic one.
    const src = read("lib/owner-schema.ts");
    const body = src.slice(src.indexOf("ownerTablesConfig"));
    for (const block of body.matchAll(/^ {2}(\w+): \{\n([\s\S]*?)^ {2}\}/gm)) {
      const key = block[1];
      const model = /modelName:\s*"(\w+)"/.exec(block[2])?.[1];
      if (!model) continue;
      const cols = prismaCols.get(model.toLowerCase());
      assert.ok(cols, `ownerTablesConfig.${key} names unknown model '${model}'`);
      for (const c of block[2].matchAll(/key:\s*"(\w+)"/g)) {
        assert.ok(cols.has(c[1]), `ownerTablesConfig.${key}: column '${c[1]}' not on model ${model}`);
      }
    }
  });

  test("data route searchableFields exist on their model", () => {
    const src = read("app/api/data/[table]/route.ts");
    const block = src.slice(src.indexOf("const searchableFields"));
    const body = block.slice(0, block.indexOf("\n};"));
    for (const entry of body.matchAll(/^ {2}(\w+):\s*\[([^\]]*)\]/gm)) {
      const model = entry[1];
      const cols = prismaCols.get(model.toLowerCase());
      if (!cols) continue; // camelCase key may not name a model directly
      for (const f of entry[2].matchAll(/"(\w+)"/g)) {
        assert.ok(cols.has(f[1]), `searchableFields.${model}: column '${f[1]}' not on that model`);
      }
    }
  });

  test("modelsWithBranchIds entries actually have a branchIds column", () => {
    const src = read("lib/rbac.ts");
    const block = src.slice(src.indexOf("const modelsWithBranchIds"));
    const listed = [...block.slice(0, block.indexOf("]")).matchAll(/"(\w+)"/g)].map((m) => m[1]);
    for (const m of listed) {
      const cols = prismaCols.get(m);
      assert.ok(cols, `modelsWithBranchIds lists unknown model '${m}'`);
      assert.ok(cols.has("branchIds"), `model '${m}' is branch-scoped but has no branchIds column`);
    }
  });

  test("every model WITH branchIds is branch-scoped", () => {
    // The dangerous direction: a model that has branchIds but is absent from the
    // list returns every branch's rows, silently.
    const src = read("lib/rbac.ts");
    const block = src.slice(src.indexOf("const modelsWithBranchIds"));
    const listed = new Set(
      [...block.slice(0, block.indexOf("]")).matchAll(/"(\w+)"/g)].map((m) => m[1])
    );
    const appOnly = new Set(["auditlog", "usersecret", "usersession", "expenseapproval", "branch"]);
    for (const [model, cols] of prismaCols) {
      if (!cols.has("branchIds") || appOnly.has(model)) continue;
      assert.ok(listed.has(model), `model '${model}' has branchIds but is not in modelsWithBranchIds — queries would be unscoped`);
    }
  });
});

describe("no stale duplicate inventories", () => {
  test("TIER_MAP no longer exists in either script", () => {
    for (const p of ["scripts/generate-field-map.mjs", "scripts/schema-diff.mjs"]) {
      assert.ok(!read(p).includes("TIER_MAP"), `${p} still defines TIER_MAP`);
    }
  });

  test("airtableProxy no longer hard-codes table IDs", () => {
    const src = read("lib/airtableProxy.ts");
    const ids = [...src.matchAll(/"tbl[A-Za-z0-9]{14}"/g)];
    assert.equal(ids.length, 0, "lib/airtableProxy.ts still contains hard-coded table IDs");
  });
});
