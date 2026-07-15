# Phase 0 Baseline Documentation

This document serves as the permanent baseline reference for the School OS Dashboard application. It defines the structural and security rules established during Phase 0 (Discovery & Baseline) and acts as the single source of truth for the Airtable base schema, sensitivity tiers, role-based access control (RBAC) rules, and operational constraints.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Baseline Artifacts](#2-baseline-artifacts)
3. [Airtable Base Information](#3-airtable-base-information)
4. [Schema Freeze](#4-schema-freeze)
5. [Sensitivity Tier Classification](#5-sensitivity-tier-classification)
6. [RBAC Matrix](#6-rbac-matrix)
7. [Branch Scoping](#7-branch-scoping)
8. [Load-Bearing Airtable Logic](#8-load-bearing-airtable-logic)
9. [Existing Airtable Automations](#9-existing-airtable-automations)
10. [Seat Reduction Strategy](#10-seat-reduction-strategy)
11. [Security Assumptions](#11-security-assumptions)
12. [Acceptance Criteria](#12-acceptance-criteria)
13. [Future Maintenance](#13-future-maintenance)

---

## 1. Overview

### Purpose of Phase 0
Phase 0 establishes a frozen, machine-readable picture of the Airtable base schema. The purpose is to map all tables, fields, and types to stable identifiers, define sensitivity tiers for data isolation, and build drift detection scripts before application development or deployments begin.

### Why Schema Freezing Exists
Airtable base structure is flexible and can be modified by base administrators at any time. A schema freeze locks down the expectations of the application code so that out-of-band Airtable changes do not cause runtime errors, field mismatches, or security bypasses.

### Why Schema Drift Detection Exists
Drift detection acts as a gatekeeper. By comparing the live base structure against a frozen baseline before application start or deployment, the system can fail fast (exiting with code `1`) on breaking changes (e.g. field deletions or type mutations) before they affect production users.

### Field ID vs. Label Rendering
In Airtable, display names (labels) are highly mutable, prone to renaming, and bilingual (English/Russian/Kyrgyz). If the codebase relied on names like `"Course Name"`, a minor typo correction or translations change in Airtable would break the application. By rendering and keying all logic on **Field IDs** (e.g. `fldABC123`), the codebase remains completely decoupled from cosmetic display changes.

### Zero PII Discovery
Phase 0 was executed as a metadata-only process. By design, no table records or PII (Personally Identifiable Information) were fetched, cached, or committed to Git. This respects the privacy of minor students and ensures high compliance with personal data laws.

---

## 2. Baseline Artifacts

This project contains several dedicated artifacts produced during Phase 0 to manage schema mapping and drift detection:

| Artifact | Purpose | Owner | Regenerated When | Committed to Git? |
| :--- | :--- | :--- | :--- | :--- |
| [`config/field-map.json`](config/field-map.json) | Maps stable Field IDs to field metadata (types, read-only status, table tiers) for rendering. | Developer / Automation | Upon approved schema change | **Yes** |
| [`config/schema-baseline.json`](config/schema-baseline.json) | Stores the frozen baseline schema, fields list, and `schemaHash` for drift checks. | Developer / CI Runner | Upon approved schema change | **Yes** |
| [`scripts/generate-field-map.mjs`](scripts/generate-field-map.mjs) | Generates `field-map.json` and `schema-baseline.json` from the live Airtable Meta API. | Developer | Manually after approved base schema changes | **Yes** |
| [`scripts/schema-diff.mjs`](scripts/schema-diff.mjs) | Compares live Airtable metadata against the baseline; exits `1` on breaking drift. | CI / Daily Timer | In CI pipelines, pre-start hooks, and daily timers | **Yes** |
| [`docs/phase-0-baseline.md`](docs/phase-0-baseline.md) | Single source of truth baseline reference document inside the repository (this file). | Lead Developer / Security | Manually upon approved baseline changes | **Yes** |

---

## 3. Airtable Base Information

The frozen baseline corresponds to the following Airtable base details:

* **Base ID**: `appT1VyuwHzKGhOId`
* **Total Tables**: 27
* **Total Fields**: 336
* **Read-only Computed Fields**: 13 specific fields explicitly resolved as readOnly (including Formula, Rollup, Lookup, and Count field types).
* **Metadata-Only Discovery Process**: The base structure was extracted using the Airtable Meta API endpoint (`/v0/meta/bases/{baseId}/tables`) using a read-only Personal Access Token (PAT) with limited scopes (`schema.bases:read` and `data.records:read`), completely bypassing table records and preventing any PII exposure.

---

## 4. Schema Freeze

The schema freeze mechanism guarantees structure predictability through a combination of verification checks:

```
[Airtable Base] ──(Meta API)──> [scripts/schema-diff.mjs] <── [config/schema-baseline.json]
                                         │
                                         ├── Hash match? ──> Yes ──> Start / Deploy (Exit 0)
                                         └── Hash mismatch?
                                                 │
                                                 ├── Breaking? ──> Yes ──> Fail Deploy (Exit 1)
                                                 └── Warning only? ──> Warning report (Exit 0)
```

### Schema Hash (`schemaHash`)
A deterministic SHA-256 hash is calculated by sorting all table IDs, sorting field IDs within each table, and hashing their IDs, names, and types. This hash changes if any structural mutations (field name changes, type changes, removals, additions) occur.

### Drift Detection Workflow
Before startup or deployment, the `scripts/schema-diff.mjs` script:
1. Fetches the live Airtable metadata via `fetchBaseSchema()`.
2. Computes the live `schemaHash`.
3. If the hashes match, it completes successfully.
4. If there is a mismatch, it conducts a detailed element-by-element comparison to compile a drift report.

### Validation Gates
* **CI Validation**: The CI/CD deployment pipeline executes `scripts/schema-diff.mjs` as a blocking step. If the script detects breaking changes, it exits with code `1`, halting the deploy.
* **Daily Validation**: A systemd timer triggers `schema-diff.mjs` daily in production. Any out-of-band schema changes made directly in Airtable by administrators trigger alerts.

---

## 5. Sensitivity Tier Classification

All tables in the Airtable base are classified into one of five Sensitivity Tiers. Tiers govern access rights and API boundaries:

### Tier 1: Financial / HQ-only
* **Tables**:
  * `17 Chart of Accounts / План счетов` (`tblLkuBm7zVJKpzzu`)
  * `18 Journal Entries / Журнальные записи` (`tblRf3mdeZmzp2mnf`)
  * `19 Ledger Lines / Проводки` (`tbl0A506K9OVCorYv`)
  * `20 Vendors / Поставщики` (`tblAu08dz4NZJ5HDs`)
  * `21 Expenses / Расходы` (`tblZPcDPnzTxp0sol`)
  * `22 Franchise Royalties / Роялти франшизы` (`tbl2YiFYDq00gJIrF`)
  * `23 Teacher Pay / Оплата преподавателям` (`tblGVA0enM9oxS9C0`)
  * `24 Teacher Hours / Часы преподавателей` (`tblcOJdLkCBXXJ3AL`)
* **Rules**: Highly restricted. Restricted to Owner and Finance roles only. Represents double-entry financial ledger lines, expenses, payrolls, and royalties. Append-only ledger rules apply. Never exposed publicly.

### Tier 2: PII
* **Tables**:
  * `02 Users / Сотрудники` (`tblUkEhqFJBFTvRN5`)
  * `09 Parents / Родители` (`tblRJNw4S6o1WPjBI`)
  * `10 Students / Ученики` (`tbl9Ddw4uRQ3i6e1B`)
  * `12 Enrollments / Зачисления` (`tblVA5O7fnBx5cAnJ`)
  * `15 Invoices / Счета` (`tblTB6N6jNqSFvEER`)
  * `16 Payments / Платежи` (`tbliFcGpMbqnMaD9S`)
  * `27 Notifications Log / Журнал уведомлений` (`tblMsyDxS6ltliuU1`)
* **Rules**: Contains personal data (names, contact detail fields, dates of birth). Access requires active authentication, role clearance, and strict branch-scoping filters. Date of Birth is redacted where not explicitly needed.

### Tier 3: Operational
* **Tables**:
  * `05 Terms / Учебные периоды` (`tblVSaneGtUOq5Xzr`)
  * `06 Rooms / Кабинеты` (`tblunCF2EX30onveH`)
  * `07 Leads / Лиды` (`tblItZ3B7d4YRO9ih`)
  * `08 Trials / Пробные уроки` (`tblfvl5TjmWtr24Yp`)
  * `11 Class Groups / Группы` (`tblpUJni7tMvO2QBs`)
  * `13 Sessions / Занятия` (`tblUE4gfr8en6lfUS`)
  * `14 Attendance / Посещаемость` (`tblbOAIuMZHgtsjEP`)
  * `25 Activities / Действия` (`tblbGzoGxZVLRPB7k`)
* **Rules**: Operational metadata for daily scheduling, attendance, lead generation, and trial runs. Scoped by branch, and where applicable, restricted by class assignments (for teachers). Read-only in Phase 1.

### Tier 4-RO: Analytics (Automation-Owned)
* **Tables**:
  * `26 Channel Performance / Эффективность каналов` (`tblJQ9zndF47zIBVg`)
* **Rules**: Analytics and metrics populated by a nightly recalculation automation. Read-only access only. Never written directly by the app.

### Tier 4: Reference / Low-risk
* **Tables**:
  * `01 Branches / Филиалы` (`tbl2utdNdP9usMXLf`)
  * `03 Courses / Курсы` (`tblgvltY5JtmMZs1q`)
  * `04 Tuition Plans / Тарифные планы` (`tbldiIHLyH7bup2XG`)
* **Rules**: Low-risk reference tables. Contains names of branches, courses catalog, and tuition pricing tiers. Used for general app rendering. Parent Portal ready.

---

## 6. RBAC Matrix

The role-based access control (RBAC) matrix outlines which tiers and tables are visible to each user role. 

> [!IMPORTANT]
> **Phase 1 Enforce Read-Only Gate**: During Phase 1, all user capabilities are capped at **READ** regardless of their operational write intent. No write paths to Airtable exist in Phase 1.

| Role | Permitted Sensitivity Tiers | Branch Scope | Dashboard Visibility | Key Restrictions / Redactions |
| :--- | :--- | :--- | :--- | :--- |
| **Owner** | All Tiers (T1, T2, T3, T4, T4-RO) | All Branches | Full CRM Command Center, HQ Dashboards | None |
| **Finance** | T1, T2, T4 | Allowed Branches | Financial Reports, General Ledger, Payroll, Invoices | Redacted: Student detail view (`Student` -> `*`), Parent contact info (phones, emails). |
| **Office Admin**| T2, T3, T4, T4-RO | Own Branch | Branch Schedule, Leads, Attendance, Local Invoices | Redacted: Financial tables (`Account`, `JournalEntry`, `LedgerLine`, `Vendor`, `Expense`, `FranchiseRoyalty`, `TeacherPay`, `TeacherHours` -> `*`). |
| **Teacher** | T4, Limited T2/T3 | Own Classes | Schedules, Attendance sheets, Assigned Students | Redacted: Student DOB/medical notes, Parent contact info, and all financial tables. |
| **SMM** | T3, T4, T4-RO | Own Branch | Leads, Trial logs, Channel Performance metrics | Redacted: Payment data (`Payment` -> `*`), Student medical notes, Parent contact info. |
| **Tech Admin** | T4 | System Only | Break-glass metadata renderer only | Redacted: All record details (Student, Parent, Invoice, Payment, User tables -> `*`). |
| **Cleaner** | *Excluded* | None | No access permitted | Not registered in SQLite authentication store. |

---

## 7. Branch Scoping

Data queries in the application must always be branch-constrained server-side before execution:

* **Owner**: Unconstrained bypass. Can view all branches.
* **Finance**: Constrained by a list of allowed branch record IDs.
* **Office Admin**: Constrained strictly to their own branch record ID.
* **Teacher**: Scoped by the class groups/sessions linked to their teacher record, additionally filtered by branch.
* **SMM**: Filtered by their own branch record ID.
* **Tech Admin**: Bypassed for schema inspection, but blocked from viewing any record contents.

### Why Server-Side Branch Scoping is Critical
Branch isolation must never rely on client-side routing filters. A franchise branch operator in Branch A must never be able to request or inspect record data from Branch B. Branch scoped record filters are hardcoded into the server-side queries using record links, establishing a secure tenant model.

---

## 8. Load-Bearing Airtable Logic

Developers must respect the architectural constraints of the Airtable database logic. The application must never attempt to write to computed fields or violate the balance constraints.

### Computed Fields (Read-Only)
The following fields are computed (Formula, Rollup, Lookup, or Count) and are read-only:
* **Students $\rightarrow$ Age**: Calculated automatically via formula.
* **Leads $\rightarrow$ Days Since Last Activity / Stale Flag**: Auto-calculated based on activity dates.
* **Payments $\rightarrow$ Month**: Extracted from payment dates.
* **Ledger Lines $\rightarrow$ Amount (signed)**: Double-entry leg sign formula (Debit − Credit).
* **Teacher Pay $\rightarrow$ Computed Pay**: Auto-calculated pay based on hours and rates.
* **Channel Performance $\rightarrow$ KPI Metrics**: Show rates and close rates.

### Channel Performance Table
* Populated via a nightly automated routine.
* Exclusively read-only; the application must never attempt manual writes or additions.
* Automation performs upserts based on `Row Key` (concatenation of Month + Channel + Branch).

### Leads Activity Migration
* The `07 Leads $\rightarrow$ Last Activity Date` rollup conversion is complete (resolved as a rollup over `25 Activities`).
* **Blank-safe logic**: If no activities exist, the date defaults to empty. The code must handle null/empty values safely without crashing.

### Ledger Balance Constraints
* **Append-only Accounting**: Financial ledger records are append-only. Once a row is written, it can never be deleted or updated.
* **Double-Entry Verification**: Every `Journal Entry` must balance: $\Sigma(\text{Debit} - \text{Credit}) = 0$ across its linked `Ledger Lines`.
* **Locking**: Posted journal entries are locked. Any adjustments or corrections must be entered as new reversing journal entries.

---

## 9. Existing Airtable Automations

Airtable runs native automations that the application must respect:
* **Nightly Recalculation**: Recomputes performance metrics on the `Channel Performance` table.
* **Lead Activity Tracking**: Automatically recalculates days elapsed since last activity when activities are linked.
* **Stale Alerts**: Marks lead records as stale after a threshold, triggering notification emails.
* **Summarization**: Gathers class attendances into course level summaries.

The application must **never** modify the tables or trigger conditions in a way that disrupts these built-in Airtable automation scripts.

---

## 10. Seat Reduction Strategy

Airtable licenses are billed per seat. With hundreds of external users (e.g. parents, teachers, and part-time staff) who only need basic dashboards, purchasing individual Airtable seats would be prohibitively expensive.

* **Single Server PAT**: Only the server's Personal Access Token (PAT) accesses Airtable, using a single seat.
* **External Portal**: The custom dashboard serves authenticated SQLite users, enabling branch staff, parents, and teachers to retrieve and inspect records with **zero** incremental Airtable seat costs.
* **Roadmap**: This architecture supports scaling to a Parent Portal (potentially hundreds of external users) and expanding to additional franchise branches without licensing bottlenecks.

---

## 11. Security Assumptions

The codebase relies on the following core security assumptions:
* **Server-Side Secrets**: `AIRTABLE_PAT` is stored exclusively on the server and is never exposed in frontend bundles or logs.
* **Metadata API Strictness**: Phase 0 only utilized the Metadata API. No table data was written or leaked.
* **Denied by Default**: Roles have zero access unless explicitly allowed in `rbac-matrix.json`.
* **Field ID Decoupling**: All UI mapping references Field IDs, ensuring display name changes do not impact code logic.
* **No Write Capabilities**: Phase 1 enforces read-only access to prevent unauthorized write requests.

---

## 12. Acceptance Criteria

The following checklist marks the successful completion of Phase 0:

- [x] **Field Map Generated**: `config/field-map.json` successfully matches all fields by ID.
- [x] **Schema Baseline Frozen**: `config/schema-baseline.json` exists with a stable `schemaHash`.
- [x] **Drift Detection Complete**: `scripts/schema-diff.mjs` executes and correctly blocks on breaking drift.
- [x] **Tiers Assigned**: Every table in the base is mapped to a Tier (T1, T2, T3, T4).
- [x] **Roles Audited**: Access rights mapped for Owner, Finance, Office Admin, Teacher, SMM, and Tech Admin.
- [x] **Branch Scoping Defined**: Data isolation principles outlined for multi-branch readiness.
- [x] **PII Isolation Maintained**: Zero record entries extracted or committed to Git.
- [x] **Metadata Alignment**: The generated baseline perfectly mirrors the structure of the active Airtable base.

---

## 13. Future Maintenance

Developers must adhere to these guidelines to preserve the schema integrity:

1. **Regenerating Baseline**: Run `node scripts/generate-field-map.mjs` only after approved schema changes have been completed in Airtable. **Never** regenerate the baseline without explicit Owner approval.
2. **Pre-Deployment Checks**: Ensure `node scripts/schema-diff.mjs` is run as a git-hook or CI/CD step before any deployment.
3. **Audit RBAC Changes**: If new fields are added or existing fields are modified, review `config/rbac-matrix.json` and update redactions accordingly.
4. **Document Updates**: Keep `docs/phase-0-baseline.md` updated with any tier classification modifications or new load-bearing formulas.
