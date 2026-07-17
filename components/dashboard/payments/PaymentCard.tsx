"use client";

import { ReconciliationBadge } from "./ReconciliationBadge";
import { format } from "date-fns";
import { AlertOctagon, Receipt, ChevronRight } from "lucide-react";

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

interface PaymentCardProps {
  payment: Payment;
  invoiceMap: Record<string, { invoiceNo: string; studentIds: string[]; enrollmentIds: string[] }>;
  parentMap: Record<string, { parentName: string; studentIds: string[] }>;
  studentMap: Record<string, { studentName: string }>;
  enrollmentMap: Record<string, { enrollmentId: string }>;
  isSelected?: boolean;
  onSelect: () => void;
}

export function PaymentCard({
  payment,
  invoiceMap,
  parentMap,
  studentMap,
  enrollmentMap,
  isSelected,
  onSelect,
}: PaymentCardProps) {
  
  // 1. Resolve invoice details
  const firstInvoiceId = payment.invoiceIds[0] || "";
  const invoice = invoiceMap[firstInvoiceId];
  const invoiceNo = invoice ? invoice.invoiceNo : "—";

  // 2. Resolve parent details
  const firstParentId = payment.parentIds[0] || "";
  const parent = parentMap[firstParentId];
  const parentName = parent ? parent.parentName : "—";

  // 3. Resolve student details
  let studentName = "—";
  if (invoice && invoice.studentIds[0]) {
    studentName = studentMap[invoice.studentIds[0]]?.studentName || "—";
  } else if (parent && parent.studentIds[0]) {
    studentName = studentMap[parent.studentIds[0]]?.studentName || "—";
  }

  // 4. Resolve reconciliation status
  let status = "Pending";
  if (payment.possibleDuplicate) {
    status = "Requires Review";
  } else if (payment.invoiceIds.length > 0) {
    status = "Reconciled";
  }

  const formattedDate = payment.date 
    ? format(new Date(payment.date), "yyyy-MM-dd") 
    : "—";

  return (
    <div
      onClick={onSelect}
      className={`border rounded-xl p-4 space-y-3 cursor-pointer select-none transition-all active:scale-[0.99] bg-card ${
        isSelected
          ? "border-primary bg-primary/5 shadow-xs font-semibold"
          : "border-border/60 hover:border-border/90"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          {payment.possibleDuplicate ? (
            <AlertOctagon className="h-4 w-4 text-rose-500 shrink-0" />
          ) : (
            <Receipt className="h-4 w-4 text-primary shrink-0" />
          )}
          <span>{payment.paymentRef}</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <span>{formattedDate}</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </div>
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Student:</span>
          <span className="text-foreground font-semibold">{studentName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Parent:</span>
          <span className="text-muted-foreground">{parentName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Invoice No:</span>
          <span className="text-muted-foreground font-mono">{invoiceNo}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Type/Method:</span>
          <span className="text-foreground font-medium capitalize">
            {payment.paymentType || "Tuition"} • {payment.method || "—"}
          </span>
        </div>
      </div>

      <div className="border-t border-border/40 pt-2.5 flex items-center justify-between">
        <ReconciliationBadge status={status} />
        <span className="text-sm font-extrabold text-foreground">
          ${payment.amount !== null ? payment.amount.toFixed(2) : "0.00"}
        </span>
      </div>
    </div>
  );
}
