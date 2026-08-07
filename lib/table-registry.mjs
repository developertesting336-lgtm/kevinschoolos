/**
 * table-registry.mjs
 *
 * SINGLE SOURCE OF TRUTH for the Airtable table inventory.
 *
 * Replaces the duplicated `TIER_MAP` that previously lived in both
 * scripts/generate-field-map.mjs and scripts/schema-diff.mjs, and the
 * hard-coded `prismaToTableId` map in lib/airtableProxy.ts.
 *
 * Entries are keyed by **tableId**, never by display name. The previous
 * implementation matched a name substring, which silently mis-tiered any table
 * whose name contained another table's name — e.g. "36 Sub-Franchise Royalties"
 * matched the "Franchise Royalties" entry and resolved to T1 instead of raising.
 * Airtable display names are also mutable and bilingual, so they are recorded
 * here for humans only and are never used for lookup.
 *
 * Tiers: T1 Financial · T2 PII · T3 Operational · T4 Reference · T4-RO Analytics
 *
 * `proposed: true` marks a table whose tier and Prisma model name have NOT been
 * ratified by the Owner under gates #4/#5. Consumers that bake tiers into
 * committed config must refuse to do so while any live table is `proposed` —
 * see the guard in scripts/generate-field-map.mjs.
 */

/**
 * @typedef {Object} TableRegistryEntry
 * @property {string}  tableId      Airtable table ID (the lookup key).
 * @property {string}  displayName  Airtable display name. Informational only.
 * @property {string}  prismaModel  PascalCase Prisma model / RBAC table name.
 * @property {string}  tier         T1 | T2 | T3 | T4 | T4-RO
 * @property {string}  tierName     Financial | PII | Operational | Reference | Analytics
 * @property {Object}  [flags]      Table-level behaviour flags.
 * @property {boolean} [proposed]   True until the Owner ratifies tier + model.
 */

