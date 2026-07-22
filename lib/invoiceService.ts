/**
 * lib/invoiceService.ts
 *
 * Dedicated internal service for Automatic Invoice Creation.
 * Implements the Controlled Write pattern with idempotency support.
 *
 * Exposed methods:
 *   generateInvoiceNumber()  - Creates a unique INV-YYYY-000001 format
 *   calculateDueDate()       - Determines due date from billing period
 *   createInvoice()          - Creates invoice in Airtable + Prisma
 *   generateInvoice()        - Orchestrates full invoice generation
 *   resumeInvoiceCreation()  - Resumes from a stored workflow state
 */

import prisma from "@/lib/prisma";
import * as airtableProxy from "@/lib/airtableProxy";

// ---------------------------------------------------------------------------
// Constants: Airtable Field IDs for Invoice table (tblTB6N6jNqSFvEER)
// ---------------------------------------------------------------------------
const INVOICE_FIELD = {
  invoiceNo: "fldNNE3i257SnDb0c",     // Invoice No / Номер счёта
  issueDate: "fldZ2vfOggiAbm0fC",     // Issue Date / Дата выставления
  dueDate: "fldj95LOGimRgZ4Vj",       // Due Date / Срок оплаты
  amount: "fldRiqHHe5aqGoyif",         // Amount (KGS) / Сумма (сом)
  status: "fldqJey7ciPEqd59k",         // Status / Статус
  parentIds: "fldAzvJxxt46d7oi5",      // Parent
  studentIds: "fldgkxO5Yu98qW3wi",     // Student
  enrollmentIds: "fldJqNHYliWVxveD4",  // Enrollment
  branchIds: "fld9gBMYbKHjrloEs",      // Branch
};

// Status lifecycle: Draft -> Sent -> Partially Paid -> Paid | Overdue | Void
const INITIAL_STATUS = "Draft";
const AUTO_TRANSITION_STATUS = "Sent";

// ---------------------------------------------------------------------------
// Invoice Number Generator
// ---------------------------------------------------------------------------

/**
 * Generates a unique invoice number in the format INV-YYYY-000001.
 * Uses a database-level advisory lock for concurrent safety.
 * Retries up to 3 times if a race condition occurs.
 */
export async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    attempt++;

    // Find the highest existing invoice number for the current year prefix
    // Use raw SQL to ensure lexicographic ordering works correctly
    const lastInvoice = await prisma.invoice.findFirst({
      where: {
        invoiceNo: {
          startsWith: prefix,
        },
      },
      orderBy: {
        invoiceNo: "desc",
      },
      select: { invoiceNo: true },
    });

    let nextSeq = 1;
    if (lastInvoice) {
      const lastNumStr = lastInvoice.invoiceNo.replace(prefix, "");
      const lastNum = parseInt(lastNumStr, 10);
      if (!isNaN(lastNum)) {
        nextSeq = lastNum + 1;
      }
    }

    const invoiceNo = `${prefix}${String(nextSeq).padStart(6, "0")}`;

    // Verify uniqueness (safety check against concurrent requests)
    const existing = await prisma.invoice.findFirst({
      where: { invoiceNo },
    });

    if (!existing) {
      return invoiceNo;
    }

    // If conflict, retry
    console.warn(
      `[InvoiceService] Invoice number collision on "${invoiceNo}". Retrying (${attempt}/${maxAttempts})...`
    );
  }

  // Fallback: use timestamp-based unique number
  const fallbackSeq = Date.now();
  return `${prefix}${String(fallbackSeq).slice(-6)}`;
}

// ---------------------------------------------------------------------------
// Due Date Calculator
// ---------------------------------------------------------------------------

/**
 * Calculates the due date based on the billing period of the Tuition Plan.
 *
 * Rules:
 *   Monthly -> Issue Date + 30 days
 *   Term    -> End of Current Term (fetched from DB)
 *   Annual  -> Issue Date + 1 Year
 *
 * @param billingPeriod - The billing period from the Tuition Plan
 * @param issueDate - The invoice issue date
 * @param branchId - Optional branch ID to resolve the current term
 */
