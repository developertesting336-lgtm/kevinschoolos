"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Receipt, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface InvoiceData {
  id: string;
  invoiceNo: string;
  amount: number | null;
  status: string | null;
  studentName?: string;
  parentName?: string;
}

interface InvoiceLookupProps {
  invoices: InvoiceData[];
  selectedInvoiceId?: string;
}

export function InvoiceLookup({ invoices, selectedInvoiceId }: InvoiceLookupProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredInvoices = invoices.filter((inv) => {
    const text = `${inv.invoiceNo} ${inv.studentName || ""} ${inv.parentName || ""}`.toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-2 select-none">
      <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
        Invoice Linkage Lookup (Read-Only)
      </label>
      
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
        <Input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter invoices by number, student, or parent..."
          className="pl-8 text-xs h-8 bg-muted/20 border-border/40 focus:ring-0 focus:border-border/40"
        />
      </div>

      <ScrollArea className="h-32 border border-border/50 rounded-lg bg-muted/5 overflow-y-auto">
        <div className="p-1 space-y-1">
          {filteredInvoices.length === 0 ? (
            <p className="text-[11px] text-muted-foreground/80 italic p-3 text-center">No matching invoices found</p>
          ) : (
            filteredInvoices.map((inv) => {
              const isSelected = inv.id === selectedInvoiceId;
              return (
                <div
                  key={inv.id}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-md text-[11px] border transition-colors",
                    isSelected
                      ? "bg-primary/5 border-primary/20 text-primary font-bold"
                      : "bg-transparent border-transparent text-muted-foreground/80"
                  )}
                >
                  <div className="space-y-0.5 truncate max-w-[80%]">
                    <p className="font-semibold text-foreground flex items-center gap-1">
                      <Receipt className="h-3.5 w-3.5 shrink-0" />
                      Invoice {inv.invoiceNo}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      Student: {inv.studentName || "—"} • Parent: {inv.parentName || "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-bold text-foreground">
                      ${inv.amount !== null ? inv.amount.toFixed(2) : "0.00"}
                    </span>
                    {isSelected && <Check className="h-3 w-3 stroke-3" />}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
