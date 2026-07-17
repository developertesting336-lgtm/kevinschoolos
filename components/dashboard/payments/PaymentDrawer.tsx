"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ReconciliationBadge } from "./ReconciliationBadge";
import { DuplicateWarning } from "./DuplicateWarning";
import { ConfirmationReceipt } from "./ConfirmationReceipt";
import { PaymentIntakeForm } from "./PaymentIntakeForm";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Info, Receipt, UserPlus, Clipboard, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

interface Payment {
  id: string;
  paymentRef: string;
  date: string | null;
  amount: number | null;
  method: string | null;
  invoiceIds: string[];
  parentIds: string[];
  branchIds: string[];
  possibleDuplicate: boolean;
  paymentType: string | null;
}

interface InvoiceData {
  id: string;
  invoiceNo: string;
  amount: number | null;
  status: string | null;
  studentName?: string;
  parentName?: string;
}

interface EnrollmentLookupData {
  id: string;
  enrollmentId: string;
  studentName?: string;
  courseName?: string;
  branchName?: string;
  status: string | null;
}

interface PaymentDrawerProps {
  payment: Payment | null;
  isOpen: boolean;
  onClose: () => void;
  invoices: InvoiceData[];
  enrollments: EnrollmentLookupData[];
  invoiceMap: Record<string, { invoiceNo: string; studentIds: string[]; enrollmentIds: string[]; amount: number | null; dueDate: string | null; status: string | null }>;
  parentMap: Record<string, { parentName: string; studentIds: string[] }>;
  studentMap: Record<string, { studentName: string }>;
  enrollmentMap: Record<string, { enrollmentId: string; status: string | null; branchIds: string[]; tuitionPlanIds: string[] }>;
  branchMap: Record<string, { name: string }>;
}

