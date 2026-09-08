import { NextRequest, NextResponse } from "next/server";
import { validateSession, hashPassword } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { normalizeRole } from "@/lib/roles";
import { auditService } from "@/lib/audit";
import * as airtableProxy from "@/lib/airtableProxy";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // 1. Validate session
    const session = await validateSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch actor user & check permissions (Owner or Office/Admin only)
    const dbActor = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, role: true, branchIds: true },
    });

    if (!dbActor) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const normActorRole = normalizeRole(dbActor.role || "");
    if (normActorRole !== "owner" && normActorRole !== "office_admin") {
      auditService.logFailure(
        { id: dbActor.id, email: dbActor.email, role: dbActor.role },
        "PERMISSION_DENIED",
        "User",
        "User creation is restricted to Owner and Office/Admin roles.",
        request
      );
      return NextResponse.json(
        { error: "Insufficient permissions. Only Owner or Office/Admin can create users." },
        { status: 403 }
      );
    }

    // 3. Parse and validate request body
    const body = await request.json();
    const { fullName, role, email, phone, status, branchIds, password } = body;

    if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
      return NextResponse.json({ error: "Username / Full Name is required." }, { status: 400 });
    }

    if (!role || typeof role !== "string" || !role.trim()) {
      return NextResponse.json({ error: "Role is required." }, { status: 400 });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Password is required and must be at least 6 characters long." },
        { status: 400 }
      );
    }

    // 3.5 Duplicate Email & Phone Validation
    const cleanEmail = typeof email === "string" ? email.trim() : "";
    const cleanPhone = typeof phone === "string" ? phone.trim() : "";

    if (cleanEmail) {
      const existingEmailUser = await prisma.user.findFirst({
        where: {
          email: { equals: cleanEmail, mode: "insensitive" },
        },
        select: { id: true, fullName: true, email: true },
      });
      if (existingEmailUser) {
        return NextResponse.json(
          { error: `A user with email "${cleanEmail}" already exists (${existingEmailUser.fullName}).` },
          { status: 400 }
        );
      }
    }

    if (cleanPhone) {
      const existingPhoneUser = await prisma.user.findFirst({
        where: {
          phone: { equals: cleanPhone, mode: "insensitive" },
        },
        select: { id: true, fullName: true, phone: true },
      });
      if (existingPhoneUser) {
        return NextResponse.json(
          { error: `A user with phone number "${cleanPhone}" already exists (${existingPhoneUser.fullName}).` },
          { status: 400 }
        );
      }
    }

    const finalStatus = status || "Active";
    const finalBranchIds = Array.isArray(branchIds) ? branchIds : branchIds ? [branchIds] : [];

    // 4. Sync / Store record in Airtable ("02 Users / Сотрудники" - tblUkEhqFJBFTvRN5)
    const airtableFields: Record<string, any> = {
      "fldEzRbCBDmjzZ9m1": fullName.trim(), // Full Name / ФИО
      "fldBQj0DH9vw7eGiu": role.trim(),     // Role / Роль
      "fldEHvzfg1t5j5LHb": finalStatus,     // Status / Статус
    };

    if (email?.trim()) {
      airtableFields["fldsj0eFf9lvCwt15"] = email.trim(); // Email / Эл. почта
    }
    if (phone?.trim()) {
      airtableFields["fldzowV5r6HHYqMVZ"] = phone.trim(); // Phone / Телефон
    }

    const validBranchRecIds = finalBranchIds.filter((bId: string) => typeof bId === "string" && bId.startsWith("rec"));
    if (validBranchRecIds.length > 0) {
      airtableFields["fldtcpukcdFqHp8wi"] = validBranchRecIds; // Branch linked record
    }

    let airtableRecordId: string | null = null;
    try {
      const createdAirtable = await airtableProxy.createRecord("User", airtableFields);
      if (createdAirtable?.id) {
        airtableRecordId = createdAirtable.id;
      }
    } catch (airtableErr: any) {
      console.warn("[User API POST] Airtable createRecord warning:", airtableErr.message || airtableErr);
    }

    // Generate user ID (use Airtable rec ID if available for consistency)
    const newUserId = airtableRecordId || `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    // 5. Hash password with Argon2id
    const hashedPassword = await hashPassword(password);

    // 6. Create or Upsert User & UserSecret in Prisma transaction
    const [newUser] = await prisma.$transaction([
      prisma.user.upsert({
        where: { id: newUserId },
        update: {
          fullName: fullName.trim(),
          role: role.trim(),
          email: email?.trim() || null,
          phone: phone?.trim() || null,
          status: finalStatus,
          branchIds: finalBranchIds,
        },
        create: {
          id: newUserId,
          fullName: fullName.trim(),
          role: role.trim(),
          email: email?.trim() || null,
          phone: phone?.trim() || null,
          status: finalStatus,
          branchIds: finalBranchIds,
        },
      }),
      prisma.userSecret.upsert({
        where: { userId: newUserId },
        update: {
          passwordHash: hashedPassword,
          loginAttempts: 0,
          lockoutUntil: null,
        },
        create: {
          userId: newUserId,
          passwordHash: hashedPassword,
          loginAttempts: 0,
          lockoutUntil: null,
        },
      }),
    ]);

    // 7. Audit log
    auditService.log(
      {
        actorId: dbActor.id,
        actorEmail: dbActor.email,
        role: dbActor.role || "staff",
        branchIds: dbActor.branchIds || [],
        action: "CREATE",
        tableName: "User",
        recordIds: [newUser.id],
        fieldIds: ["id", "fullName", "role", "email", "phone", "status", "branchIds"],
        result: "SUCCESS",
        details: `Created user ${newUser.fullName} (${newUser.role}) in Postgres & Airtable.`,
      },
      request
    );

    return NextResponse.json({ success: true, user: newUser });
  } catch (error: any) {
    console.error("[User API POST Error]", error);
    return NextResponse.json(
      { error: error.message || "Failed to create user." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // 1. Validate session
    const session = await validateSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch actor user & check permissions (Owner or Office/Admin only)
    const dbActor = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, role: true, branchIds: true },
    });

    if (!dbActor) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const normActorRole = normalizeRole(dbActor.role || "");
    if (normActorRole !== "owner" && normActorRole !== "office_admin") {
      auditService.logFailure(
        { id: dbActor.id, email: dbActor.email, role: dbActor.role },
        "PERMISSION_DENIED",
        "User",
        "User modification is restricted to Owner and Office/Admin roles.",
        request
      );
      return NextResponse.json(
        { error: "Insufficient permissions. Only Owner or Office/Admin can edit users." },
        { status: 403 }
      );
    }

    // 3. Parse and validate request body
    const body = await request.json();
    const { id, fullName, role, email, phone, status, branchIds, password } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
      return NextResponse.json({ error: "Username / Full Name is required." }, { status: 400 });
    }

    if (!role || typeof role !== "string" || !role.trim()) {
      return NextResponse.json({ error: "Role is required." }, { status: 400 });
    }

    // 4. Verify target user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "Target user not found." }, { status: 404 });
    }

    // 4.5 Duplicate Email & Phone Validation (excluding current user id)
    const cleanEmail = typeof email === "string" ? email.trim() : "";
    const cleanPhone = typeof phone === "string" ? phone.trim() : "";

    if (cleanEmail) {
      const existingEmailUser = await prisma.user.findFirst({
        where: {
          email: { equals: cleanEmail, mode: "insensitive" },
          NOT: { id },
        },
        select: { id: true, fullName: true, email: true },
      });
      if (existingEmailUser) {
        return NextResponse.json(
          { error: `A user with email "${cleanEmail}" already exists (${existingEmailUser.fullName}).` },
          { status: 400 }
        );
      }
    }

    if (cleanPhone) {
      const existingPhoneUser = await prisma.user.findFirst({
        where: {
          phone: { equals: cleanPhone, mode: "insensitive" },
          NOT: { id },
        },
        select: { id: true, fullName: true, phone: true },
      });
      if (existingPhoneUser) {
        return NextResponse.json(
          { error: `A user with phone number "${cleanPhone}" already exists (${existingPhoneUser.fullName}).` },
          { status: 400 }
        );
      }
    }

    const finalStatus = status || "Active";
    const finalBranchIds = Array.isArray(branchIds) ? branchIds : branchIds ? [branchIds] : [];

    // 5. Update User record in Postgres
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        fullName: fullName.trim(),
        role: role.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        status: finalStatus,
        branchIds: finalBranchIds,
      },
    });

    // 6. Sync update to Airtable if user ID is an Airtable record ID
    if (id.startsWith("rec")) {
      const airtableFields: Record<string, any> = {
        "fldEzRbCBDmjzZ9m1": fullName.trim(),
        "fldBQj0DH9vw7eGiu": role.trim(),
        "fldEHvzfg1t5j5LHb": finalStatus,
      };

      if (email?.trim()) {
        airtableFields["fldsj0eFf9lvCwt15"] = email.trim();
      }
      if (phone?.trim()) {
        airtableFields["fldzowV5r6HHYqMVZ"] = phone.trim();
      }

      const validBranchRecIds = finalBranchIds.filter((bId: string) => typeof bId === "string" && bId.startsWith("rec"));
      if (validBranchRecIds.length > 0) {
        airtableFields["fldtcpukcdFqHp8wi"] = validBranchRecIds;
      }

      try {
        await airtableProxy.updateRecord("User", id, airtableFields);
      } catch (airtableErr: any) {
        console.warn("[User API PUT] Airtable updateRecord warning:", airtableErr.message || airtableErr);
      }
    }

    // 7. Update password if provided
    let passwordUpdated = false;
    if (password && typeof password === "string" && password.trim().length > 0) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: "New password must be at least 6 characters long." },
          { status: 400 }
        );
      }
      const hashedPassword = await hashPassword(password.trim());
      await prisma.userSecret.upsert({
        where: { userId: id },
        update: {
          passwordHash: hashedPassword,
          loginAttempts: 0,
          lockoutUntil: null,
        },
        create: {
          userId: id,
          passwordHash: hashedPassword,
          loginAttempts: 0,
          lockoutUntil: null,
        },
      });
      passwordUpdated = true;
    }

    // 8. Audit log
    auditService.log(
      {
        actorId: dbActor.id,
        actorEmail: dbActor.email,
        role: dbActor.role || "staff",
        branchIds: dbActor.branchIds || [],
        action: "UPDATE",
        tableName: "User",
        recordIds: [id],
        fieldIds: ["fullName", "role", "email", "phone", "status", "branchIds"],
        result: "SUCCESS",
        details: `Updated user ${updatedUser.fullName} (${updatedUser.role}) in Postgres & Airtable. Password updated: ${passwordUpdated}`,
      },
      request
    );

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error("[User API PUT Error]", error);
    return NextResponse.json(
      { error: error.message || "Failed to update user." },
      { status: 500 }
    );
  }
}

