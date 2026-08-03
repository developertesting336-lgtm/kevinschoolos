# School OS — Claude Code Guide (Authoritative)

This is the authoritative School OS CLAUDE.md. It encodes the owner gates, the RBAC rules,
the write-forbidden field registry, and the redaction rules. Every other setup document —
including anything a contractor leaves on a VPS — is subordinate to this file.

---

## 1. Project Overview

School OS is a Phase-1 skeleton for a school CRM dashboard:

- **Stack**: Next.js + React, Prisma (SQLite auth store), Airtable as the data source.
- **Access model**: deny-by-default RBAC, field-level redactions, server-side branch scoping.
- **Phase 1 is strictly READ-ONLY**: no role, no agent, and no tool may open a write path to
  the Airtable base or to production data. Create/update/delete/write/patch/post to production
  data routes are blocked.
- **Schema freeze**: `config/schema-baseline.json` is frozen. `scripts/schema-diff.mjs` blocks
  deploys (exit 1) on breaking drift. Never regenerate the baseline without Owner approval.
- **Field IDs, not labels**: All UI mapping keys on Airtable Field IDs (e.g. `fldABC123`).
  Display names are mutable and bilingual (English/Russian/Kyrgyz) — never key logic on them.

---

## 2. Owner Gates — Do NOT Proceed Until Cleared

The following gates govern all work. Phase 1 is **BLOCKED** until the Owner clears them.
Gate numbers are fixed — do not invent others.

| Gate | Requirement | Status |
| :--- | :--- | :--- |
| **#1** | DNS for the deploy target | Open |
| **#2** | Dedicated read-only Airtable PAT | Open |
| **#3** | Minors'-data compliance sign-off (KG Personal Data Law No. 97, 2017 — covers Medical Notes) | Open |
| **#4/#5** | Role/permission matrix (this is `config/rbac-matrix.json` + this file) | Open |
| **#6** | Schema freeze / drift detection in place | Open |
| **#9** | Authorization to build/deploy at all | Open |

Hard rules while gates are open:

1. **Do not deploy** anything to the VPS target.
2. **Do not write** to the Airtable base — no create/update/delete, no bulk operations.
3. **Do not run** against a production PAT.
4. **Do not open any write path** in build-prep, tooling, or agent config.

---

## 3. Standing Rules (Always)

1. **Deny by default.** No explicit permission = denied. If no role rule, no table rule, or no
   capability exists, return forbidden.
2. **Phase 1 caps every role at READ.** Writes become legal only after the Owner approves a
   later phase.
3. **PII isolation.** Never fetch, cache, or commit table records / PII. Zero PII in Git.
   Students are minors — KG Personal Data Law No. 97 applies.
4. **Secrets live only server-side.** The Airtable PAT (`AIRTABLE_PAT`) exists only in
   `/etc/school-os.env`, read server-side. Never put tokens in scripts, configs, logs,
   CLAUDE.md, `.env` files committed to Git, or frontend bundles.
5. **App runs as non-root.** The systemd unit runs as `school-os`, never `root`. Root defeats
   the `/etc/school-os.env` containment and must not be used for ongoing access.
6. **Server-side branch scoping.** Branch isolation is enforced in server-side queries, never
   by client-side routing filters.
7. **Schema drift blocks deploys.** `node scripts/schema-diff.mjs` runs as a pre-deploy gate
   and daily in production; exit 1 halts the deploy.
8. **Audit everything.** Request order is: `auth → RBAC → branch scoping → audit`. Break-glass
   access is audited.

---

## 4. RBAC Quick Reference

Roles (from `config/rbac-matrix.json` — that file is the machine-readable source of truth):

| Role | Tiers | Notes |
| :--- | :--- | :--- |
| **owner** | T1, T2, T3, T4, T4-RO | All tables, generic renderer allowed, no redactions. |
| **finance** | T1, T2, T4 | No generic student browsing; Student `*` and Parent contact redacted. |
| **office_admin** | T2, T3, T4, T4-RO | Own branch only; all T1 finance tables redacted (`*`). |
| **teacher** | T4, limited T2/T3 | Own classes only; no DOB, no Medical Notes, no parent contact, no payments. |
| **smm** | T3, T4, T4-RO | Own branch; no payments, no student medical notes, no parent contact. |
| **tech_admin** | T4 | Diagnostics only; PII/finance record data only via audited break-glass. |
| **cleaner** | — | Excluded; not registered in the SQLite auth store. |

