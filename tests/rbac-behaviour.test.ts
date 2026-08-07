/**
 * tests/rbac-behaviour.test.ts
 *
 * Executes the real RBAC functions, rather than asserting on source text.
 *
 * The static suite (tests/table-registry.test.mjs) proves the inventories agree
 * and that every column reference resolves — but it never runs checkRBAC or
 * applyRedactions, so a wrong role string or an inverted condition would pass it
 * unnoticed. This file covers the behaviour.
 *
 * Runs under tsx because lib/rbac.ts is TypeScript. No database is required:
 * checkRBAC and applyRedactions are pure over their inputs.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { checkRBAC, applyRedactions } from "../lib/rbac";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const ALL_ROLES = ["owner", "finance", "office_admin", "teacher", "smm", "tech_admin"];

describe("checkRBAC — tier gating", () => {
  test("owner reads every adopted table", () => {
    const adopted = [
      "BackpackInventory", "Ttc", "BudgetTarget", "FixedAsset", "BuildOutProject",
      "MarketingCampaign", "Document", "SubFranchisee", "SubFranchiseRoyalty",
      "SelfEmployedTeacher", "MinimumGoal", "FranchiseObligation",
    ];
    for (const t of adopted) {
      const r = checkRBAC("owner", t, "read");
      assert.equal(r.allowed, true, `owner denied ${t}: ${r.reason}`);
    }
  });

  test("an unknown table is denied to EVERY role, including owner", () => {
    // The !tableTier guard sits before the owner branch. This is the property
    // that kept the 12 tables safely invisible before they were granted.
    for (const role of ALL_ROLES) {
      const r = checkRBAC(role, "NotARealTable", "read");
      assert.equal(r.allowed, false, `${role} was allowed an unknown table`);
      assert.match(r.reason, /unrecognized|does not exist/i);
    }
  });

  test("office_admin is denied T1 but allowed T2/T3/T4 among the new tables", () => {
    assert.equal(checkRBAC("office_admin", "BudgetTarget", "read").allowed, false, "T1 should be denied");
    assert.equal(checkRBAC("office_admin", "FixedAsset", "read").allowed, false, "T1 should be denied");
    assert.equal(checkRBAC("office_admin", "Document", "read").allowed, true, "T2 should be allowed");
    assert.equal(checkRBAC("office_admin", "Ttc", "read").allowed, true, "T3 should be allowed");
    assert.equal(checkRBAC("office_admin", "BackpackInventory", "read").allowed, true, "T4 should be allowed");
  });

  test("finance is allowed T1/T2/T4 and denied T3 among the new tables", () => {
    assert.equal(checkRBAC("finance", "BudgetTarget", "read").allowed, true, "T1 should be allowed");
    assert.equal(checkRBAC("finance", "SubFranchisee", "read").allowed, true, "T2 should be allowed");
    assert.equal(checkRBAC("finance", "BackpackInventory", "read").allowed, true, "T4 should be allowed");
    assert.equal(checkRBAC("finance", "MarketingCampaign", "read").allowed, false, "T3 should be denied");
  });

  test("teacher and smm get no standing access to the T1/T2 new tables", () => {
    for (const role of ["teacher", "smm"]) {
      for (const t of ["SubFranchisee", "SelfEmployedTeacher", "Document", "BudgetTarget"]) {
        assert.equal(checkRBAC(role, t, "read").allowed, false, `${role} should not read ${t}`);
      }
    }
  });

  test("writes stay closed for every adopted table (Phase 1 is read-only)", () => {
    for (const role of ALL_ROLES) {
      for (const t of ["Document", "SubFranchisee", "BudgetTarget", "BackpackInventory"]) {
        const r = checkRBAC(role, t, "write");
        assert.equal(r.allowed, false, `${role} was allowed to write ${t}`);
      }
    }
  });

  test("cleaner is excluded outright", () => {
    assert.equal(checkRBAC("cleaner", "Branch", "read").allowed, false);
  });
});

describe("applyRedactions — CLAUDE.md §6 rules", () => {
  const student = () => ({
    id: "rec1", studentName: "A", dateOfBirth: "2015-01-01",
    medicalNotes: "confidential", branchIds: ["b1"],
  });
  const parent = () => ({
    id: "rec2", parentName: "B", phone: "+996", whatsapp: "+996",
    email: "b@example.com", whatsappGroupName: "G", branchIds: ["b1"],
  });

  test("owner keeps student DOB and medical notes", () => {
    const out = applyRedactions("owner", "Student", student()) as Record<string, unknown>;
    assert.ok("dateOfBirth" in out);
    assert.ok("medicalNotes" in out);
  });

  test("teacher, smm and finance lose student DOB and medical notes", () => {
    for (const role of ["teacher", "smm", "finance"]) {
      const out = applyRedactions(role, "Student", student()) as Record<string, unknown>;
      assert.ok(!("dateOfBirth" in out), `${role} still sees dateOfBirth`);
      assert.ok(!("medicalNotes" in out), `${role} still sees medicalNotes`);
      assert.equal(out.studentName, "A", `${role} lost a non-sensitive field`);
    }
  });

  test("teacher and smm lose parent contact details", () => {
    for (const role of ["teacher", "smm"]) {
      const out = applyRedactions(role, "Parent", parent()) as Record<string, unknown>;
      for (const k of ["phone", "whatsapp", "email", "whatsappGroupName"]) {
        assert.ok(!(k in out), `${role} still sees parent ${k}`);
      }
    }
  });

  test("redaction maps over arrays and does not mutate the input", () => {
    const rows = [student(), student()];
    const out = applyRedactions("teacher", "Student", rows) as Record<string, unknown>[];
    assert.equal(out.length, 2);
    assert.ok(!("medicalNotes" in out[0]));
    assert.ok("medicalNotes" in rows[0], "input array was mutated");
  });
});

describe("applyRedactions — tables 28-39", () => {
  const subFranchisee = () => ({
    id: "r", franchiseeName: "F", contactName: "C", phone: "+996", email: "c@example.com",
    franchiseeFee: 1, franchiseFeeEur: 1, lessonFeeKgs: 2, royaltyRatePct: 3,
    actualFixedRoyaltyAnnualKgs: 4, mfFeeShareToHqEur: 5,
  });
  const set = () => ({ id: "r", setName: "S", phone: "+996", email: "s@example.com", notes: "n", royaltyRatePct: 7 });
  const doc = () => ({ id: "r", document: "D", party: "P", notes: "n", type: "contract" });

  test("owner sees sub-franchisee contact and commercial terms", () => {
    const out = applyRedactions("owner", "SubFranchisee", subFranchisee()) as Record<string, unknown>;
    for (const k of ["contactName", "phone", "email", "franchiseFeeEur", "royaltyRatePct"]) {
      assert.ok(k in out, `owner lost ${k}`);
    }
  });

  test("non-owner loses sub-franchisee contact details", () => {
    for (const role of ["finance", "office_admin", "teacher", "smm"]) {
      const out = applyRedactions(role, "SubFranchisee", subFranchisee()) as Record<string, unknown>;
      for (const k of ["contactName", "phone", "email"]) {
        assert.ok(!(k in out), `${role} still sees sub-franchisee ${k}`);
      }
    }
  });

  test("only owner and finance see sub-franchisee commercial terms", () => {
    const commercial = ["franchiseFeeEur", "lessonFeeKgs", "royaltyRatePct", "actualFixedRoyaltyAnnualKgs", "mfFeeShareToHqEur"];
    for (const k of commercial) {
      assert.ok(k in (applyRedactions("finance", "SubFranchisee", subFranchisee()) as any), `finance lost ${k}`);
      assert.ok(!(k in (applyRedactions("office_admin", "SubFranchisee", subFranchisee()) as any)), `office_admin still sees ${k}`);
    }
  });

  test("SET contact details and rate are restricted", () => {
    const oa = applyRedactions("office_admin", "SelfEmployedTeacher", set()) as Record<string, unknown>;
    for (const k of ["phone", "email", "notes", "royaltyRatePct"]) {
      assert.ok(!(k in oa), `office_admin still sees SET ${k}`);
    }
    const own = applyRedactions("owner", "SelfEmployedTeacher", set()) as Record<string, unknown>;
    assert.ok("phone" in own && "royaltyRatePct" in own, "owner lost SET fields");
  });

  test("Document party and notes are owner/office_admin only", () => {
    for (const role of ["owner", "office_admin"]) {
      const out = applyRedactions(role, "Document", doc()) as Record<string, unknown>;
      assert.ok("party" in out && "notes" in out, `${role} lost Document fields`);
    }
    for (const role of ["finance", "teacher", "smm"]) {
      const out = applyRedactions(role, "Document", doc()) as Record<string, unknown>;
      assert.ok(!("party" in out), `${role} still sees Document party`);
      assert.ok(!("notes" in out), `${role} still sees Document notes`);
    }
  });
});

describe("the owner generic renderer applies redaction", () => {
  test("app/api/owner/[table]/route.ts calls applyRedactions", () => {
    // Regression guard. This route relied only on ownerTablesConfig column
    // omission, which is role-blind, so finance could read Student DOB and
    // medical notes and teacher could read Parent contact details.
    const src = readFileSync(resolve(ROOT, "app/api/owner/[table]/route.ts"), "utf8");
    assert.match(src, /applyRedactions\(/, "owner route no longer redacts — the bypass is back");
  });
});
