"use client";

import { useState } from "react";
import { ReceiptPreview } from "./ReceiptPreview";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import { toast } from "sonner";

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

const sanitizePdfText = (text: string | null): string => {
  if (!text) return "—";
  // Extract primary English portion if string contains bilingual slash (e.g. "Tuition / Абонемент" -> "Tuition")
  let clean = text.split("/")[0].trim();

  // Transliterate Cyrillic characters to Latin so standard PDF font renders cleanly
  const cyrillicToLatin: Record<string, string> = {
    'А':'A','а':'a','Б':'B','б':'b','В':'V','в':'v','Г':'G','г':'g',
    'Д':'D','д':'d','Е':'E','е':'e','Ё':'Yo','ё':'yo','Ж':'Zh','ж':'zh',
    'З':'Z','з':'z','И':'I','и':'i','Й':'Y','й':'y','К':'K','к':'k',
    'Л':'L','л':'l','М':'M','м':'m','Н':'N','н':'n','О':'O','о':'o',
    'П':'P','п':'p','Р':'R','р':'r','С':'S','с':'s','Т':'T','т':'t',
    'У':'U','у':'u','Ф':'F','ф':'f','Х':'Kh','х':'kh','Ц':'Ts','ц':'ts',
    'Ч':'Ch','ч':'ch','Ш':'Sh','ш':'sh','Щ':'Shch','щ':'shch','Ъ':'',
    'ъ':'','Ы':'Y','ы':'y','Ь':'','ь':'','Э':'E','э':'e','Ю':'Yu',
    'ю':'yu','Я':'Ya','я':'ya'
  };

  clean = clean.split('').map(char => cyrillicToLatin[char] || char).join('');
  // Strip any remaining non-ASCII characters that break standard PDF fonts
  clean = clean.replace(/[^\x00-\x7F]/g, "").trim();

  return clean || "—";
};

export function ConfirmationReceipt(props: ConfirmationReceiptProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true);

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const formattedDate = props.date
        ? new Date(props.date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "—";

      // Dimensions
      const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const cardWidth = 140; // 140mm card width centered
      const startX = (pageWidth - cardWidth) / 2; // 35mm
      let y = 25;

      // Draw Card Background & Outer Border
      pdf.setDrawColor(226, 232, 240); // #e2e8f0
      pdf.setFillColor(250, 250, 250); // #fafafa
      pdf.roundedRect(startX, y, cardWidth, 160, 4, 4, "FD");

      // Top Header Title
      y += 14;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.setTextColor(15, 23, 42); // #0f172a
      pdf.text("HELEN DORON SCHOOL OS", pageWidth / 2, y, { align: "center" });

      y += 7;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(16, 185, 129); // Emerald #10b981
      pdf.text("CONFIRMATION RECEIPT", pageWidth / 2, y, { align: "center" });

      y += 6;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(100, 116, 139); // #64748b
      pdf.text(`Transaction Reference: ${sanitizePdfText(props.paymentRef)}`, pageWidth / 2, y, { align: "center" });

      // Dashed Divider Line
      y += 8;
      pdf.setDrawColor(203, 213, 225);
      pdf.setLineDashPattern([1.5, 1.5], 0);
      pdf.line(startX + 10, y, startX + cardWidth - 10, y);
      pdf.setLineDashPattern([], 0);

      // Key-Value Rows
      const addRow = (label: string, value: string) => {
        y += 9;
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9.5);
        pdf.setTextColor(100, 116, 139);
        pdf.text(label, startX + 12, y);

        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(15, 23, 42);
        pdf.text(value, startX + cardWidth - 12, y, { align: "right" });
      };

      addRow("Student Name:", sanitizePdfText(props.studentName));
      if (props.parentName) addRow("Parent Name:", sanitizePdfText(props.parentName));
      addRow("Invoice Reference:", props.invoiceNo ? `#${sanitizePdfText(props.invoiceNo)}` : "—");
      addRow("Payment Type:", sanitizePdfText(props.paymentType || "Tuition"));
      addRow("Payment Method:", sanitizePdfText(props.method || "—"));
      addRow("Payment Date:", formattedDate);

      // Dashed Divider Line
      y += 10;
      pdf.setDrawColor(203, 213, 225);
      pdf.setLineDashPattern([1.5, 1.5], 0);
      pdf.line(startX + 10, y, startX + cardWidth - 10, y);
      pdf.setLineDashPattern([], 0);

      // Total Settled Highlight Box
      y += 8;
      pdf.setFillColor(241, 245, 249);
      pdf.roundedRect(startX + 10, y, cardWidth - 20, 18, 3, 3, "F");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(71, 85, 105);
      pdf.text("TOTAL SETTLED", startX + 16, y + 11);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.setTextColor(15, 23, 42);
      const amountStr = props.amount !== null ? `$${props.amount.toFixed(2)}` : "$0.00";
      pdf.text(amountStr, startX + cardWidth - 16, y + 11, { align: "right" });

      // Footer Note
      y += 26;
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text("Thank you for your payment. Keep this receipt for your records.", pageWidth / 2, y, { align: "center" });

      // Download PDF File
      pdf.save(`receipt-${props.paymentRef || "download"}.pdf`);
      toast.success("Receipt PDF downloaded successfully!");
    } catch (err: any) {
      console.error("PDF generation error:", err);
      toast.error("Failed to generate receipt PDF.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-4 select-none">
      {/* Printable Receipt Frame */}
      <div className="bg-background rounded-2xl p-1">
        <ReceiptPreview {...props} />
      </div>

      {/* Control Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
        <Button
          onClick={handleDownloadPdf}
          disabled={isDownloading}
          variant="outline"
          size="sm"
          className="text-xs h-8 inline-flex items-center gap-1.5 font-bold cursor-pointer"
        >
          {isDownloading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : (
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          {isDownloading ? "Generating PDF..." : "Download PDF"}
        </Button>
      </div>
    </div>
  );
}