Tier-to-table mapping (authoritative in `config/rbac-matrix.json`):

- **T1 – Financial/HQ**: Account, JournalEntry, LedgerLine, Vendor, Expense, FranchiseRoyalty,
  TeacherPay, TeacherHours. Append-only ledger — once written, never updated or deleted.
- **T2 – PII**: User, Parent, Student, Enrollment, Invoice, Payment, NotificationLog.
- **T3 – Operational**: Term, Room, Lead, Trial, ClassGroup, Session, Attendance, Activity.
- **T4 – Reference**: Branch, Course, TuitionPlan.
- **T4-RO – Analytics**: ChannelPerformance. Never written by the app (nightly automation owns it).

---

## 5. Write-Forbidden Field Registry

Never attempt a write to a computed field or a load-bearing constraint:

- **Students → Age** — formula-computed, read-only.
- **Leads → Days Since Last Activity / Stale Flag** — auto-calculated.
- **Payments → Month** — extracted, read-only.
- **Ledger Lines → Amount (signed)** — double-entry sign formula (Debit − Credit).
- **Teacher Pay → Computed Pay** — auto-calculated.
- **Channel Performance → KPI Metrics** — automation-owned, read-only.

**Ledger rules (append-only):** financial ledger records are append-only. Every Journal Entry
must balance: Σ(Debit − Credit) = 0 across its linked Ledger Lines. Posted entries are locked;
corrections are new reversing entries.

**Airtable automations must not be disrupted** — nightly recalculation, lead activity tracking,
stale alerts, and class summarization run natively in Airtable. Never modify table structures
or trigger conditions that break them.

---

## 6. Redaction Rules (Field Level)

Applies to any output, log, or rendered record:

- **Students**: Date of Birth and Medical Notes hidden from teacher, smm, finance (finance sees
  `*`). Visible to owner and office_admin.
- **Parents**: Phone, WhatsApp, Email, WhatsApp Group Added, WhatsApp Group Name hidden from
  teacher and smm. Visible to owner, office_admin, and finance in payment context.
- **Payments**: Full payment history hidden from teacher and smm. Visible to owner, finance,
  and office_admin within branch.
- **Users / Vendors**: Pay-related links and contact info hidden from office_admin, teacher,
  smm. Visible to owner and finance.
- **Redaction rule**: `*` entry means the whole field is replaced with `*` in output — never
  a partial value leak.

---

## 7. Connecting to the VPS (Correct Flow)

Claude Code has **no `ssh` subcommand** (`claude ssh ...` is NOT a command — it would be read
as a prompt and start a local session only, so it fails in a confusing way). The correct flow
is three separate steps:

```bash
ssh school-os@5.78.222.166     # or the non-root account for the project
cd /home/kevinschoolos
claude
```

- Use the non-privileged `school-os` account for ongoing access — never `root@`.
- No API key export is needed for code analysis. `claude` uses its own auth.
- If a token is ever required server-side, it is read only from `/etc/school-os.env` by the
  application — never typed into a shell command and never pasted into a chat or a ticket.

---

## 8. How to Run and Test the Frontend (CRITICAL)

The frontend is a **Next.js 16.2.10** application. It runs on **port 8002** and binds to
**127.0.0.1** only. This is how you start it, verify it, and test it.

### 8.0 Public URL (Production / VPS)

The frontend is **already deployed and running** on the VPS at:

- **Primary URL**: `https://crm.navstar-education.com` (DNS configured)
- **Login page**: `https://crm.navstar-education.com/login`
- **Fallback IP URL**: `https://5.78.222.166` (self-signed cert)
- **Caddy** is the public entrypoint (ports 80/443), proxying to the Next.js app on port 8002.
- **Systemd service**: `school-os-dashboard.service` (running as `school-os`, not root)

To test the deployed frontend from anywhere:

```bash
# Login page (should return HTTP 200)
curl -s -o /dev/null -w "%{http_code}" https://crm.navstar-education.com/login

# Root (should return HTTP 307 redirect)
curl -s -o /dev/null -w "%{http_code}" https://crm.navstar-education.com/

# Health check
curl -s https://crm.navstar-education.com/healthz
# → {"status":"ok"}

# Readiness check
curl -s https://crm.navstar-education.com/readyz
# → {"status":"ready"}
```

**IMPORTANT**: The primary domain `crm.navstar-education.com` has a valid TLS certificate.
The fallback IP `5.78.222.166` uses a self-signed certificate — use `-k` with curl for that.

### 8.1 Start the frontend dev server (local development)

```bash
# From the project root (/home/kevinschoolos on the VPS, or the local repo root)
npm run dev
```

This runs: `next dev -p 8002 -H 127.0.0.1`

The server is ready when you see:
```
▲ Next.js 16.2.10 (Turbopack)
- Local:         http://127.0.0.1:8002
✓ Ready in X.Xs
```

### 8.2 Verify the frontend is running

```bash
# Should return HTTP 200 (login page)
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8002/login

# Should return HTTP 307 (redirect to /login or /dashboard)
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8002/
```

### 8.3 Test credentials (seeded in the database)

The database has 7 users with passwords seeded via `scripts/seed-passwords.ts`.
Default password for all users: **`Pass@123`**

| Email | Role |
| :--- | :--- |
| `ownerdirector@gmail.com` | Owner |
| `aidai@gmail.com` | Owner |
| `aisha@gmail.com` | Teacher |
| `tolgonai@gmail.com` | Teacher |
| `aruuke.kubanova@gmail.com` | Office/Admin |
| `elnura@gmail.com` | SMM |
| `gulsana@gmail.com` | Cleaner (blocked from login) |

### 8.4 Test the login API

```bash
curl -X POST http://127.0.0.1:8002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ownerdirector@gmail.com","password":"Pass@123"}'
```

Expected response: `{"success":true,"message":"Successfully logged in."}`

### 8.5 Frontend routes (design pages)

| Route | Description |
| :--- | :--- |
| `/login` | Login page (School OS Management Portal) |
| `/dashboard` | Role-based dashboard (Owner/Teacher/Office Admin/SMM/Finance) |
| `/dashboard/admissions` | Admissions pipeline (Leads, Trials, Convert) |
| `/dashboard/onboarding` | Onboarding checklist & enrollment tracking |
| `/dashboard/payments` | Payment intake & receipts |
| `/dashboard/schedule` | Schedule console & class management |
| `/dashboard/finance` | Finance console (Journal, Ledger, Royalties, Teacher Pay) |
| `/dashboard/branches` | Branch directory |
| `/dashboard/staff` | Staff & users |
| `/dashboard/students` | Student directory |
| `/dashboard/billing` | Billing overview |
| `/dashboard/notifications` | Notifications center |
| `/dashboard/channel-performance` | Channel performance analytics |
| `/dashboard/owner/[table]` | Owner table views (user, parent, student, invoice, lead, trial, classgroup, attendance, activity, course, tuitionplan, term, room) |
| `/dashboard/admin/schema-diagnostics` | Schema diagnostics |

### 8.6 Frontend architecture

```
app/                    # Next.js App Router pages
  ├── page.tsx          # Root redirect (→ /login or /dashboard)
  ├── login/            # Login page
  ├── dashboard/        # Dashboard pages (role-based)
  ├── api/              # API routes (auth, data, sync, etc.)
  ├── healthz/          # Health check
  └── readyz/           # Readiness check

components/
  ├── app-sidebar.tsx   # Role-based sidebar navigation
  ├── dashboard/        # Role-specific dashboard components
  │   ├── DashboardClient.tsx       # Main dashboard router by role
  │   ├── OwnerDashboardClient.tsx  # Owner/HQ dashboard
  │   ├── FinanceDashboardClient.tsx
  │   ├── SmmDashboardClient.tsx
  │   ├── TeacherDashboardClient.tsx
  │   ├── branch/       # Branch Command Center
  │   ├── admissions/   # Admissions pipeline components
  │   ├── onboarding/   # Onboarding components
  │   ├── payments/     # Payment components
  │   ├── schedule/     # Schedule components
  │   ├── finance/      # Finance components
  │   └── teacher/      # Teacher portal
  └── ui/               # shadcn/ui components

store/                  # Redux state (auth, dashboard, etc.)
lib/                    # Core libraries (auth, rbac, airtable, prisma)
config/                 # rbac-matrix.json, field-map.json, schema-baseline.json
prisma/                 # Database schema (PostgreSQL)
```

