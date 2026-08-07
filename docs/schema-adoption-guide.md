# Schema Adoption Implementation Guide

**Target:** bring all 12 new Airtable tables (28–39) and 193 new fields into School OS
**Data path:** Postgres mirror — Prisma model + `SYNC_CONFIGS` entry per table, matching the existing 27
**Status of the drift itself:** verified additive-only, 0 breaking — see [`schema-drift-2026-08-06.md`](./schema-drift-2026-08-06.md)

---

## Contents

1. [Scope, preconditions, and gate mapping](#1-scope-preconditions-and-gate-mapping)
2. [Phase 1 — Collapse the five inventories](#2-phase-1--collapse-the-five-inventories)
3. [Phase 2 — Re-freeze the baseline](#3-phase-2--re-freeze-the-baseline)
4. [Phase 3 — Data layer](#4-phase-3--data-layer)
5. [Phase 4 — Access layer](#5-phase-4--access-layer)
6. [Phase 5 — Presentation layer](#6-phase-5--presentation-layer)
7. [Phase 6 — Governance updates](#7-phase-6--governance-updates)
8. [Per-table adoption checklist](#8-per-table-adoption-checklist)
9. [Known defects fixed en route](#9-known-defects-fixed-en-route)
10. [Verification](#10-verification)

---

## 1. Scope, preconditions, and gate mapping

### 1.1 What is being adopted

12 tables, 157 new fields in those tables, plus 36 fields added to 11 existing tables.

| # | Table | tableId | Fields | Computed | Links | Proposed tier | Proposed Prisma model |
| :--- | :--- | :--- | ---: | ---: | ---: | :--- | :--- |
| 28 | Backpack Inventory | `tblO38n2QCCEdey10` | 13 | 4 | 1 | T4 | `BackpackInventory` |
| 29 | TTCs | `tblBbv8UPCF6TAYqy` | 15 | 2 | 2 | T3 | `Ttc` |
| 30 | Budget & Targets | `tblRMtJRf9oYfWtqt` | 10 | 2 | 1 | T1 | `BudgetTarget` |
| 31 | Fixed Assets | `tbl5P27dUHrKWOMw2` | 13 | 2 | 3 | T1 | `FixedAsset` |
| 32 | Build-Out Projects | `tblqJGJRambPzTePj` | 13 | 1 | 3 | T1 | `BuildOutProject` |
| 33 | Marketing Campaigns | `tblPSNnBHuyRj9C6N` | 11 | 2 | 2 | T3 | `MarketingCampaign` |
| 34 | Documents | `tbl1JpraNHlYrvYU0` | 11 | 1 | 2 | **T2 PII** | `Document` |
| 35 | Sub-Franchisees (LCF/LSF) | `tblns9BnLFvsJrdOW` | 25 | 3 | 4 | **T2 PII** | `SubFranchisee` |
| 36 | Sub-Franchise Royalties | `tblx5V0x0s6kbr56l` | 13 | 2 | 2 | T1 | `SubFranchiseRoyalty` |
| 37 | SETs (self-employed teachers) | `tbltNBkGhwTiItU6B` | 10 | 0 | 2 | **T2 PII** | `SelfEmployedTeacher` |
| 38 | Minimum Goals | `tblpepGaPbfVlBv74` | 13 | 4 | 0 | T3 | `MinimumGoal` |
| 39 | Franchise Obligations | `tbleVIIZdAmIlFcZS` | 10 | 1 | 0 | T1 | `FranchiseObligation` |
| | **Total** | | **157** | **24** | **22** | | |

Per-field inventories (fieldId, name, type) for all 12 tables and for the 36 added fields are in
[`schema-drift-2026-08-05.md`](./schema-drift-2026-08-05.md) §*Field detail* and §*New fields on
existing tables*. They are verified unchanged as of 2026-08-06 and are **not** reproduced here.

> **Tiers and model names above are proposals, not decisions.** Tier assignment drives redaction
> and role access, so it is an Owner call under gates #4/#5. Model names are suggestions that
> follow the existing PascalCase-singular convention; `SETs` is expanded to `SelfEmployedTeacher`
> deliberately, since `Set` would be a confusing model name.

### 1.2 Gate mapping

Phases are ordered so everything ungated comes first. **Phases 1 and 6 need no gate and can
start immediately.**

| Phase | Blocked by | Notes |
| :--- | :--- | :--- |
| 1 — Collapse inventories | *none* | Pure refactor of existing code. Start here. |
| 6 — Governance updates | *none* | Documentation. Should land early — it is the record the rest is checked against. |
| 2 — Re-freeze baseline | **#6** | `CLAUDE.md` §11: never regenerate without Owner approval. |
| 3 — Data layer | **#2** | Sync needs a real read-only PAT to populate Postgres. |
| 4 — Access layer | **#4/#5**, and **#3** for tables 34/35/37 | Tier + role grants are an Owner decision. |
| 5 — Presentation layer | follows 4 | No independent gate. |
| *Deploy* | **#9** | Nothing ships until authorization to deploy exists. |

### 1.3 Minors' data — gate #3

Three tables need compliance sign-off before they hold data in Postgres, under KG Personal Data
Law No. 97 (2017):

- **34 Documents** — may hold scans of minors' records.
- **35 Sub-Franchisees (LCF/LSF)** — named individuals and franchise partners.
- **37 SETs** — self-employed teachers; personal and tax data.

These three should be the *last* tables mirrored, not the first. Nothing prevents adopting the
other nine ahead of the sign-off.

---

## 2. Phase 1 — Collapse the five inventories

**This phase precedes all table work.** Today the table inventory is hand-maintained in five
places, each keyed differently, with no test asserting they agree:

| Inventory | Location | Key format |
| :--- | :--- | :--- |
| `TIER_MAP` (two byte-identical copies) | `scripts/generate-field-map.mjs:23-60`, `scripts/schema-diff.mjs:18-55` | display-name **substring** |
| `prismaToTableId` | `lib/airtableProxy.ts:81-109` | lowercase model |
| `SYNC_CONFIGS` | `lib/syncEngine.ts:19-~500` | table ID + camelCase model |
| `rbac-matrix.tiers` | `config/rbac-matrix.json:71-77` | PascalCase model |
| `ownerTablesConfig` | `lib/owner-schema.ts:29-587` | lowercase key, camelCase `modelName` |

Adding 12 tables without fixing this means 60 hand edits with nothing to catch a mismatch — and
several of the failure modes in §5 are silent.

### 2.1 Create `lib/table-registry.mjs`

One exported array, **keyed by `tableId`**, as the single source of truth:

```js
export const TABLE_REGISTRY = [
  {
    tableId: "tbl2utdNdP9usMXLf",
    displayName: "01 Branches / Филиалы",
    prismaModel: "Branch",     // PascalCase; lowercase/camelCase derived where needed
    tier: "T4",
    tierName: "Reference",
    flags: {},
  },
  // … 38 more
];
```

Keying by `tableId` rather than a name substring is the point of the exercise — it removes the
entire class of bug described in §9. Include all 39 entries (27 existing + 12 new).

### 2.2 Replace both `TIER_MAP` copies

Delete `TIER_MAP` and `resolveTier()` from `scripts/generate-field-map.mjs` (`:23-60`, `:89-96`)
and `scripts/schema-diff.mjs` (`:18-55`, `:60-67`); import from the shared module instead.
Rewrite the lookup to be ID-keyed and to throw on miss:

```js
export function resolveTier(tableId, tableName) {
  const entry = TABLE_REGISTRY.find((e) => e.tableId === tableId);
  if (!entry) {
    throw new Error(`FATAL: Table "${tableName}" (${tableId}) is not in TABLE_REGISTRY.`);
  }
  return { tier: entry.tier, tierName: entry.tierName };
}
```

Do the same for `TABLE_FLAGS_MAP` / `resolveTableFlags()` (`scripts/generate-field-map.mjs:69-84`),
which has the identical substring weakness but fails open (returns `{}`) rather than throwing.

**Importing `.mjs` from TypeScript already works here** and needs no new plumbing —
`app/api/dashboard/admin/schema-diagnostics/route.ts:61` does exactly this via
`await import("@/lib/fetch-airtable-schema.mjs")` under `moduleResolution: "bundler"`. Note that
`tsconfig.json` `include` does not list `**/*.mjs`, so the module is type-checked only
transitively; add `**/*.mjs` to `include` if you want it checked as a first-class source.

### 2.3 Emit `prismaModel` into `field-map.json`

Have `buildSortedFieldMap()` (`scripts/generate-field-map.mjs:101-167`) write `prismaModel` per
table from the registry. This one change pays for itself three times:

- **Revives `lib/audit.ts`.** `getVisibleFieldIds()` already matches on `t.prismaModel`
  (`lib/audit.ts:277-281`), but no table in `field-map.json` carries that key, so it always
  returns `[]`. Confirmed against `logs/audit.log`: **22,218** entries have `"fieldIds":[]`.
- **Lets `prismaToTableId` become derived.** Build it as a third index alongside `tablesById` /
  `tablesByName` in the loader at `lib/airtableProxy.ts:111-124`, then delete the hard-coded map
  at `:81-109`.
- **Removes the need to derive model names from display names**, which is not mechanically
  possible — `Branches→branch` and `Activities→activity` singularize, but `Attendance→attendance`,
  `Chart of Accounts→account`, and `Notifications Log→notificationlog` do not.

### 2.4 Fix the generator's write-before-validate ordering

`scripts/generate-field-map.mjs` writes both config files at `:388-390` but does not validate
until `:401` and `:410`. A validation failure therefore leaves the frozen config already
overwritten. Move the writes after both validators.

While there: add a `--dry-run` / `--check` flag that prints the would-be output and exits
without writing. Neither script has any CLI flag today (no `process.argv` handling at all), and
Phase 2 needs a safe way to preview a re-freeze.

### 2.5 Add the repo's first test

There is **no test runner, no test file, and no CI workflow** in this repo. `package.json` has
no `test` script. Every refactor in this phase would otherwise land with no regression net.

Add a runner (`vitest` fits the ESM/Next setup), wire `npm test`, and write one
registry-consistency test asserting that all of these describe the same table set:

- `TABLE_REGISTRY`
- `config/field-map.json` tables
- `config/schema-baseline.json` tables
- `config/rbac-matrix.json` `tiers` (union across tiers)
- `SYNC_CONFIGS` (`lib/syncEngine.ts`)
- `ownerTablesConfig` (`lib/owner-schema.ts`) — *expect two known exclusions, see §9*
- Prisma models in `prisma/schema.prisma`

This test is the deliverable that makes the remaining phases safe. Write it before Phase 3.

---

## 3. Phase 2 — Re-freeze the baseline

> **Gate #6. Do not run this without explicit Owner approval.** `CLAUDE.md` §11.

Once §2.2 is done, `generate-field-map.mjs` will no longer throw on tables 28–39 and can
regenerate both artifacts.

```bash
# On a branch, never on a dirty tree — the generator overwrites frozen config.
git checkout -b schema/refreeze-39-tables
git status --porcelain          # must be empty

node scripts/generate-field-map.mjs --dry-run   # once §2.4 adds the flag
node scripts/generate-field-map.mjs

git diff --stat config/
node scripts/schema-diff.mjs                    # expect: ✓ Schema matches baseline, exit 0
```

Expected post-freeze state: **39 tables, 529 fields**, `schemaHash`
`195d377203f9ef81a2a92faf9be780d84a246f71d573ec59b501b13e796183c0`.

> **Do not normalize table or field names before hashing.** Two objects legitimately carry
> `&amp;` in their name as served by the Meta API — table `tblRMtJRf9oYfWtqt` and its link field
> `fldzbf7FuWiT5UyG8` on `01 Branches`. An earlier revision of this guide wrongly described that
> as connector escaping and quoted `ba6a698b…c280d6` as the target hash; that value is incorrect
> and the tooling will never produce it. Full detail in
> [`schema-drift-2026-08-06.md`](./schema-drift-2026-08-06.md) §*Finding 1*.

Review the `config/` diff table by table before committing. The baseline is the deploy gate — a
bad freeze disables drift detection silently.

---

## 4. Phase 3 — Data layer

> Gate #2 (read-only PAT). Tables 34/35/37 additionally gated on #3 — mirror them last.

### 4.1 Prisma models

12 new models in `prisma/schema.prisma`, following the existing convention exactly:

- `id String @id` holding the Airtable `recXXX` — no `@default`.
- Linked records stored as `String[]` id arrays (e.g. `branchIds`), **no Prisma relations**.
- `updatedAt DateTime @updatedAt` last.
- A `// NN Name / Имя` comment immediately above the model.
- Nullable scalars (`String?`, `Float?`, `DateTime?`) for everything except `id` and the primary
  display field.

Worked example — **28 Backpack Inventory** (13 fields: 8 scalar, 4 formula, 1 link):

```prisma
// 28 Backpack Inventory / Инвентарь рюкзаков
model BackpackInventory {
  id                      String    @id
  levelName               String
  totalBackpacks          Float?
  sold                    Float?
  sellingPriceKgs         Float?
  dateReceived            DateTime?
  supplier                String?
  purchaseCostKgs         Float?
  notes                   String?
  // computed in Airtable — mirrored read-only, never written back
  remaining               Float?
  grossProfitPerBackpack  Float?
  relatedServicesRoyalty  Float?
  netProfitPerBackpack    Float?
  branchIds               String[]
  updatedAt               DateTime  @updatedAt
}
```

Then one migration for all 12:

```bash
npx prisma migrate dev --name add_tables_28_39
npx prisma generate
```

### 4.2 `SYNC_CONFIGS` entries

**This is the largest single chunk of the whole adoption: 157 field IDs typed by hand**, 22 of
them link fields. Budget accordingly.

Each entry goes in `lib/syncEngine.ts` `SYNC_CONFIGS` (declared `:19`), using the existing
coercion helpers at `lib/syncEngine.ts:5-16` — `getStr`, `getNum`, `getBool`, `getArr`, `getDate`.

```ts
{
  airtableTableId: "tblO38n2QCCEdey10",
  airtableTable: "28 Backpack Inventory / Инвентарь рюкзаков",
  prismaModel: "backpackInventory",
  mapFields: (id, f) => ({
    id,
    levelName:              getStr(f["fldx5KbfjYmIF1AiN"]) || "Unnamed Level",
    totalBackpacks:         getNum(f["fldhpOnpoEnXXN8RL"]),
    sold:                   getNum(f["fld8aVSU2lg5WzqHR"]),
    sellingPriceKgs:        getNum(f["fldktMnyEsVaF03ii"]),
    dateReceived:           getDate(f["fldBfxbNuTe2xIvFD"]),
    supplier:               getStr(f["fldtuQS6u6Tri48ve"]),
    purchaseCostKgs:        getNum(f["fldtouN3wXqMeVs9V"]),
    notes:                  getStr(f["fldW2aLYeRFRSTvFP"]),
    remaining:              getNum(f["fldwaW8Hsu9r4soBd"]),  // formula
    grossProfitPerBackpack: getNum(f["fldjumjFFrvc0Ze9b"]),  // formula
    relatedServicesRoyalty: getNum(f["fldmPwxp41lxT1lc2"]),  // formula
    netProfitPerBackpack:   getNum(f["fldD6Gs0uL2FsqrtP"]),  // formula
    branchIds:              getArr(f["fldHfOvTMq5n5FXxk"]),
  }),
},
```

Rules for the remaining 11:

- Keep the primary display field non-null with a `|| "Unnamed …"` fallback, matching every
  existing entry.
- Mark every computed field with a trailing `// formula` / `// rollup` / `// count` comment. They
  are mirrored for display but must never be written back — see §7.
- `multipleRecordLinks` → `getArr(...)` into a `…Ids` array.
- Field IDs come from [`schema-drift-2026-08-05.md`](./schema-drift-2026-08-05.md) §*Field detail*.

### 4.3 The 36 fields on existing tables

Separate from the 12 new tables and easy to forget. Eleven existing models need new columns —
`Branch` +7, `User` +5, `TuitionPlan` +5, `Student` +6, `Enrollment` +3, `ClassGroup` +2,
`Lead` +2, `Invoice` +2, `FranchiseRoyalty` +2, `Account` +1, `Vendor` +1 — each with a matching
line added to that table's existing `mapFields` closure.

Two of these change behaviour rather than just adding columns, and are worth flagging to whoever
owns the domain logic:

- **Tuition Plans** gained a discount block (`Discount`, `Discount Type`, `Discount Value`,
  `Discount Reason`, `Net Amount (KGS)`). Any pricing code assuming a single gross amount is now
  incomplete.
- **Invoices** gained `Amount Paid (KGS)` (rollup) and `Balance (KGS)` (formula). Balance is now
  computed at the source rather than derived in the app.

---

## 5. Phase 4 — Access layer

> Gates #4/#5. Tables 34/35/37 additionally gated on #3.

**Ordered by consequence, because two of these fail silently.** Work top to bottom.

### 5.1 `config/rbac-matrix.json` `tiers` — mandatory, blocks everything

Add each new table's PascalCase model name to its tier list (`config/rbac-matrix.json:71-77`).

Without this, `lib/rbac.ts:71` returns `{ allowed: false }` — and that guard sits **before** the
owner branch at `:76`, so the table is denied to **every role including Owner**, despite Owner's
`tables: ["*"]` grant. This is the single gate that makes a new table invisible.

Note the file is parsed once at module load (`lib/rbac.ts:8-9`), so JSON edits need a restart.

Also update each role's `tables` array for documentation consistency — but be aware the entire
`roles` block is currently **dead config**. `lib/rbac.ts` reads only `matrix.tiers`;
`roles[*].tiers`, `.tables`, `.capabilities`, `.genericRenderer`, and `.redactions` are never
read by any code path.

### 5.2 `modelsWithBranchIds` — silent cross-branch leak if missed

Add each new lowercase model name to the list at `lib/rbac.ts:169-174`.

> **A model missing from this list gets `where = {}` — an unscoped, all-branch query.** It does
> not error, it does not warn, it returns every branch's rows to a branch-scoped user. This is
> the most dangerous omission in the entire adoption. Verify it explicitly per table (§10.3).

Tables with a `branchIds` array (all except 38 and 39, which have no link fields) belong here.

### 5.3 Redactions for the three PII tables

`applyRedactions()` (`lib/rbac.ts:241-303`) **does not read `matrix.redactions`** — it is a fixed
cascade of `delete` statements keyed on lowercased table name. A new table therefore gets **zero
redaction by default**, whatever the JSON says.

Add explicit blocks for `document`, `subfranchisee`, and `selfemployedteacher` following the
existing `student` (`:258-263`) and `parent` (`:266-277`) pattern.

Two caveats worth knowing before you write them:

- The owner generic renderer **never calls `applyRedactions`**. `app/api/owner/[table]/route.ts`
  relies on the `select` list built from `config.columns` (`:148-150`) instead — so for that path,
  redaction means simply omitting the column from `ownerTablesConfig` (§6.1).
- The existing implementation already diverges from the JSON (e.g. matrix declares
  `finance.redactions.Student: ["*"]` but the code strips only two fields). Do not assume the JSON
  describes runtime behaviour.

### 5.4 `SENSITIVE_TABLES`

Add 34/35/37 to `app/api/owner/[table]/route.ts:11-26` so their reads audit as `SENSITIVE_ACCESS`
rather than plain `VIEW`.

### 5.5 Hard-coded role allow-lists

`lib/rbac.ts` duplicates two of the matrix's role lists in TypeScript:

| Line | Constant | Must be edited for |
| :--- | :--- | :--- |
| `lib/rbac.ts:93` | smm `allowedTables` | any new table smm should see |
| `lib/rbac.ts:105-109` | teacher `allowedTables` | any new table teacher should see |
| `lib/rbac.ts:29` | `allowedWriteTables` | only if the table becomes writable — **not in Phase 1** |

These duplicate `config/rbac-matrix.json:48` and `:38` and must be edited in tandem.
`finance` and `office_admin` are tier-driven and need only the JSON change.

One asymmetry to note: the smm branch treats T4/T4-RO as auto-granted (`lib/rbac.ts:94`), so a new
T4 table grants smm without touching `:93` — but a new T3 table does not, despite
`roles.smm.tiers` listing `"T3"`.

---

## 6. Phase 5 — Presentation layer

### 6.1 `ownerTablesConfig` — page and API 404 without it

One block per table in `lib/owner-schema.ts` (`ownerTablesConfig`, `:29-587`). Without an entry,
`app/dashboard/owner/[table]/page.tsx:52` renders a "Table Not Found" card (HTTP 200, not a real
404) and `app/api/owner/[table]/route.ts:110-122` returns 404.

Follow the `channelperformance` block (`:560-586`) as the template — it is the closest analogue,
being the one existing read-only table:

- key is **lowercase, no separators**; `modelName` is **camelCase** and must match the Prisma
  accessor exactly (note `channelperformance` → `channelPerformance`).
- set `isReadOnlyTable: true` on all 12 — Phase 1 is read-only.
- omit any column that should be redacted for the roles granted access (see §5.3).
- `columns[].key` must match the Prisma field name; it feeds the `select` at
  `app/api/owner/[table]/route.ts:148-150`.

### 6.2 `lib/ownerTableLookups.ts`

The 22 link fields render as raw record IDs unless resolved. `OwnerTableLookups` (`:4-13`) has 10
fixed lookup kinds; extend it for any new relation target the 12 tables introduce, and add the
resolution query in `resolveOwnerTableLookups()`.

### 6.3 `app/api/data/[table]/route.ts`

Three separate maps need entries: `modelMapping` (`:9-37`, 404s at `:137` without it),
`searchableFields` (`:39-67`), and the `T1_TABLES` / `T2_TABLES` audit classification (`:678-679`).

### 6.4 `components/app-sidebar.tsx`

Add entries to whichever of the five per-role group arrays should surface the table —
`ownerGroups` (`:83-126`), `teacherGroups` (`:128-160`), `officeAdminGroups` (`:162-199`),
`smmGroups` (`:201-220`), `financeGroups` (`:222-245`).

> Sidebar groups are rendered verbatim per role and are **not** filtered by `checkRBAC`. A link
> to a table the role cannot read renders fine and lands on the "Access Restricted" card. Keep
> the sidebar in sync with §5 by hand.

---

## 7. Phase 6 — Governance updates

**Ungated — do this early.** It is the record everything else is checked against.

### 7.1 Write-Forbidden Field Registry — `CLAUDE.md` §5

**35 new computed fields** must be added, none of which are currently listed. 24 are in the new
tables:

| Table | Computed fields |
| :--- | :--- |
| 28 Backpack Inventory | Remaining, Gross Profit per Backpack (KGS), Related Services Royalty 8% (KGS), Net Profit per Backpack (KGS) |
| 29 TTCs | Total Revenue (KGS), Net Revenue (KGS) |
| 30 Budget & Targets | Variance (KGS), Variance % |
| 31 Fixed Assets | Book Value (KGS), Annual Depreciation (KGS) |
| 32 Build-Out Projects | Variance (KGS) |
| 33 Marketing Campaigns | Leads Generated (`count`), Cost per Lead (KGS) |
| 34 Documents | Days to Renewal |
| 35 Sub-Franchisees | Actual Fixed Royalty (Annual, KGS), MF Fee Share to HQ (EUR), In Grace Period? |
| 36 Sub-Franchise Royalties | Balance (KGS), HQ Share (KGS) |
| 38 Minimum Goals | Total Area Students, Gap to Goal, % of Goal, Status |
| 39 Franchise Obligations | Days to Due |

All are `formula` except `Leads Generated` (`count`). The remaining **11** are on existing tables:
Tuition Plans `Net Amount (KGS)`; Students `First Enroll Date` (rollup), `Cohort Month`,
`Age at Withdrawal`; Class Groups `Enrolled Count` (count), `Utilisation %`; Enrollments
`Tenure (months)`; Invoices `Amount Paid (KGS)` (rollup), `Balance (KGS)`; Chart of Accounts
`Balance (KGS)` (rollup); Franchise Royalties `Total Due HQ (EUR)`.

### 7.2 Tier reference — `CLAUDE.md` §4

Add the 12 tables to the tier-to-table mapping once tiers are decided under gates #4/#5.

### 7.3 Airtable automations

`CLAUDE.md` §5 warns against disrupting native automations. Confirm with the Owner whether any of
the 12 new tables are automation-owned before mirroring — table 26 Channel Performance is
precedent (`automationOwned: true, appWritable: false` via `TABLE_FLAGS_MAP`), and any new table
in that category needs the same flag in the registry (§2.2).

---

## 8. Per-table adoption checklist

Run this list **once per table**. Ordered by failure severity — the first two fail loudly, the
third fails *silently*.

| # | Location | Entry needed | Failure if missed |
| :--- | :--- | :--- | :--- |
| 1 | `config/rbac-matrix.json:71-77` `tiers` | PascalCase model | **Denied to every role incl. Owner** (`lib/rbac.ts:71`) |
| 2 | `prisma/schema.prisma` | model + migration | 500 — `prisma[model]` undefined |
| 3 | `lib/rbac.ts:169-174` `modelsWithBranchIds` | lowercase model | ⚠️ **Silent: unscoped, all-branch data** |
| 4 | `lib/owner-schema.ts` `ownerTablesConfig` | full config block | "Table Not Found" card + API 404 |
| 5 | `lib/syncEngine.ts` `SYNC_CONFIGS` | tableId + field map | Postgres mirror stays empty |
| 6 | `lib/table-registry.mjs` (§2.1) | registry entry | Generator throws `FATAL` |
| 7 | `config/field-map.json` / `schema-baseline.json` | regenerated | Drift gate + field lookups stale |
| 8 | `lib/rbac.ts:241-303` `applyRedactions` | block, if PII | ⚠️ **Silent: no redaction applied** |
| 9 | `app/api/owner/[table]/route.ts:11-26` `SENSITIVE_TABLES` | model name, if sensitive | Audited as `VIEW`, not `SENSITIVE_ACCESS` |
| 10 | `app/api/data/[table]/route.ts:9-37` `modelMapping` | model | 404 at `:137` |
| 11 | `app/api/data/[table]/route.ts:39-67` `searchableFields` | field list | Search returns nothing |
| 12 | `app/api/data/[table]/route.ts:678-679` `T1_TABLES`/`T2_TABLES` | classification | Wrong audit tier |
| 13 | `lib/rbac.ts:93` smm `allowedTables` | if smm should see it | smm denied (T3 tables only) |
| 14 | `lib/rbac.ts:105-109` teacher `allowedTables` | if teacher should see it | teacher denied |
| 15 | `lib/ownerTableLookups.ts:4-13` | if it has link fields | Raw record IDs rendered |
| 16 | `components/app-sidebar.tsx:83-245` | nav entry per role | Not discoverable |
| 17 | `CLAUDE.md` §5 | computed fields | Write-forbidden registry incomplete |
| 18 | `CLAUDE.md` §4 | tier row | Tier reference incomplete |
| 19 | Registry-consistency test (§2.5) | assertion passes | No net under the other 18 |

Items 6, 7, and 19 are one-time-per-batch rather than strictly per-table. Items 1–5 are the
minimum for a table to load at all.

---

## 9. Known defects fixed en route

These are pre-existing bugs the adoption work touches. Fix them deliberately rather than
absorbing them into "adoption work" — each is independently verifiable.

| Defect | Location | Fix |
| :--- | :--- | :--- |
| `resolveTier` substring match; `36 Sub-Franchise Royalties` silently resolves to T1 by matching `Franchise Royalties` | `scripts/generate-field-map.mjs:89-96`, `scripts/schema-diff.mjs:60-67` | ID-keyed lookup (§2.2) |
| `resolveTier` comment claims case-insensitive; `String.includes` is case-sensitive | same | Fixed by §2.2 |
| Config written before validation — a validation failure leaves frozen config overwritten | `scripts/generate-field-map.mjs:388-390` vs `:401,410` | Reorder (§2.4) |
| `getVisibleFieldIds()` always returns `[]` — matches `t.prismaModel`, which no table has. 22,218 audit entries affected | `lib/audit.ts:277-281` | Emit `prismaModel` (§2.3) |
| Dead mojibake alias `"Normal Side / Но保留"` matching nothing in the base; correct name already inserted by the loop above | `lib/airtableProxy.ts:192` | Delete the line |
| `ownerTablesConfig` has 25 keys, not 27 — `payment` and `notificationlog` absent, so `/dashboard/owner/payment` renders "Table Not Found" | `lib/owner-schema.ts` | Confirm intentional (both have bespoke pages) before mirroring the pattern |
| `isAppendOnlyTable` declared but never used anywhere in the config | `lib/owner-schema.ts:17-27` | Apply to `notificationlog`, or drop |
| Diagnostics route re-implements the diff and misses removed fields, added fields, renames, readOnly and tier changes; returns 200 with a clean-looking empty diff when Airtable is unreachable | `app/api/dashboard/admin/schema-diagnostics/route.ts:79-117` | Delegate to shared diff logic |
| `resolveTable()` substring fallback is order-dependent on table IDs | `lib/airtableProxy.ts:156-161` | Tighten alongside §2.3 |

---

## 10. Verification

Verify **per phase**, not once at the end.

### 10.1 After Phase 1 (no gate)

```bash
npm test                                  # registry-consistency test passes
node scripts/schema-diff.mjs              # still 48 warnings, exit 0 — refactor changed nothing
grep -rn "TIER_MAP" scripts/ lib/         # only the shared module remains
```

Confirm `resolveTier` now throws on an unknown **ID**, and that `36 Sub-Franchise Royalties` no
longer resolves by substring.

### 10.2 After Phase 2 (gate #6)

```bash
node scripts/schema-diff.mjs              # ✓ Schema matches baseline, exit 0
```

Confirm 39 tables / 529 fields and hash `195d3772…6183c0`. Confirm `field-map.json` now carries
`prismaModel` on every table, and that `getVisibleFieldIds()` returns non-empty for a known model.

### 10.3 After Phase 4 — branch scoping, per table

The silent failure in §5.2 needs an explicit test, not a code read. For each new table, sign in as
a branch-scoped role (the seeded `office_admin` account — see `CLAUDE.md` §8.3 for test
credentials) and confirm the row count is *lower* than the Owner's for the same table. Equal
counts mean `modelsWithBranchIds` is missing the model and every branch's data is being returned.

### 10.4 After Phase 5 — end to end

```bash
npm run dev
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8002/login    # 200
```

Then per table: log in as Owner, load `/dashboard/owner/<table>`, confirm rows render, link fields
show names rather than `rec…` IDs, and computed columns display. Log in as each granted role and
confirm both the allow and the deny paths. Check `logs/audit.log` records `SENSITIVE_ACCESS` for
34/35/37 with a non-empty `fieldIds` array.

### 10.5 Standing

`node scripts/schema-diff.mjs` remains the pre-deploy gate and the daily production check. After
the re-freeze it should return to exit 0 with **zero** warnings; any new warning is genuine drift.

---

*Schema metadata only — no student, parent, or payment record data is read or recorded here.*
*Nothing in this guide authorizes a deploy (gate #9) or a baseline re-freeze (gate #6).*
