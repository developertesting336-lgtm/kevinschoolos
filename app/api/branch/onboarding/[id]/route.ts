import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { normalizeRole } from "@/lib/rbac";
import * as airtableProxy from "@/lib/airtableProxy";
import { auditService } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * Allowed onboarding field IDs (field IDs, never display names)
 * Maps to Prisma model fields for 12 Enrollments
 */
const ONBOARDING_FIELD_MAP: Record<string, string> = {
  "fldV0VR7E7xehetvI": "onboardingStatus",
  "fldF5fb9UFQNHmObG": "scheduleDelivered",
  "fldhH2aL9TJzK7bVR": "calendarDelivered",
  "fldaLd0966SrwZDJv": "appInstructionsDelivered",
  "fldWj3sCWbxwJnzNq": "audioRecommendationsDelivered",
  "fldblwDp8eo6EwKGB": "contractSigned",
  "fldi8KyGXRj5tuhoH": "contractDate",
  "fldgQdBDRMGXJ2OUH": "contractFile",
  "fldz8xpBExqXB546O": "hdSystemRegistered",
  "fldtgJU9259Sf78x9": "appCredentialsIssued",
  "fld0vvw0hpO2FZr3F": "firstLessonConfirmed",
  "fldMIiRIiEkU32lGv": "firstLessonDate",
};

/** Valid onboarding statuses */
const VALID_ONBOARDING_STATUSES = ["Pending", "In Progress","Complete"];

/** Allowed onboarding field IDs set for fast lookup */
const ALLOWED_FIELD_IDS = new Set(Object.keys(ONBOARDING_FIELD_MAP));


