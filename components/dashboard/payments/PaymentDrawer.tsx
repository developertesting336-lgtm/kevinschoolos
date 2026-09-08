"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ReconciliationBadge } from "./ReconciliationBadge";
import { DuplicateWarning } from "./DuplicateWarning";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Info, CreditCard, User, Building2, Hash, DollarSign, Tag } from "lucide-react";

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

  const dateFormatted = payment.date
    ? format(new Date(payment.date), "yyyy-MM-dd")
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
              Payment record details for {period}.
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Scrollable body content */}
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">

            {/* Duplicate Banner */}
            <DuplicateWarning isDuplicate={payment.possibleDuplicate} />

            {/* Payment Details Card */}
            <div className="border border-border/50 rounded-xl bg-muted/5 overflow-hidden">
              <div className="px-4 py-3 border-b border-border/40 bg-muted/10">
                <h5 className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-primary" />
                  Payment Details
                </h5>
              </div>
              <div className="divide-y divide-border/30">
                <div className="flex items-center justify-between px-4 py-3 text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Hash className="h-3 w-3" /> Payment Ref
                  </span>
                  <span className="font-semibold font-mono text-foreground">{payment.paymentRef}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3 text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <DollarSign className="h-3 w-3" /> Amount
                  </span>
                  <span className="font-bold text-foreground">
                    {payment.amount !== null ? `${payment.amount.toLocaleString()} KGS` : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3 text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <CreditCard className="h-3 w-3" /> Method
                  </span>
                  <span className="font-semibold text-foreground capitalize">{payment.method || "—"}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3 text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Tag className="h-3 w-3" /> Payment Type
                  </span>
                  <span className="font-semibold text-foreground">{payment.paymentType || "—"}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3 text-xs">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-mono text-foreground">{dateFormatted}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3 text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <User className="h-3 w-3" /> Parent
                  </span>
                  <span className="font-semibold text-foreground">{parentName}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3 text-xs">
                  <span className="text-muted-foreground">Student</span>
                  <span className="font-semibold text-foreground">{studentName}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3 text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="h-3 w-3" /> Branch
                  </span>
                  <span className="font-semibold text-foreground">{enrollmentBranch}</span>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