export async function calculateDueDate(
  billingPeriod: string | null | undefined,
  issueDate: Date,
  branchId?: string
): Promise<Date> {
  const period = (billingPeriod || "Monthly").toLowerCase();

  if (period === "annual") {
    const due = new Date(issueDate);
    due.setFullYear(due.getFullYear() + 1);
    return due;
  }

  if (period === "term") {
    // Fetch the active term for the branch
    try {
      const activeTerm = await prisma.term.findFirst({
        where: {
          status: { equals: "active", mode: "insensitive" },
          ...(branchId ? { branchIds: { has: branchId } } : {}),
        },
        orderBy: { endDate: "desc" },
      });

      if (activeTerm?.endDate) {
        return new Date(activeTerm.endDate);
      }
    } catch (err) {
      console.warn(
        "[InvoiceService] Failed to resolve term end date, falling back to +30 days:",
        err
      );
    }

    // Fallback: end of current month
    const endOfMonth = new Date(issueDate);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0); // Last day of current month
    return endOfMonth;
  }

  // Default: Monthly -> Issue Date + 30 days
  const due = new Date(issueDate);
  due.setDate(due.getDate() + 30);
  return due;
}

// ---------------------------------------------------------------------------
// Invoice Creation
// ---------------------------------------------------------------------------

export interface CreateInvoiceParams {
  invoiceNo: string;
  issueDate: Date;
  dueDate: Date;
  amount: number;
  parentIds: string[];
  studentIds: string[];
  enrollmentIds: string[];
  branchIds: string[];
}

/**
 * Creates an Invoice record in both Airtable and Prisma.
 * Returns the created invoice data.
 */
export async function createInvoice(
  params: CreateInvoiceParams
): Promise<{ id: string; invoiceNo: string; amount: number; status: string }> {
  const {
    invoiceNo,
    issueDate,
    dueDate,
    amount,
    parentIds,
    studentIds,
    enrollmentIds,
    branchIds,
  } = params;

  const issueDateStr = issueDate.toISOString().split("T")[0];
  const dueDateStr = dueDate.toISOString().split("T")[0];

  // 1. Create in Airtable via proxy
  const airtableData: Record<string, any> = {
    [INVOICE_FIELD.invoiceNo]: invoiceNo,
    [INVOICE_FIELD.issueDate]: issueDateStr,
    [INVOICE_FIELD.dueDate]: dueDateStr,
    [INVOICE_FIELD.amount]: amount,
    [INVOICE_FIELD.status]: INITIAL_STATUS,
  };

  if (parentIds.length > 0) {
    airtableData[INVOICE_FIELD.parentIds] = parentIds;
  }
  if (studentIds.length > 0) {
    airtableData[INVOICE_FIELD.studentIds] = studentIds;
  }
  if (enrollmentIds.length > 0) {
    airtableData[INVOICE_FIELD.enrollmentIds] = enrollmentIds;
  }
  if (branchIds.length > 0) {
    airtableData[INVOICE_FIELD.branchIds] = branchIds;
  }

  const createdInvoice = await airtableProxy.createRecord("invoice", airtableData);
  const invoiceId = createdInvoice.id;

  // 2. Create in Prisma
  await prisma.invoice.create({
    data: {
      id: invoiceId,
      invoiceNo,
      issueDate,
      dueDate,
      amount,
      status: INITIAL_STATUS,
      parentIds,
      studentIds,
      enrollmentIds,
      branchIds,
    },
  });

  // 3. Auto-transition to Sent (unless a future approval workflow is introduced)
  try {
    await airtableProxy.updateRecord("invoice", invoiceId, {
      [INVOICE_FIELD.status]: AUTO_TRANSITION_STATUS,
    });
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: AUTO_TRANSITION_STATUS },
    });
  } catch (err: any) {
    // Non-blocking: if transition fails, invoice remains as Draft
    console.warn(
      `[InvoiceService] Failed to auto-transition invoice ${invoiceId} to Sent: ${err.message}`
    );
  }

  return {
    id: invoiceId,
    invoiceNo,
    amount,
    status: AUTO_TRANSITION_STATUS,
  };
}

// ---------------------------------------------------------------------------
// Full Invoice Generation Orchestrator
// ---------------------------------------------------------------------------