### 8.7 Database

- **Provider**: PostgreSQL (Neon cloud for local dev, local Postgres on VPS)
- **Connection**: `DATABASE_URL` in `.env` (local) or `/etc/school-os.env` (VPS)
- **Auth store**: `User`, `UserSecret`, `UserSession` tables
- **Data source**: Airtable (read-only proxy via `lib/airtableProxy.ts`)

### 8.8 Common issues

1. **Port 8002 already in use** → kill the process: `kill $(lsof -t -i:8002)` or `fuser -k 8002/tcp`
2. **Database connection error** → check `DATABASE_URL` is set and reachable
3. **Prisma client not generated** → run `npx prisma generate`
4. **Login fails** → run `npx tsx scripts/seed-passwords.ts` to seed passwords
5. **Airtable data not loading** → check `AIRTABLE_PAT` and `AIRTABLE_BASE_ID` are set

---

## 9. Secrets & Safe Investigation (Read-Only Rules)

When inspecting the VPS for inventory/safety checks, these rules are mandatory:

1. **Nothing mutates.** No installs, no `systemctl start|stop|restart`, no `rm`, no writes, no
   `git pull|checkout|fetch`. Reads only.
2. **No secrets by value.** Inspect env files by KEY NAME only. Safe pattern (prints `AIRTABLE_PAT`
   if present, never the value):
   ```bash
   grep -oE '^[A-Za-z_][A-Za-z0-9_]*=' /etc/school-os.env 2>/dev/null | tr -d '='
   ```
   Do NOT substitute `cut -d= -f1` — it prints the whole line when there is no `=`.
3. **No record contents.** File names, counts, sizes, permissions only. Student, parent, and
   payment data must not leave the host (KG Personal Data Law No. 97).
4. **Do not open** `.sqlite`/`.db`/`.csv`/`.xlsx` files — their size and existence is the signal.

Safe diagnostic commands:

```bash
# Is it a git repo / whose remote?
cd /home/kevinschoolos/ && git remote -v && git log --oneline -10

# What's listening? (app must bind 127.0.0.1 only; Caddy is the sole public entrypoint)
ss -ltnp 2>/dev/null

# Databases / exports (existence and size only)
find /home/kevinschoolos/ /var/lib -maxdepth 3 \( -name '*.sqlite*' -o -name '*.db' \) \
  -exec stat -c '%s bytes %y %n' {} \; 2>/dev/null
```

---

## 10. Project Structure

```
app/               # Next.js pages & API routes
components/        # React components
config/            # field-map.json, rbac-matrix.json, schema-baseline.json (frozen)
docs/              # phase-0-baseline.md (single source of truth reference)
lib/               # Core libraries (airtable, auth, rbac, audit, sync, roles)
prisma/            # Database schema & migrations (SQLite auth store)
scripts/           # generate-field-map.mjs, schema-diff.mjs, register-webhook.ts
store/             # State slices
logs/audit.log     # Audit log
```

---

## 11. What NOT To Do

- Do NOT run `claude ssh ...` — it is not a command. Use `ssh` first, then `claude`.
- Do NOT write, create, update, or delete production data — Phase 1 is read-only.
- Do NOT deploy to the VPS until gate #9 clears.
- Do NOT place an API key or PAT in this file, any script, any config, or any `.env` in Git.
- Do NOT use `root@` for ongoing access.
- Do NOT regenerate `config/schema-baseline.json` without Owner approval for a schema change.
- Do NOT key logic on Airtable display names — Field IDs only.
- Do NOT paste token values or record contents into chats, tickets, or logs.