export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate
    const session = await validateSession();
    if (!session) {
      auditService.logFailure(undefined, "PERMISSION_DENIED", "Enrollment", "No active session.", request);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch user with role and branch info
    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, role: true, branchIds: true },
    });
    if (!dbUser) {
      auditService.logFailure(undefined, "PERMISSION_DENIED", "User", `User ${session.userId} not found.`, request);
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const userRole = dbUser.role || "staff";
    const normRole = normalizeRole(userRole);

    // 3. RBAC: only Owner or Office Admin
    if (!["owner", "office_admin"].includes(normRole)) {
      auditService.logFailure(
        { id: dbUser.id, email: dbUser.email, role: userRole },
        "PERMISSION_DENIED",
        "Enrollment",
        `Role '${userRole}' not permitted for onboarding writes.`,
        request
      );
      return NextResponse.json({ error: "Forbidden: insufficient permissions." }, { status: 403 });
    }

    // 4. Fetch enrollment
    const { id: enrollmentId } = await params;
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      auditService.logFailure(
        { id: dbUser.id, email: dbUser.email, role: userRole },
        "VIEW",
        "Enrollment",
        `Enrollment ${enrollmentId} not found.`,
        request
      );
      return NextResponse.json({ error: "Enrollment not found." }, { status: 404 });
    }

    // 5. Branch scoping: Never trust client. Use session user's branches.
    const userBranchIds = dbUser.branchIds || [];
    const enrollmentBranchIds = enrollment.branchIds || [];
    const hasBranchAccess = userBranchIds.some((bId: string) => enrollmentBranchIds.includes(bId));

    if (!hasBranchAccess && normRole !== "owner") {
      auditService.logFailure(
        { id: dbUser.id, email: dbUser.email, role: userRole },
        "PERMISSION_DENIED",
        "Enrollment",
        `User ${dbUser.id} does not have branch access to enrollment ${enrollmentId}.`,
        request
      );
      return NextResponse.json({ error: "Forbidden: enrollment not in your branch." }, { status: 403 });
    }

    // 6. Parse request body
    const body = await request.json();
    const { fields } = body; // fields: Record<fieldId, value>

    if (!fields || typeof fields !== "object" || Object.keys(fields).length === 0) {
      return NextResponse.json({ error: "No fields provided for update." }, { status: 400 });
    }

    // 7. Validate: Only allow onboarding field IDs
    const requestedFieldIds = Object.keys(fields);
    const unauthorizedFields = requestedFieldIds.filter((fid) => !ALLOWED_FIELD_IDS.has(fid));

    if (unauthorizedFields.length > 0) {
      return NextResponse.json(
        { error: `Cannot write to non-onboarding fields: ${unauthorizedFields.join(", ")}` },
        { status: 400 }
      );
    }

    // 8. Field-level validation
    const errors: string[] = [];
    const updateData: Record<string, any> = {};
    const changedFieldIds: string[] = [];

    for (const [fieldId, value] of Object.entries(fields)) {
      const prismaField = ONBOARDING_FIELD_MAP[fieldId];

      switch (fieldId) {
        // Onboarding Status: Must be a valid status
        case "fldV0VR7E7xehetvI": {
          if (typeof value !== "string" || !VALID_ONBOARDING_STATUSES.includes(value)) {
            errors.push(`Invalid onboarding status: "${value}". Must be one of: ${VALID_ONBOARDING_STATUSES.join(", ")}`);
            continue;
          }
          updateData[prismaField] = value;
          changedFieldIds.push(fieldId);
          break;
        }

        // Delivery Checkboxes: Boolean only
        case "fldF5fb9UFQNHmObG":
        case "fldhH2aL9TJzK7bVR":
        case "fldaLd0966SrwZDJv":
        case "fldWj3sCWbxwJnzNq":
        // HD System: Boolean only
        case "fldz8xpBExqXB546O":
        // App Credentials: Boolean flag only (never store actual credentials)
        case "fldtgJU9259Sf78x9":
        // Contract Signed: Boolean
        case "fldblwDp8eo6EwKGB":
        // First Lesson Confirmed: Boolean
        case "fld0vvw0hpO2FZr3F": {
          if (typeof value !== "boolean") {
            errors.push(`Field ${fieldId} must be a boolean.`);
            continue;
          }
          updateData[prismaField] = value;
          changedFieldIds.push(fieldId);
          break;
        }

        // Contract Date: Required if contract signed
        case "fldi8KyGXRj5tuhoH": {
          const contractSigned = fields["fldblwDp8eo6EwKGB"] ?? enrollment.contractSigned;
          if (contractSigned === true) {
            if (!value) {
              errors.push("Contract Date is required when Contract Signed is true.");
              continue;
            }
            const dateVal = new Date(value as string);
            if (isNaN(dateVal.getTime())) {
              errors.push("Invalid Contract Date format.");
              continue;
            }
            updateData[prismaField] = dateVal;
          } else {
            // Allow clearing the date if contract is unsigned
            updateData[prismaField] = value ? new Date(value as string) : null;
          }
          changedFieldIds.push(fieldId);
          break;
        }

        // Contract File: Optional (file upload handled separately)
        case "fldgQdBDRMGXJ2OUH": {
          changedFieldIds.push(fieldId);
          // Contract file URLs stored as JSON array
          updateData[prismaField] = value ? JSON.stringify(value) : null;
          break;
        }

        // First Lesson Date: Required if confirmed
        case "fldMIiRIiEkU32lGv": {
          const confirmed = fields["fld0vvw0hpO2FZr3F"] ?? enrollment.firstLessonConfirmed;
          if (confirmed === true) {
            if (!value) {
              errors.push("First Lesson Date is required when First Lesson Confirmed is true.");
              continue;
            }
            const dateVal = new Date(value as string);
            if (isNaN(dateVal.getTime())) {
              errors.push("Invalid First Lesson Date format.");
              continue;
            }
            updateData[prismaField] = dateVal;
          } else {
            updateData[prismaField] = value ? new Date(value as string) : null;
          }
          changedFieldIds.push(fieldId);
          break;
        }

        default: {
          errors.push(`Unknown or unmodifiable field: ${fieldId}`);
          break;
        }
      }
    }

    // If validation errors exist, return them
    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, errors },
        { status: 400 }
      );
    }

    // If no fields changed, return early
    if (changedFieldIds.length === 0) {
      return NextResponse.json(
        { success: true, message: "No changes detected." }
      );
    }

    // 9. Build Airtable update payload (field IDs only)
    const airtableData: Record<string, any> = {};
    const prismaUpdateData: Record<string, any> = {};

    for (const fieldId of changedFieldIds) {
      const prismaField = ONBOARDING_FIELD_MAP[fieldId];
      const value = updateData[prismaField];

      // Map to Airtable format
      switch (fieldId) {
        case "fldV0VR7E7xehetvI": // Onboarding Status
          airtableData[fieldId] = value;
          prismaUpdateData[prismaField] = value;
          break;

        case "fldF5fb9UFQNHmObG": // Schedule Delivered
        case "fldhH2aL9TJzK7bVR": // Calendar Delivered
        case "fldaLd0966SrwZDJv": // App Instructions
        case "fldWj3sCWbxwJnzNq": // Audio Recommendations
        case "fldblwDp8eo6EwKGB": // Contract Signed
        case "fldz8xpBExqXB546O": // HD System
        case "fldtgJU9259Sf78x9": // App Credentials
        case "fld0vvw0hpO2FZr3F": // First Lesson Confirmed
          airtableData[fieldId] = value;
          prismaUpdateData[prismaField] = value;
          break;

        case "fldi8KyGXRj5tuhoH": // Contract Date
        case "fldMIiRIiEkU32lGv": // First Lesson Date
          airtableData[fieldId] = value ? value.toISOString() : null;
          prismaUpdateData[prismaField] = value;
          break;

        case "fldgQdBDRMGXJ2OUH": // Contract File
          // Attachment field in Airtable - only store in Postgres reference
          prismaUpdateData[prismaField] = value;
          break;
      }
    }

    // 10. Write to both Airtable and Postgres
    // Write to Airtable first (source of truth)
    try {
      await airtableProxy.updateRecord("enrollment", enrollment.id, airtableData);
    } catch (airtableError: any) {
      console.error("[Onboarding Write] Airtable update failed:", airtableError);
      return NextResponse.json(
        { error: "Failed to sync with Airtable. Changes not saved.", details: airtableError.message },
        { status: 502 }
      );
    }

    // Update local Postgres
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: prismaUpdateData,
    });

    // 11. Audit logging with field IDs only (no PII)
    auditService.log(
      {
        actorId: dbUser.id,
        actorEmail: dbUser.email,
        role: userRole,
        action: "UPDATE",
        tableName: "Enrollment",
        recordId: enrollment.id,
        fieldIds: changedFieldIds,
        result: "SUCCESS",
        details: `Onboarding update: ${changedFieldIds.length} field(s) modified. Record ${enrollment.id}.`,
      },
      request
    );

    // 12. Return success response
    return NextResponse.json({
      success: true,
      message: "Onboarding checklist updated successfully.",
      updatedFields: changedFieldIds,
    });

  } catch (error: any) {
    console.error("[Onboarding PATCH Error]", error);
    return NextResponse.json(
      { error: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}

// Block GET, POST, DELETE on this route
export async function GET() {
  return NextResponse.json(
    { error: "Use GET /api/branch/onboarding for list." },
    { status: 405 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: "Phase 3 writes only via PATCH for specific enrollment." },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Deletes not permitted on onboarding." },
    { status: 405 }
  );
}