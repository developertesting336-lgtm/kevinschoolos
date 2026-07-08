# TASK.md — RBAC Implementation

## Phase 1 — Step 6: RBAC Middleware

### Goal

Implement deny-by-default role-based access control using `config/rbac-matrix.json`.

Phase 1 must remain read-only for every role.

---

## 1. Create RBAC Matrix

Create:

```txt
config/rbac-matrix.json
```

The matrix must define access by:

* Role
* Tier
* Table
* Capability
* Field-level redaction

All permissions must be denied unless explicitly granted.

---

## 2. Define Supported Roles

Implement the roles defined in the docs:

```txt
owner
finance
office_admin
teacher
smm
tech_admin
```

Airtable roles map as:

```txt
Owner        → owner
Office/Admin → office_admin
Teacher      → teacher
SMM          → smm
Cleaner      → excluded
```

`finance` and `tech_admin` are app-only roles.

---

## 3. Implement Tier-Based Access

Use the documented table tiers.

### T1 — Financial / HQ

Owner and Finance only.

Tables:

```txt
17 Chart of Accounts
18 Journal Entries
19 Ledger Lines
20 Vendors
21 Expenses
22 Franchise Royalties
23 Teacher Pay
24 Teacher Hours
```

---

### T2 — PII / Branch Admin

Owner and Office/Admin primary access.

Tables:

```txt
02 Users
09 Parents
10 Students
12 Enrollments
15 Invoices
16 Payments
27 Notifications Log
```

---

### T3 — Operational

Branch staff and teachers, with teachers scoped to their own classes.

Tables:

```txt
05 Terms
06 Rooms
07 Leads
08 Trials
11 Class Groups
13 Sessions
14 Attendance
25 Activities
```

---

### T4 — Reference

Broad internal read access.

Tables:

```txt
01 Branches
03 Courses
04 Tuition Plans
```

---

### T4-RO — Analytics

Read-only analytics.

Tables:

```txt
26 Channel Performance
```

This table must never be writable from the app.

---

## 4. Implement RBAC Middleware

Create middleware that runs after authentication.

Required request order:

```txt
auth → RBAC → branch scoping → audit
```

RBAC must resolve:

```txt
user role
branch ids
table access
capability
field redactions
```

---

## 5. Implement Deny-by-Default Logic

Default behavior:

```txt
no explicit permission = deny
```

If no role rule exists, return forbidden.

If no table rule exists, return forbidden.

If no capability exists, return forbidden.

---

## 6. Cap Phase 1 at READ

Even if later phases require writes, Phase 1 must allow read access only.

Block:

```txt
create
update
delete
write
patch
post
```

for production data routes.

---

## 7. Implement Role Access Rules

### Owner

Access:

```txt
T1
T2
T3
T4
T4-RO
```

Scope:

```txt
all
```

Generic renderer:

```txt
allowed
```

---

### Finance

Access:

```txt
T1 full read
T2 finance-linked read
T4 read
```

Restrictions:

```txt
no generic student browsing
no teacher portal
no SMM surfaces
```

---

### Office/Admin

Access:

```txt
T2 admin read
T3 operational read
02 Users read
T4 read
```

Restrictions:

```txt
no T1 finance/payroll access
```

---

### Teacher

Access:

```txt
own students
own classes
own sessions
own attendance
T4 read
```

Restrictions:

```txt
no DOB
no Medical Notes
no parent contact
no payments
no invoices
no generic renderer
no cross-class data
```

---

### SMM

Access:

```txt
Leads
Trials
Activities
Channel Performance
Class Groups
T4 read
```

Restrictions:

```txt
no financial tiers
no student medical data
no payments
```

---

### Tech Admin

Access:

```txt
system diagnostics
schema diagnostics
T4 read only
```

Restrictions:

```txt
no standing PII access
no standing finance access
generic production-data renderer only by break-glass
```

---

## 8. Implement Field-Level Redactions

RBAC must hide restricted fields by role.

### Students

Hide from Teacher, SMM, Finance:

```txt
Date of Birth
Medical Notes
```

Visible to:

```txt
owner
office_admin
```

---

### Parents

Hide from Teacher and SMM:

```txt
Phone
WhatsApp
Email
WhatsApp Group Added
WhatsApp Group Name
```

Visible to:

```txt
owner
office_admin
finance in payment context
```

---

### Users

Hide pay-related links from:

```txt
office_admin
teacher
smm
```

Visible to:

```txt
owner
finance
```

---

### Payments

Hide full payment history from:

```txt
teacher
smm
```

Visible to:

```txt
owner
finance
office_admin within branch
```

---

### Vendors

Hide phone and email from:

```txt
teacher
smm
```

Visible to:

```txt
owner
finance
```

---

## 9. Restrict Generic Renderer

Generic renderer default:

```txt
owner only
```

Tech Admin may access production data only through documented break-glass access.

Break-glass access must be audited.

---

## 10. Protect Routes With RBAC

Apply RBAC to all non-health routes.

Routes that must remain unauthenticated:

```txt
/healthz
/readyz
/api/auth/login
```

All other routes must require authentication and RBAC.

---

## 11. Add RBAC Verification Tests

Required checks:

```txt
teacher → 403 on T1 finance table
teacher → 200 on own T3 data
teacher → no DOB
teacher → no Medical Notes
teacher → no parent contact
teacher → no payments
smm → leads/trials/activities/channel performance allowed
smm → payments/payroll/ledger denied
finance → T1 allowed
finance → generic student browsing denied
office_admin → T2 and T3 allowed
office_admin → T1 denied
tech_admin → diagnostics allowed
tech_admin → record data denied unless break-glass
owner → all allowed
```

---

## 12. RBAC Exit Criteria

RBAC is complete when:

```txt
deny-by-default is enforced
all roles are mapped
all tier rules are implemented
Phase 1 is read-only
field-level redactions work
generic renderer is owner-only
teacher cannot access T1
teacher can access permitted T3
tech_admin has no default PII/finance access
RBAC tests pass
```