/** @type {TableRegistryEntry[]} */
export const TABLE_REGISTRY = [
  // ---------------------------------------------------------------------
  // Tables 01–27 — frozen baseline, tiers ratified.
  // ---------------------------------------------------------------------
  { tableId: "tbl2utdNdP9usMXLf", displayName: "01 Branches / Филиалы", prismaModel: "Branch", tier: "T4", tierName: "Reference" },
  { tableId: "tblUkEhqFJBFTvRN5", displayName: "02 Users / Сотрудники", prismaModel: "User", tier: "T2", tierName: "PII" },
  { tableId: "tblgvltY5JtmMZs1q", displayName: "03 Courses / Курсы", prismaModel: "Course", tier: "T4", tierName: "Reference" },
  { tableId: "tbldiIHLyH7bup2XG", displayName: "04 Tuition Plans / Тарифные планы", prismaModel: "TuitionPlan", tier: "T4", tierName: "Reference" },
  { tableId: "tblVSaneGtUOq5Xzr", displayName: "05 Terms / Учебные периоды", prismaModel: "Term", tier: "T3", tierName: "Operational" },
  { tableId: "tblunCF2EX30onveH", displayName: "06 Rooms / Кабинеты", prismaModel: "Room", tier: "T3", tierName: "Operational" },
  { tableId: "tblItZ3B7d4YRO9ih", displayName: "07 Leads / Лиды", prismaModel: "Lead", tier: "T3", tierName: "Operational" },
  { tableId: "tblfvl5TjmWtr24Yp", displayName: "08 Trials / Пробные уроки", prismaModel: "Trial", tier: "T3", tierName: "Operational" },
  { tableId: "tblRJNw4S6o1WPjBI", displayName: "09 Parents / Родители", prismaModel: "Parent", tier: "T2", tierName: "PII" },
  { tableId: "tbl9Ddw4uRQ3i6e1B", displayName: "10 Students / Ученики", prismaModel: "Student", tier: "T2", tierName: "PII" },
  { tableId: "tblpUJni7tMvO2QBs", displayName: "11 Class Groups / Группы", prismaModel: "ClassGroup", tier: "T3", tierName: "Operational" },
  { tableId: "tblVA5O7fnBx5cAnJ", displayName: "12 Enrollments / Зачисления", prismaModel: "Enrollment", tier: "T2", tierName: "PII" },
  { tableId: "tblUE4gfr8en6lfUS", displayName: "13 Sessions / Занятия", prismaModel: "Session", tier: "T3", tierName: "Operational" },
  { tableId: "tblbOAIuMZHgtsjEP", displayName: "14 Attendance / Посещаемость", prismaModel: "Attendance", tier: "T3", tierName: "Operational" },
  { tableId: "tblTB6N6jNqSFvEER", displayName: "15 Invoices / Счета", prismaModel: "Invoice", tier: "T2", tierName: "PII" },
  { tableId: "tbliFcGpMbqnMaD9S", displayName: "16 Payments / Платежи", prismaModel: "Payment", tier: "T2", tierName: "PII" },
  { tableId: "tblLkuBm7zVJKpzzu", displayName: "17 Chart of Accounts / План счетов", prismaModel: "Account", tier: "T1", tierName: "Financial" },
  { tableId: "tblRf3mdeZmzp2mnf", displayName: "18 Journal Entries / Журнальные записи", prismaModel: "JournalEntry", tier: "T1", tierName: "Financial" },
  { tableId: "tbl0A506K9OVCorYv", displayName: "19 Ledger Lines / Проводки", prismaModel: "LedgerLine", tier: "T1", tierName: "Financial" },
  { tableId: "tblAu08dz4NZJ5HDs", displayName: "20 Vendors / Поставщики", prismaModel: "Vendor", tier: "T1", tierName: "Financial" },
  { tableId: "tblZPcDPnzTxp0sol", displayName: "21 Expenses / Расходы", prismaModel: "Expense", tier: "T1", tierName: "Financial" },
  { tableId: "tbl2YiFYDq00gJIrF", displayName: "22 Franchise Royalties / Роялти франшизы", prismaModel: "FranchiseRoyalty", tier: "T1", tierName: "Financial" },
  { tableId: "tblGVA0enM9oxS9C0", displayName: "23 Teacher Pay / Оплата преподавателям", prismaModel: "TeacherPay", tier: "T1", tierName: "Financial" },
  { tableId: "tblcOJdLkCBXXJ3AL", displayName: "24 Teacher Hours / Часы преподавателей", prismaModel: "TeacherHours", tier: "T1", tierName: "Financial" },
  { tableId: "tblbGzoGxZVLRPB7k", displayName: "25 Activities / Действия", prismaModel: "Activity", tier: "T3", tierName: "Operational" },
  { tableId: "tblJQ9zndF47zIBVg", displayName: "26 Channel Performance / Эффективность каналов", prismaModel: "ChannelPerformance", tier: "T4-RO", tierName: "Analytics", flags: { automationOwned: true, appWritable: false } },
  { tableId: "tblMsyDxS6ltliuU1", displayName: "27 Notifications Log / Журнал уведомлений", prismaModel: "NotificationLog", tier: "T2", tierName: "PII", flags: { appendOnly: true } },

  // ---------------------------------------------------------------------
  // Tables 28–39 — adopted 2026-08-06. Tiers and model names ratified by the
  // Owner under gates #4/#5; tables 34, 35 and 37 hold personal data and are
  // covered by the gate #3 sign-off (KG Personal Data Law No. 97).
  // See docs/schema-adoption-guide.md §1.
  // ---------------------------------------------------------------------
  { tableId: "tblO38n2QCCEdey10", displayName: "28 Backpack Inventory / Инвентарь рюкзаков", prismaModel: "BackpackInventory", tier: "T4", tierName: "Reference" },
  { tableId: "tblBbv8UPCF6TAYqy", displayName: "29 TTCs / Курсы подготовки преподавателей", prismaModel: "Ttc", tier: "T3", tierName: "Operational" },
  { tableId: "tblRMtJRf9oYfWtqt", displayName: "30 Budget &amp; Targets / Бюджет и цели", prismaModel: "BudgetTarget", tier: "T1", tierName: "Financial" },
  { tableId: "tbl5P27dUHrKWOMw2", displayName: "31 Fixed Assets / Основные средства", prismaModel: "FixedAsset", tier: "T1", tierName: "Financial" },
  { tableId: "tblqJGJRambPzTePj", displayName: "32 Build-Out Projects / Проекты открытия центров", prismaModel: "BuildOutProject", tier: "T1", tierName: "Financial" },
  { tableId: "tblPSNnBHuyRj9C6N", displayName: "33 Marketing Campaigns / Маркетинговые кампании", prismaModel: "MarketingCampaign", tier: "T3", tierName: "Operational" },
  { tableId: "tbl1JpraNHlYrvYU0", displayName: "34 Documents / Документы", prismaModel: "Document", tier: "T2", tierName: "PII" },
  { tableId: "tblns9BnLFvsJrdOW", displayName: "35 Sub-Franchisees (LCF/LSF) / Субфранчайзи", prismaModel: "SubFranchisee", tier: "T2", tierName: "PII" },
  { tableId: "tblx5V0x0s6kbr56l", displayName: "36 Sub-Franchise Royalties / Роялти субфранчайзи", prismaModel: "SubFranchiseRoyalty", tier: "T1", tierName: "Financial" },
  { tableId: "tbltNBkGhwTiItU6B", displayName: "37 SETs / Самозанятые преподаватели", prismaModel: "SelfEmployedTeacher", tier: "T2", tierName: "PII" },
  { tableId: "tblpepGaPbfVlBv74", displayName: "38 Minimum Goals / Минимальные цели", prismaModel: "MinimumGoal", tier: "T3", tierName: "Operational" },
  { tableId: "tbleVIIZdAmIlFcZS", displayName: "39 Franchise Obligations / Обязательства франшизы", prismaModel: "FranchiseObligation", tier: "T1", tierName: "Financial" },
];

