"use client";

import { ReceiptPreview } from "./ReceiptPreview";
import { Button } from "@/components/ui/button";
import { Printer, Download, Share2 } from "lucide-react";

interface ConfirmationReceiptProps {
  studentName: string | null;
  parentName: string | null;
  invoiceNo: string | null;
  amount: number | null;
  method: string | null;
  paymentRef: string | null;
  date: string | Date | null;
  paymentType: string | null;
}

export function ConfirmationReceipt(props: ConfirmationReceiptProps) {
  const handlePrint = () => {
    alert("Receipt printing is mock-only in Phase 2.");
  };

  return (
    <div className="space-y-4 select-none">
      
      {/* Printable Receipt Frame */}
      <ReceiptPreview {...props} />

      {/* Control Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
        <Button
          onClick={handlePrint}
          variant="outline"
          size="sm"
          className="text-xs h-8 inline-flex items-center gap-1.5 font-bold cursor-pointer"
        >
          <Printer className="h-3.5 w-3.5 text-muted-foreground" />
          Print Receipt
        </Button>
        
        <Button
          onClick={() => alert("Receipt downloading is mock-only in Phase 2.")}
          variant="outline"
          size="sm"
          className="text-xs h-8 inline-flex items-center gap-1.5 font-bold cursor-pointer"
        >
          <Download className="h-3.5 w-3.5 text-muted-foreground" />
          Download PDF
        </Button>

        <Button
          onClick={() => alert("Receipt sharing is mock-only in Phase 2.")}
          variant="ghost"
          size="sm"
          className="text-xs h-8 inline-flex items-center gap-1.5 font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <Share2 className="h-3.5 w-3.5" />
          Share
        </Button>
      </div>
    </div>
  );
}