export function PaymentDrawer({
  payment,
  isOpen,
  onClose,
  invoices,
  enrollments,
  invoiceMap,
  parentMap,
  studentMap,
  enrollmentMap,
  branchMap,
}: PaymentDrawerProps) {
  const [activeTab, setActiveTab] = useState<"receipt" | "intake">("receipt");

  if (!payment) return null;

  // Resolve relation entities
  const firstInvoiceId = payment.invoiceIds[0] || "";
  const invoice = invoiceMap[firstInvoiceId];
  const invoiceNo = invoice ? invoice.invoiceNo : "—";
  const invoiceAmount = invoice && invoice.amount !== null ? invoice.amount.toFixed(2) : "—";
  const invoiceDueDate = invoice && invoice.dueDate ? format(new Date(invoice.dueDate), "yyyy-MM-dd") : "—";
  const invoiceStatus = invoice ? invoice.status : "—";

  const firstParentId = payment.parentIds[0] || "";
  const parent = parentMap[firstParentId];
  const parentName = parent ? parent.parentName : "—";

  let studentName = "—";
  let firstStudentId = "";
  if (invoice && invoice.studentIds[0]) {
    firstStudentId = invoice.studentIds[0];
    studentName = studentMap[firstStudentId]?.studentName || "—";
  } else if (parent && parent.studentIds[0]) {
    firstStudentId = parent.studentIds[0];
    studentName = studentMap[firstStudentId]?.studentName || "—";
  }

  let enrollmentNo = "—";
  let enrollmentStatus = "—";
  let enrollmentBranch = "—";
  const firstEnrollmentId = (invoice && invoice.enrollmentIds[0]) || "";
  const enrollment = enrollmentMap[firstEnrollmentId];
  if (enrollment) {
    enrollmentNo = enrollment.enrollmentId;
    enrollmentStatus = enrollment.status || "—";
    const branchId = enrollment.branchIds[0] || "";
    enrollmentBranch = branchMap[branchId]?.name || "—";
  }

  // Reconciliation computation
  let recoStatus = "Pending";
  if (payment.possibleDuplicate) {
    recoStatus = "Requires Review";
  } else if (payment.invoiceIds.length > 0) {
    recoStatus = "Reconciled";
  }

  const period = payment.date 
    ? format(new Date(payment.date), "MMMM yyyy") 
    : "—";

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col h-full bg-background border-l border-border/80">
        
        {/* Header section */}
        <div className="p-6 border-b border-border/50 shrink-0">
          <SheetHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                Transaction Profile
              </span>
              <ReconciliationBadge status={recoStatus} />
            </div>
            <SheetTitle className="text-lg font-black text-foreground flex items-center gap-2">
              Payment {payment.paymentRef}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground font-medium">
              Profile details and ledger records mapping for receipt validation.
            </SheetDescription>
          </SheetHeader>

          {/* Switch Tabs */}
          <div className="flex mt-5 bg-muted/30 p-1 rounded-xl border border-border/30">
            <button
              onClick={() => setActiveTab("receipt")}
              className={cn(
                "flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer inline-flex items-center justify-center gap-1.5",
                activeTab === "receipt"
                  ? "bg-background text-foreground shadow-xs border border-border/20"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Receipt className="h-3.5 w-3.5" />
              Receipt Confirmation
            </button>
            <button
              onClick={() => setActiveTab("intake")}
              className={cn(
                "flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer inline-flex items-center justify-center gap-1.5",
                activeTab === "intake"
                  ? "bg-background text-foreground shadow-xs border border-border/20"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Clipboard className="h-3.5 w-3.5" />
              Intake Form Layout
            </button>
          </div>
        </div>

        {/* Scrollable body content */}
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            
            {/* Duplicate Banner */}
            <DuplicateWarning isDuplicate={payment.possibleDuplicate} />

            {activeTab === "receipt" ? (
              <div className="space-y-6">
                {/* Visual Receipt */}
                <ConfirmationReceipt
                  studentName={studentName}
                  parentName={parentName}
                  invoiceNo={invoiceNo}
                  amount={payment.amount}
                  method={payment.method}
                  paymentRef={payment.paymentRef}
                  date={payment.date}
                  paymentType={payment.paymentType}
                />

                {/* Additional Entity linkage info panels */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Invoice Summary */}
                  <div className="border border-border/50 rounded-xl p-4 bg-muted/5 space-y-3">
                    <h5 className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5 border-b border-border/40 pb-1.5">
                      <Receipt className="h-3.5 w-3.5 text-primary" />
                      Invoice Ledger link
                    </h5>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Invoice No:</span>
                        <span className="font-semibold text-foreground font-mono">{invoiceNo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Invoice Amt:</span>
                        <span className="font-semibold text-foreground">${invoiceAmount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Due Date:</span>
                        <span className="text-foreground">{invoiceDueDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ledger Status:</span>
                        <span className="text-foreground font-medium capitalize">{invoiceStatus}</span>
                      </div>
                    </div>
                  </div>

                  {/* Enrollment Summary */}
                  <div className="border border-border/50 rounded-xl p-4 bg-muted/5 space-y-3">
                    <h5 className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5 border-b border-border/40 pb-1.5">
                      <UserPlus className="h-3.5 w-3.5 text-primary" />
                      Enrollment Linkage
                    </h5>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Enrollment ID:</span>
                        <span className="font-semibold text-foreground">{enrollmentNo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Branch:</span>
                        <span className="text-foreground">{enrollmentBranch}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Academic Status:</span>
                        <span className="text-foreground font-medium capitalize">{enrollmentStatus}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Intake Form (Read-only) */
              <PaymentIntakeForm
                invoices={invoices}
                enrollments={enrollments}
                selectedInvoiceId={firstInvoiceId}
                selectedEnrollmentId={firstEnrollmentId}
                paymentRef={payment.paymentRef}
                paymentDate={payment.date || undefined}
                amount={payment.amount || 0}
                paymentMethod={payment.method || undefined}
                paymentType={payment.paymentType || undefined}
              />
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
