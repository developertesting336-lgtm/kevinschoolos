import prisma from "../lib/prisma";
import crypto from "crypto";

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

const users: { [key: string]: { role: string; fullName: string } } = {
  "user-owner-rbac": { role: "owner", fullName: "Test Owner" },
  "user-finance-rbac": { role: "finance", fullName: "Test Finance" },
  "user-admin-rbac": { role: "office_admin", fullName: "Test Admin" },
  "user-teacher-rbac": { role: "teacher", fullName: "Test Teacher" },
  "user-smm-rbac": { role: "smm", fullName: "Test SMM" },
  "user-tech-rbac": { role: "tech_admin", fullName: "Test Tech Admin" },
  "user-cleaner-rbac": { role: "cleaner", fullName: "Test Cleaner" }
};

const sessions: { [key: string]: string } = {};

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function setupMockData() {
  console.log("Setting up mock database records for RBAC testing...");

  // 1. Create Mock Branch
  await prisma.branch.upsert({
    where: { id: "branch-test-rbac" },
    update: {},
    create: {
      id: "branch-test-rbac",
      name: "RBAC Test Branch",
      city: "Test City",
      status: "active"
    }
  });

  // 2. Create Users, Secrets, and Sessions
  for (const [userId, info] of Object.entries(users)) {
    // Upsert User
    await prisma.user.upsert({
      where: { id: userId },
      update: {
        role: info.role,
        branchIds: ["branch-test-rbac"]
      },
      create: {
        id: userId,
        fullName: info.fullName,
        role: info.role,
        branchIds: ["branch-test-rbac"],
        status: "active"
      }
    });

    // Create Session
    const token = `token-${userId}-session-secure-unique-string`;
    const hashed = hashToken(token);
    sessions[userId] = token;

    await prisma.userSession.upsert({
      where: { id: hashed },
      update: {
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        lastActiveAt: new Date()
      },
      create: {
        id: hashed,
        userId: userId,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        lastActiveAt: new Date()
      }
    });
  }

  // 3. Create Operational Data (T3)
  await prisma.classGroup.upsert({
    where: { id: "group-test-rbac" },
    update: {},
    create: {
      id: "group-test-rbac",
      groupName: "RBAC Test Class Group",
      status: "active",
      teacherIds: ["user-teacher-rbac"],
      branchIds: ["branch-test-rbac"]
    }
  });

  // 4. Create PII/Reference Data (T2)
  await prisma.student.upsert({
    where: { id: "student-test-rbac" },
    update: {},
    create: {
      id: "student-test-rbac",
      studentName: "RBAC Test Student",
      dateOfBirth: new Date("2015-05-05"),
      medicalNotes: "Has allergy",
      branchIds: ["branch-test-rbac"]
    }
  });

  await prisma.parent.upsert({
    where: { id: "parent-test-rbac" },
    update: {},
    create: {
      id: "parent-test-rbac",
      parentName: "RBAC Test Parent",
      phone: "+123456789",
      whatsapp: "+123456789",
      email: "parent@test.com",
      branchIds: ["branch-test-rbac"],
      studentIds: ["student-test-rbac"]
    }
  });

  await prisma.enrollment.upsert({
    where: { id: "enrollment-test-rbac" },
    update: {},
    create: {
      id: "enrollment-test-rbac",
      enrollmentId: "ENROLL-RBAC",
      status: "active",
      studentIds: ["student-test-rbac"],
      classGroupIds: ["group-test-rbac"],
      branchIds: ["branch-test-rbac"]
    }
  });

  // 5. Create T1 Financial Data
  await prisma.account.upsert({
    where: { id: "account-test-rbac" },
    update: {},
    create: {
      id: "account-test-rbac",
      accountNo: "1010-RBAC",
      accountName: "RBAC Financial Account",
      active: true,
      branchIds: ["branch-test-rbac"]
    }
  });

  await prisma.payment.upsert({
    where: { id: "payment-test-rbac" },
    update: {},
    create: {
      id: "payment-test-rbac",
      paymentRef: "PAY-RBAC",
      amount: 100,
      branchIds: ["branch-test-rbac"]
    }
  });

  console.log("Mock database records ready.");
}

async function cleanupMockData() {
  console.log("Cleaning up mock database records...");

  const deleteIds = {
    sessions: Object.values(sessions).map(hashToken),
    users: Object.keys(users)
  };

  try {
    await prisma.userSession.deleteMany({ where: { id: { in: deleteIds.sessions } } });
    await prisma.user.deleteMany({ where: { id: { in: deleteIds.users } } });
    await prisma.enrollment.deleteMany({ where: { id: "enrollment-test-rbac" } });
    await prisma.classGroup.deleteMany({ where: { id: "group-test-rbac" } });
    await prisma.student.deleteMany({ where: { id: "student-test-rbac" } });
    await prisma.parent.deleteMany({ where: { id: "parent-test-rbac" } });
    await prisma.account.deleteMany({ where: { id: "account-test-rbac" } });
    await prisma.payment.deleteMany({ where: { id: "payment-test-rbac" } });
    await prisma.branch.deleteMany({ where: { id: "branch-test-rbac" } });
    console.log("Mock database clean up complete.");
  } catch (e) {
    console.error("Error during cleanup:", e);
  }
}