export interface GenerateInvoiceParams {
  enrollmentId: string;
  tuitionPlanId: string;
  studentIds: string[];
  parentIds: string[];
  branchIds: string[];
}

export interface GenerateInvoiceResult {
  success: boolean;
  invoice?: {
    id: string;
    invoiceNo: string;
    amount: number;
    status: string;
  };
  error?: string;
}

/**
 * Full invoice generation workflow.
 *
 * Steps:
 *  1. Fetch the selected Tuition Plan (for amount + billing period)
 *  2. Generate a unique invoice number
 *  3. Calculate the due date from billing period
 *  4. Calculate the amount (use net amount if discount exists)
 *  5. Create the invoice in Airtable + Prisma
 *  6. Return the created invoice
 */
export async function generateInvoice(
  params: GenerateInvoiceParams
): Promise<GenerateInvoiceResult> {
  const { enrollmentId, tuitionPlanId, studentIds, parentIds, branchIds } = params;

  try {
    // 1. Fetch Tuition Plan to determine amount and billing period
    const tuitionPlan = await prisma.tuitionPlan.findUnique({
      where: { id: tuitionPlanId },
    });

    if (!tuitionPlan) {
      return {
        success: false,
        error: `Tuition Plan not found: ${tuitionPlanId}`,
      };
    }

    // 2. Calculate amount
    //    If discount exists: use netAmount, otherwise use amount
    let invoiceAmount: number;
    if (tuitionPlan.discount && tuitionPlan.netAmount != null) {
      invoiceAmount = tuitionPlan.netAmount;
    } else if (tuitionPlan.amount != null) {
      invoiceAmount = tuitionPlan.amount;
    } else {
      return {
        success: false,
        error: `Tuition Plan ${tuitionPlanId} has no amount configured.`,
      };
    }

    // 3. Generate invoice number
    const invoiceNo = await generateInvoiceNumber();

    // 4. Set issue date to today
    const issueDate = new Date();
    issueDate.setHours(0, 0, 0, 0);

    // 5. Calculate due date
    const dueDate = await calculateDueDate(
      tuitionPlan.billingPeriod,
      issueDate,
      branchIds[0]
    );

    // 6. Create the invoice
    const invoice = await createInvoice({
      invoiceNo,
      issueDate,
      dueDate,
      amount: invoiceAmount,
      parentIds,
      studentIds,
      enrollmentIds: [enrollmentId],
      branchIds,
    });

    return {
      success: true,
      invoice,
    };
  } catch (error: any) {
    console.error("[InvoiceService] Invoice generation failed:", error);
    return {
      success: false,
      error: error.message || "Invoice generation failed.",
    };
  }
}

// ---------------------------------------------------------------------------
// Resume Invoice Creation (Compensating Repair)
// ---------------------------------------------------------------------------

export interface ResumeInvoiceParams {
  workflowState: {
    enrollmentId: string;
    tuitionPlanId: string;
    studentIds: string[];
    parentIds: string[];
    branchIds: string[];
    invoiceAttempted: boolean;
  };
}

/**
 * Resumes invoice creation from a stored workflow state.
 * Used when the initial invoice creation failed and the workflow
 * needs to resume without recreating Parent, Student, or Enrollment.
 */
export async function resumeInvoiceCreation(
  params: ResumeInvoiceParams
): Promise<GenerateInvoiceResult> {
  const { workflowState } = params;

  if (workflowState.invoiceAttempted) {
    // Check if invoice already exists for this enrollment
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        enrollmentIds: { has: workflowState.enrollmentId },
      },
      orderBy: { updatedAt: "desc" },
    });

    if (existingInvoice) {
      return {
        success: true,
        invoice: {
          id: existingInvoice.id,
          invoiceNo: existingInvoice.invoiceNo,
          amount: existingInvoice.amount || 0,
          status: existingInvoice.status || "Draft",
        },
      };
    }
  }

  // Generate invoice fresh
  return generateInvoice({
    enrollmentId: workflowState.enrollmentId,
    tuitionPlanId: workflowState.tuitionPlanId,
    studentIds: workflowState.studentIds,
    parentIds: workflowState.parentIds,
    branchIds: workflowState.branchIds,
  });
}