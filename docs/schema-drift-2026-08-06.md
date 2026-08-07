# Schema Drift Report — 2026-08-06

**Base:** `appT1VyuwHzKGhOId` — Helen Doron Kyrgyzstan — School OS
**Server:** `/home/kevinschoolos` (`school-os-dashboard.service`)
**Baseline frozen:** 2026-07-16T08:27:43.645Z
**Compared:** 2026-08-06
**Supersedes:** [`schema-drift-2026-08-05.md`](./schema-drift-2026-08-05.md)

---

## Verdict

**Drift is additive only. Zero breaking issues. Deploys are not blocked.**

**The table and field inventory has not changed since 2026-08-05.** This report re-verifies
yesterday's result and corrects three points of detail — including the live `schemaHash`, which
2026-08-05 recorded incorrectly (*Finding 1*).

Every difference falls into a `scripts/schema-diff.mjs` *warning* branch (table added, field
added). None falls into a *breaking* branch (table removed, tier changed, field removed, field
type changed, readOnly changed). The gate prints **48 warnings** and **exits 0**.

## Counts

| | Baseline | Live | Δ |
| :--- | ---: | ---: | ---: |
| Tables | 27 | 39 | +12 |
| Fields | 336 | 529 | +193 |

| | `schemaHash` |
| :--- | :--- |
| Baseline | `44bb45e22634576c6fd30278219db0be4608ca76f61a43ef9ce4a70b67adc71a` |
| Live (authoritative) | `195d377203f9ef81a2a92faf9be780d84a246f71d573ec59b501b13e796183c0` |
| Value recorded on 2026-08-05 (**incorrect**) | `ba6a698bcd6491c7813c84f6667906ea4dd381394c61b2c095e8718512c280d6` |

See *Finding 1* — the 2026-08-05 hash was computed after an `&amp;` → `&` normalization that
should not have been applied.

| Change class | Count |
| :--- | ---: |
| Tables added | 12 |
| Tables removed | 0 |
| Tables renamed | 0 |
| Fields added to existing tables | 36 |
| Fields in new tables | 157 |
| Fields removed | 0 |
| Fields renamed | 0 |
| Field types changed | 0 |
| readOnly flags changed | 0 |

### Method

Live schema read from the Airtable Meta API (`/v0/meta/bases/{baseId}/tables`). The inventory
diff was first taken through the Airtable connector; the hash and the `&amp;` finding were then
confirmed directly via `fetchBaseSchema()` against the server-side `AIRTABLE_PAT` read from
`/etc/school-os.env`. Metadata only; no record data was fetched.

Base identity was confirmed by name lookup rather than assumed: `search_bases("Helen Doron
School OS")` resolves to `appT1VyuwHzKGhOId`, which matches the baseline's recorded `baseId`
and the `ALLOWED_BASE_IDS` allow-list in both `lib/fetch-airtable-schema.mjs:15` and
`lib/airtableProxy.ts:19`.

Classification reused the project's own `generateSchemaHash()` and `isReadOnlyField()` from
`lib/fetch-airtable-schema.mjs` rather than a reimplementation, so the numbers above are
directly comparable to what `schema-diff.mjs` produces. Table and field matching is by **ID**,
never by name.

---

## No change since 2026-08-05

Rather than trusting the matching counts, the previous snapshot was reconstructed and compared
field-by-field:

- Parsed all **193** `fieldId | Name | Type` rows out of the 2026-08-05 report (the 157 fields
  in new tables plus the 36 added to existing tables).
- Merged them with the **336** fields in `config/schema-baseline.json` → a complete 529-field
  snapshot as of 2026-08-05.
- Diffed that against today's live pull, keyed by field ID.

Result: **zero fields added, zero removed, zero retyped.** All 39 table IDs matched. One
apparent rename surfaced on `fldzbf7FuWiT5UyG8`; it reflects the 2026-08-05 report having
transcribed `&amp;` as `&`, not a change in the base (*Finding 1*).

The 2026-08-05 report's field inventories remain accurate and are **not** reproduced here.
Refer to that document for the per-table detail of the 12 new tables and 36 new fields.

---

## Finding 1 — `&amp;` is genuine API data, and the 2026-08-05 hash is wrong

> **Correction.** An earlier revision of this report claimed the `&amp;` below was an
> HTML-escaping artifact introduced by the Airtable MCP connector, and that normalizing it away
> yielded the authoritative hash. That was wrong, and it is corrected here.

Two objects in the base carry a literal `&amp;` in their name:

| Object | ID |
| :--- | :--- |
| Table `30 Budget &amp; Targets / Бюджет и цели` | `tblRMtJRf9oYfWtqt` |
| Link field of the same name on `01 Branches / Филиалы` | `fldzbf7FuWiT5UyG8` |

This was verified directly against the Meta API (`/v0/meta/bases/{baseId}/tables`) using
`fetchBaseSchema()` — **the same code path `scripts/schema-diff.mjs` uses** — not through the
connector. The API returns the literal string `"30 Budget &amp; Targets / Бюджет и цели"`. The
connector returns the identical value, so there is no transport artifact: `&amp;` is simply
what Airtable serves for this name.

