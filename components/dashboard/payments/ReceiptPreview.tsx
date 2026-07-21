"use client";

import { CheckCircle2, Bookmark, Calendar, Landmark, CreditCard, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReceiptPreviewProps {
  studentName: string | null;
  parentName: string | null;
  invoiceNo: string | null;
  amount: number | null;
  method: string | null;
  paymentRef: string | null;
  date: string | Date | null;
  paymentType: string | null;
}

export function ReceiptPreview({
  studentName,
  parentName,
  invoiceNo,
  amount,
  method,
  paymentRef,
  date,
  paymentType,
}: ReceiptPreviewProps) {
  const formattedDate = date
    ? new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  return (
    <div className="border border-dashed border-border/80 bg-muted/10 rounded-2xl p-6 space-y-5 relative select-none">
      
      {/* Decorative Top receipt notches */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-border/25 flex justify-between overflow-hidden">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="h-2 w-2 rounded-full bg-background -translate-y-1.5" />
        ))}
      </div>

      {/* Header checkmark */}
      <div className="text-center space-y-1 pt-2">
        <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
        <h4 className="text-sm font-extrabold uppercase tracking-widest text-foreground">
          Confirmation Receipt
        </h4>
        <p className="text-[10px] text-muted-foreground font-semibold">
          Transaction Reference: {paymentRef || "—"}
        </p>
      </div>

      <div className="border-t border-dashed border-border/60 my-3" />

      {/* Grid Values */}
      <div className="space-y-3.5 text-xs">
        <div className="flex justify-between items-start">
          <span className="text-muted-foreground font-medium">Student Name:</span>
          <span className="text-foreground font-bold text-right truncate max-w-45">
            {studentName || "—"}
          </span>
        </div>

        {parentName && (
          <div className="flex justify-between items-start">
            <span className="text-muted-foreground font-medium">Parent Name:</span>
            <span className="text-foreground font-bold text-right truncate max-w-45">
              {parentName || "—"}
            </span>
          </div>
        )}

        <div className="flex justify-between items-center">
          <span className="text-muted-foreground font-medium">Invoice Reference:</span>
          <span className="text-foreground font-bold flex items-center gap-1">
            <Receipt className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
            {invoiceNo || "—"}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-muted-foreground font-medium">Payment Type:</span>
          <span className="text-foreground font-bold flex items-center gap-1 capitalize">
            <Bookmark className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
            {paymentType || "Tuition"}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-muted-foreground font-medium">Payment Method:</span>
          <span className="text-foreground font-bold flex items-center gap-1">
            <CreditCard className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
            {method || "—"}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-muted-foreground font-medium">Payment Date:</span>
          <span className="text-foreground font-bold flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
            {formattedDate}
          </span>
        </div>
      </div>

      <div className="border-t border-dashed border-border/60 my-3" />

      {/* Large Total Amount row */}
      <div className="flex justify-between items-center py-1">
        <span className="text-xs uppercase font-extrabold text-muted-foreground tracking-wider">
          Total Settled
        </span>
        <span className="text-xl font-black text-foreground flex items-center gap-0.5">
          <span className="text-sm font-semibold text-muted-foreground mr-0.5">$</span>
          {amount !== null ? amount.toFixed(2) : "0.00"}
        </span>
      </div>

      {/* Decorative Bottom Receipt Notch */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-border/25 flex justify-between overflow-hidden">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="h-2 w-2 rounded-full bg-background translate-y-1.5" />
        ))}
      </div>
    </div>
  );
}
