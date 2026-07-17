"use client";

import { ReconciliationBadge } from "./ReconciliationBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { HelpCircle, AlertOctagon } from "lucide-react";

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

interface PaymentTableProps {
  payments: Payment[];
  invoiceMap: Record<string, { invoiceNo: string; studentIds: string[]; enrollmentIds: string[] }>;
  parentMap: Record<string, { parentName: string; studentIds: string[] }>;
  studentMap: Record<string, { studentName: string }>;
  enrollmentMap: Record<string, { enrollmentId: string }>;
  branchMap: Record<string, { name: string }>;
  selectedPaymentId?: string;
  onSelectPayment: (payment: Payment) => void;
}

export function PaymentTable({
  payments,
  invoiceMap,
  parentMap,
  studentMap,
  enrollmentMap,
  branchMap,
  selectedPaymentId,
  onSelectPayment,
}: PaymentTableProps) {
  
  const getRelationDetails = (payment: Payment) => {
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

    // 4. Resolve enrollment details
    let enrollmentNo = "—";
    if (invoice && invoice.enrollmentIds[0]) {
      enrollmentNo = enrollmentMap[invoice.enrollmentIds[0]]?.enrollmentId || "—";
    }

    // 5. Resolve reconciliation status
    let status = "Pending";
    if (payment.possibleDuplicate) {
      status = "Requires Review";
    } else if (payment.invoiceIds.length > 0) {
      status = "Reconciled";
    }

    // 6. Format Period (computed month)
    const period = payment.date 
      ? format(new Date(payment.date), "MMMM yyyy") 
      : "—";

    return {
      invoiceNo,
      parentName,
      studentName,
      enrollmentNo,
      status,
      period,
    };
  };

  return (
    <div className="border border-border/60 rounded-xl bg-card overflow-hidden select-none">
      <Table>
        <TableHeader className="bg-muted/15">
          <TableRow className="border-b border-border/50 hover:bg-transparent">
            <TableHead className="text-[10px] uppercase font-bold tracking-wider py-3 px-4">Receipt Ref</TableHead>
            <TableHead className="text-[10px] uppercase font-bold tracking-wider py-3 px-4">Student</TableHead>
            <TableHead className="text-[10px] uppercase font-bold tracking-wider py-3 px-4">Parent</TableHead>
            <TableHead className="text-[10px] uppercase font-bold tracking-wider py-3 px-4">Invoice No</TableHead>
            <TableHead className="text-[10px] uppercase font-bold tracking-wider py-3 px-4">Enrollment</TableHead>
            <TableHead className="text-[10px] uppercase font-bold tracking-wider py-3 px-4">Type</TableHead>
            <TableHead className="text-[10px] uppercase font-bold tracking-wider py-3 px-4">Method</TableHead>
            <TableHead className="text-[10px] uppercase font-bold tracking-wider py-3 px-4 text-right">Amount</TableHead>
            <TableHead className="text-[10px] uppercase font-bold tracking-wider py-3 px-4">Date</TableHead>
            <TableHead className="text-[10px] uppercase font-bold tracking-wider py-3 px-4">Period</TableHead>
            <TableHead className="text-[10px] uppercase font-bold tracking-wider py-3 px-4">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="text-center py-8 text-xs text-muted-foreground italic">
                No payments found matching the selected search or filter criteria.
              </TableCell>
            </TableRow>
          ) : (
            payments.map((p) => {
              const { invoiceNo, parentName, studentName, enrollmentNo, status, period } = getRelationDetails(p);
              const isSelected = p.id === selectedPaymentId;
              const formattedDate = p.date ? format(new Date(p.date), "yyyy-MM-dd") : "—";
              
              return (
                <TableRow
                  key={p.id}
                  onClick={() => onSelectPayment(p)}
                  className={`border-b border-border/40 transition-colors cursor-pointer text-xs hover:bg-muted/15 ${
                    isSelected ? "bg-primary/5 font-semibold" : ""
                  }`}
                >
                  <TableCell className="font-bold py-3 px-4 text-foreground flex items-center gap-1.5">
                    {p.possibleDuplicate && (
                      <AlertOctagon className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                    )}
                    {p.paymentRef}
                  </TableCell>
                  <TableCell className="py-3 px-4 truncate max-w-[120px] font-semibold text-foreground">{studentName}</TableCell>
                  <TableCell className="py-3 px-4 truncate max-w-[120px] text-muted-foreground">{parentName}</TableCell>
                  <TableCell className="py-3 px-4 text-muted-foreground">{invoiceNo}</TableCell>
                  <TableCell className="py-3 px-4 text-muted-foreground">{enrollmentNo}</TableCell>
                  <TableCell className="py-3 px-4 capitalize font-medium text-foreground">{p.paymentType || "Tuition"}</TableCell>
                  <TableCell className="py-3 px-4 text-muted-foreground">{p.method}</TableCell>
                  <TableCell className="py-3 px-4 text-right font-bold text-foreground">
                    ${p.amount !== null ? p.amount.toFixed(2) : "0.00"}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-muted-foreground">{formattedDate}</TableCell>
                  <TableCell className="py-3 px-4 text-muted-foreground">{period}</TableCell>
                  <TableCell className="py-3 px-4">
                    <ReconciliationBadge status={status} />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