Because `generateSchemaHash()` hashes names alongside IDs and types, this string is part of the
hash. The authoritative live hash is therefore **`195d3772…6183c0`**, which is what
`schema-diff.mjs` prints against the live base today.

The `ba6a698b…c280d6` recorded as the live hash on 2026-08-05 is **incorrect** — it was produced
by normalizing `&amp;` → `&` before hashing. Do not use it as a reference value; it will never
be reproduced by the tooling.

> **Rule for future checks:** do **not** normalize names before hashing. Hash exactly what the
> Meta API returns. `scripts/schema-diff.mjs` already does this correctly.

Whether Airtable stores the literal characters `&amp;` or escapes `&` on output cannot be
determined from the API alone, and does not matter operationally: every consumer in this
project — the drift gate, the field map, the baseline — sees and records `&amp;`. If the Owner
wants the display name cleaned up, that is an edit in Airtable followed by a re-freeze, not a
change in the tooling.

---

## Finding 2 — the drift gate does not crash; the field-map generator does

The 2026-08-05 report's blocker #1 attributes a `resolveTier()` crash to the drift gate. That
attribution is imprecise, and the distinction matters because it determines whether the
pre-deploy gate is currently usable.

**`scripts/schema-diff.mjs` runs clean.** `resolveTier()` is called only inside the loop over
*baseline* tables (`scripts/schema-diff.mjs:196-197`), where both sides are known-good names.
The added-tables loop at `scripts/schema-diff.mjs:271` only records a warning and never calls
`resolveTier()`. The 12 new tables are therefore never tier-resolved by the gate.

**`scripts/generate-field-map.mjs` throws.** `buildSortedFieldMap()` calls `resolveTier()` for
*every live table* (`scripts/generate-field-map.mjs:107`), so regenerating the field map fails
with `FATAL: Unmatched table name` on **11 of the 12** new tables.

Mitigating detail: the throw happens well before the `writeFileSync` calls at
`scripts/generate-field-map.mjs:389-390`, so a failed run leaves `config/field-map.json` and
`config/schema-baseline.json` untouched. (This is distinct from the separate ordering problem
already noted in the prior report, where the *validators* run after the writes.)

Net effect: the deploy gate is usable today; **re-freezing the baseline is blocked** until
`TIER_MAP` covers tables 28–39.

---

## Finding 3 — `36 Sub-Franchise Royalties` silently resolves to T1

`resolveTier()` is an ordered substring match, not an exact match. The name
`36 Sub-Franchise Royalties / Роялти субфранчайзи` contains the substring
`Franchise Royalties`, so it matches the `TIER_MAP` entry for the pre-existing
`22 Franchise Royalties / Роялти франшизы` and resolves to **T1 Financial**.

It is the only one of the 12 new tables that does not throw — it fails silently instead.

T1 is a plausible tier for sub-franchise royalties, so this is latent rather than currently
harmful. But the assignment is accidental, not a decision, and it means the table would slip
into the field map with an unreviewed tier if the other 11 were fixed by name alone.

All 39 live table names were checked for matching more than one `TIER_MAP` entry: no other
ambiguity exists today. The fragility is structural — a future table named e.g.
`40 Student Feedback` would match `Students` → T2 by the same mechanism.

---

## RBAC status — the 12 new tables are unreachable, including for Owner

None of the 12 new tables appear in `config/rbac-matrix.json`'s `tiers`. Tracing both paths
through `checkRBAC()` in `lib/rbac.ts`:

- **Read** — the unrecognized-table guard at `lib/rbac.ts:71` returns `{ allowed: false }`
  *before* the read-path `owner` branch at `:76` is reached, so `owner` is denied despite its
  `tables: ["*"]` grant.
- **Write** — denied even earlier, at `lib/rbac.ts:30`, since none of the 12 are in
  `allowedWriteTables`. (Note there is a second, earlier `owner` branch at `:34`, but it sits
  inside that write path and is unreachable for these tables.)

So every role is denied access to all 12, on both paths. **Deny-by-default is working as
designed; this is not a security hole.** It does mean roughly a third of the base is invisible
to the app, which is the practical consequence to plan around.

---

## Blockers to adoption

The five blockers enumerated in [`schema-drift-2026-08-05.md`](./schema-drift-2026-08-05.md)
(§ *Blockers to adoption*) all still stand — `TIER_MAP` duplication, the third hard-coded
inventory in `prismaToTableId`, missing RBAC rules, the write-before-validate ordering, and the
two divergent drift implementations. They are not restated here.

Adjustments from this pass:

- Blocker #1 should be scoped to `scripts/generate-field-map.mjs`, not the drift gate
  (*Finding 2*).
- Add: `resolveTier()`'s substring matching needs to become exact or ID-keyed, independent of
  extending `TIER_MAP` (*Finding 3*).
- Add: schema hashes must be computed on the raw Meta API response with **no** name
  normalization; the `ba6a698b…` value recorded on 2026-08-05 is wrong (*Finding 1*).

**Re-freezing `config/schema-baseline.json` still requires explicit Owner approval** under
gate #6 (CLAUDE.md §11). Nothing in this report authorizes it, and no config, script, or
baseline file was modified in producing it.

---

*Schema metadata only — no student, parent, or payment record data was read or is recorded here.*