/** Index by table ID — the only supported lookup key. */
const byTableId = new Map(TABLE_REGISTRY.map((e) => [e.tableId, e]));

/**
 * Look up a registry entry by Airtable table ID.
 * @returns {TableRegistryEntry|undefined}
 */
export function getRegistryEntry(tableId) {
  return byTableId.get(tableId);
}

/**
 * Resolve the tier for a table by ID.
 *
 * Throws on an unknown table — an unrecognised table must never silently
 * acquire a tier, because tier drives redaction and role access.
 *
 * @param {string} tableId    Airtable table ID.
 * @param {string} [tableName] Display name, used only to make the error legible.
 * @returns {{tier: string, tierName: string}}
 */
export function resolveTier(tableId, tableName) {
  const entry = byTableId.get(tableId);
  if (!entry) {
    throw new Error(
      `FATAL: Table "${tableName || "unknown"}" (ID: ${tableId || "unknown"}) is not in TABLE_REGISTRY. ` +
        `Add it to lib/table-registry.mjs before it can be tiered.`
    );
  }
  return { tier: entry.tier, tierName: entry.tierName };
}

/**
 * Table-level behaviour flags. Unknown tables resolve to `{}` rather than
 * throwing, matching the previous resolveTableFlags() contract.
 */
export function resolveTableFlags(tableId) {
  return byTableId.get(tableId)?.flags ?? {};
}

/**
 * Prisma model name (PascalCase) for a table ID, or undefined.
 */
export function resolvePrismaModel(tableId) {
  return byTableId.get(tableId)?.prismaModel;
}

/**
 * Map of lowercased Prisma model name -> Airtable table ID.
 * Replaces the hand-maintained `prismaToTableId` literal in lib/airtableProxy.ts.
 *
 * @returns {Record<string, string>}
 */
export function buildPrismaToTableId() {
  /** @type {Record<string, string>} */
  const map = {};
  for (const entry of TABLE_REGISTRY) {
    map[entry.prismaModel.toLowerCase()] = entry.tableId;
  }
  return map;
}

/**
 * Table IDs whose tier/model are still awaiting Owner ratification.
 */
export function getProposedTableIds() {
  return TABLE_REGISTRY.filter((e) => e.proposed).map((e) => e.tableId);
}