async function makeRequest(token: string, path: string, method: string = "GET"): Promise<{ status: number; body: unknown }> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        Cookie: `session=${token}`
      },
      redirect: "manual"
    });

    const status = res.status;
    let body = null;
    try {
      body = await res.json();
    } catch {
      // Not JSON
    }

    return { status, body };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`Request failed to ${path}:`, errMsg);
    throw err;
  }
}

async function runTests() {
  console.log("\n==================================================");
  console.log("RUNNING RBAC SYSTEM VERIFICATION TESTS");
  console.log("==================================================\n");

  const results: { name: string; passed: boolean; details?: string }[] = [];

  function assertTest(name: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`[PASS] ${name}`);
      results.push({ name, passed: true, details });
    } else {
      console.log(`[FAIL] ${name} | ${details || "Assertion failed"}`);
      results.push({ name, passed: false, details });
    }
  }

  // 1. Authenticated Access - Excluded Cleaner Role check (403)
  try {
    const { status } = await makeRequest(sessions["user-cleaner-rbac"], "/dashboard");
    assertTest("cleaner → 403 on Dashboard page", status === 403 || status === 303 || status === 307, `Status: ${status}`);
  } catch (e) {
    assertTest("cleaner → 403 on Dashboard page", false, String(e));
  }

  // 2. Teacher Checks
  const teacherToken = sessions["user-teacher-rbac"];
  
  // teacher → 403 on T1 finance table (Account)
  try {
    const { status } = await makeRequest(teacherToken, "/api/data/account");
    assertTest("teacher → 403 on T1 finance table (Account)", status === 403, `Status: ${status}`);
  } catch (e) {
    assertTest("teacher → 403 on T1 finance table (Account)", false, String(e));
  }

  // teacher → 200 on own T3 data (ClassGroup)
  try {
    const { status, body } = await makeRequest(teacherToken, "/api/data/classgroup");
    const matchesScope = status === 200 && Array.isArray(body) && body.every(g => g.id === "group-test-rbac");
    assertTest("teacher → 200 on own T3 operational data (ClassGroup)", matchesScope, `Status: ${status}, Body: ${JSON.stringify(body)}`);
  } catch (e) {
    assertTest("teacher → 200 on own T3 operational data (ClassGroup)", false, String(e));
  }

  // teacher → no DOB
  try {
    const { status, body } = await makeRequest(teacherToken, "/api/data/student");
    const noDOB = status === 200 && Array.isArray(body) && body.every(s => s.dateOfBirth === undefined);
    assertTest("teacher → redacted DOB on Student records", noDOB, `Status: ${status}, Body: ${JSON.stringify(body)}`);
  } catch (e) {
    assertTest("teacher → redacted DOB on Student records", false, String(e));
  }

  // teacher → no Medical Notes
  try {
    const { status, body } = await makeRequest(teacherToken, "/api/data/student");
    const noMedNotes = status === 200 && Array.isArray(body) && body.every(s => s.medicalNotes === undefined);
    assertTest("teacher → redacted Medical Notes on Student records", noMedNotes, `Status: ${status}, Body: ${JSON.stringify(body)}`);
  } catch (e) {
    assertTest("teacher → redacted Medical Notes on Student records", false, String(e));
  }

  // teacher → no parent contact
  try {
    const { status, body } = await makeRequest(teacherToken, "/api/data/parent");
    const noContact = status === 200 && Array.isArray(body) && body.every(p => p.phone === undefined && p.email === undefined && p.whatsapp === undefined);
    assertTest("teacher → redacted Parent contact fields", noContact, `Status: ${status}, Body: ${JSON.stringify(body)}`);
  } catch (e) {
    assertTest("teacher → redacted Parent contact fields", false, String(e));
  }

  // teacher → no payments
  try {
    const { status } = await makeRequest(teacherToken, "/api/data/payment");
    assertTest("teacher → 403 on T2 payments", status === 403, `Status: ${status}`);
  } catch (e) {
    assertTest("teacher → 403 on T2 payments", false, String(e));
  }

  // 3. SMM Checks
  const smmToken = sessions["user-smm-rbac"];

  // smm → leads allowed
  try {
    const { status } = await makeRequest(smmToken, "/api/data/lead");
    assertTest("smm → 200 on operational Leads table", status === 200, `Status: ${status}`);
  } catch (e) {
    assertTest("smm → 200 on operational Leads table", false, String(e));
  }

  // smm → payments/payroll/ledger denied
  try {
    const { status: payStatus } = await makeRequest(smmToken, "/api/data/payment");
    const { status: payRunStatus } = await makeRequest(smmToken, "/api/data/teacherpay");
    assertTest("smm → 403 on payments and payroll tables", payStatus === 403 && payRunStatus === 403, `Payment: ${payStatus}, TeacherPay: ${payRunStatus}`);
  } catch (e) {
    assertTest("smm → 403 on payments and payroll tables", false, String(e));
  }

  // 4. Finance Checks
  const financeToken = sessions["user-finance-rbac"];

  // finance → T1 allowed
  try {
    const { status } = await makeRequest(financeToken, "/api/data/account");
    assertTest("finance → 200 on T1 finance table (Account)", status === 200, `Status: ${status}`);
  } catch (e) {
    assertTest("finance → 200 on T1 finance table (Account)", false, String(e));
  }

  // finance → generic student browsing denied
  try {
    const { status } = await makeRequest(financeToken, "/api/data/student");
    assertTest("finance → 403 on general Student browsing", status === 403, `Status: ${status}`);
  } catch (e) {
    assertTest("finance → 403 on general Student browsing", false, String(e));
  }

  // 5. Office Admin Checks
  const adminToken = sessions["user-admin-rbac"];

  // office_admin → T2 and T3 allowed
  try {
    const { status: t2Status } = await makeRequest(adminToken, "/api/data/student");
    const { status: t3Status } = await makeRequest(adminToken, "/api/data/lead");
    assertTest("office_admin → 200 on T2 (Student) and T3 (Lead) tables", t2Status === 200 && t3Status === 200, `Student: ${t2Status}, Lead: ${t3Status}`);
  } catch (e) {
    assertTest("office_admin → 200 on T2 and T3 tables", false, String(e));
  }

  // office_admin → T1 denied
  try {
    const { status } = await makeRequest(adminToken, "/api/data/account");
    assertTest("office_admin → 403 on T1 finance table (Account)", status === 403, `Status: ${status}`);
  } catch (e) {
    assertTest("office_admin → 403 on T1 finance table (Account)", false, String(e));
  }

  // 6. Tech Admin Checks
  const techToken = sessions["user-tech-rbac"];

  // tech_admin → T4 allowed standing
  try {
    const { status } = await makeRequest(techToken, "/api/data/branch");
    assertTest("tech_admin → 200 standing read on T4 Reference table (Branch)", status === 200, `Status: ${status}`);
  } catch (e) {
    assertTest("tech_admin → 200 standing read on T4 Reference table (Branch)", false, String(e));
  }

  // tech_admin → record data denied unless break-glass
  try {
    const { status: standingStatus } = await makeRequest(techToken, "/api/data/student");
    const { status: breakGlassStatus } = await makeRequest(techToken, "/api/data/student?breakGlass=true");
    assertTest("tech_admin → access denied standing but allowed via break-glass", standingStatus === 403 && breakGlassStatus === 200, `Standing: ${standingStatus}, Break-glass: ${breakGlassStatus}`);
  } catch (e) {
    assertTest("tech_admin → access denied standing but allowed via break-glass", false, String(e));
  }

  // 7. Owner Check
  const ownerToken = sessions["user-owner-rbac"];

  // owner → all allowed
  try {
    const { status: t1Status } = await makeRequest(ownerToken, "/api/data/account");
    const { status: t2Status } = await makeRequest(ownerToken, "/api/data/student");
    assertTest("owner → unrestricted 200 access on T1 and T2 tables", t1Status === 200 && t2Status === 200, `T1: ${t1Status}, T2: ${t2Status}`);
  } catch (e) {
    assertTest("owner → unrestricted access", false, String(e));
  }

  // 8. Write Blocking Check
  try {
    const { status: postStatus } = await makeRequest(ownerToken, "/api/data/student", "POST");
    const { status: putStatus } = await makeRequest(ownerToken, "/api/data/student", "PUT");
    assertTest("write operations blocked in Phase 1 (POST, PUT -> 403)", postStatus === 403 && putStatus === 403, `POST: ${postStatus}, PUT: ${putStatus}`);
  } catch (e) {
    assertTest("write operations blocked in Phase 1", false, String(e));
  }

  // Final summary
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  console.log("\n==================================================");
  console.log(`TEST RUN SUMMARY: ${passed} / ${total} PASSED`);
  console.log("==================================================\n");

  if (passed === total) {
    console.log("All RBAC rules compiled and verified successfully!");
    process.exit(0);
  } else {
    console.error("Some verification checks failed!");
    process.exit(1);
  }
}

async function main() {
  try {
    await setupMockData();
    await runTests();
  } catch (err) {
    console.error("Test execution aborted due to error:", err);
  } finally {
    await cleanupMockData();
  }
}

main();
