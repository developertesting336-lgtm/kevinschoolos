"use client";

import { InvoiceLookup } from "./InvoiceLookup";
import { EnrollmentLookup } from "./EnrollmentLookup";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Send } from "lucide-react";

interface Option {
  id: string;
  name: string;
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

interface PaymentIntakeFormProps {
  invoices: InvoiceData[];
  enrollments: EnrollmentLookupData[];
  selectedInvoiceId?: string;
  selectedEnrollmentId?: string;
  paymentRef?: string;
  paymentDate?: string;
  amount?: number;
  paymentMethod?: string;
  paymentType?: string;
}

export function PaymentIntakeForm({
  invoices,
  enrollments,
  selectedInvoiceId,
  selectedEnrollmentId,
  paymentRef = "",
  paymentDate = "",
  amount = 0,
  paymentMethod = "",
  paymentType = "",
}: PaymentIntakeFormProps) {
  
  const paymentTypes = ["Tuition", "Play Room", "Masterclass", "Merchandise", "Other"];
  const paymentMethods = ["Cash", "Card", "Bank Transfer", "Online"];

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-5 select-none relative overflow-hidden">
      
      {/* Read-Only Status Indicator */}
      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-500/5 border border-rose-500/15 text-rose-700 dark:text-rose-400">
        <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
        <div className="text-[11px] font-medium leading-normal">
          <span className="font-extrabold uppercase block tracking-wider mb-0.5">Phase 2 Sandbox Mode</span>
          Payment intake is read-only. All creation, linking, and submission functions are locked.
        </div>
      </div>

      <div className="space-y-4">
        {/* Row 1: Receipt Reference & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              Receipt Reference
            </label>
            <Input
              type="text"
              value={paymentRef}
              disabled
              placeholder="e.g. REC-2026-1002"
              className="text-xs h-8 bg-muted/40 border-border/40"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              Payment Date
            </label>
            <Input
              type="date"
              value={paymentDate ? paymentDate.split("T")[0] : ""}
              disabled
              className="text-xs h-8 bg-muted/40 border-border/40"
            />
          </div>
        </div>

        {/* Row 2: Amount & Billing Period */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              Amount (USD)
            </label>
            <Input
              type="number"
              value={amount}
              disabled
              className="text-xs h-8 bg-muted/40 border-border/40 font-bold text-foreground"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              Billing Period (computed by Airtable)
            </label>
            <Input
              type="text"
              value="Automatic (Preserved)"
              disabled
              className="text-xs h-8 bg-muted/40 border-border/40 italic text-muted-foreground"
            />
          </div>
        </div>

        {/* Row 3: Payment Method & Payment Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              Payment Method
            </label>
            <NativeSelect value={paymentMethod} disabled className="h-8 bg-muted/40 border-border/40 text-xs text-foreground">
              <NativeSelectOption value="">Select Method</NativeSelectOption>
              {paymentMethods.map((m) => (
                <NativeSelectOption key={m} value={m}>{m}</NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              Payment Type
            </label>
            <NativeSelect value={paymentType} disabled className="h-8 bg-muted/40 border-border/40 text-xs text-foreground">
              <NativeSelectOption value="">Select Type</NativeSelectOption>
              {paymentTypes.map((t) => (
                <NativeSelectOption key={t} value={t}>{t}</NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        </div>

        {/* Lookups list */}
        <div className="grid grid-cols-1 gap-4 pt-2">
          <InvoiceLookup
            invoices={invoices}
            selectedInvoiceId={selectedInvoiceId}
          />
          <EnrollmentLookup
            enrollments={enrollments}
            selectedEnrollmentId={selectedEnrollmentId}
          />
        </div>
      </div>

      {/* Blocked Submit Button */}
      <div className="border-t border-border/40 pt-4 flex justify-end">
        <Button
          disabled
          type="button"
          className="h-9 text-xs font-bold px-4 inline-flex items-center gap-1.5 opacity-55 cursor-not-allowed bg-muted border border-border text-muted-foreground"
        >
          <Send className="h-3.5 w-3.5" />
          Submit Intake Payment (Disabled)
        </Button>
      </div>
    </div>
  );
}
