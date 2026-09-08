"use client";

import React from "react";
import { X, Lock, HelpCircle, ExternalLink, ArrowLeftRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ViewJournalEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: any | null;
  onReverse?: (entry: any) => void;
}

export function ViewJournalEntryModal({
  isOpen,
  onClose,
  entry,
  onReverse,
}: ViewJournalEntryModalProps) {
  if (!isOpen || !entry) return null;

  const lines = entry.ledgerLines || [];
  const totalDebit = lines.reduce((sum: number, l: any) => sum + (l.debit || 0), 0);
  const totalCredit = lines.reduce((sum: number, l: any) => sum + (l.credit || 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-foreground font-mono">{entry.entryNo}</h2>
            {entry.posted ? (
              <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 gap-1 font-bold text-[10px]">
                <Lock className="h-3 w-3" /> Posted (Read-Only)
              </Badge>
            ) : (
              <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20 gap-1 font-bold text-[10px]">
                <HelpCircle className="h-3 w-3" /> Draft
              </Badge>
            )}

            {entry.isReversed && (
              <Badge className="bg-rose-500/10 text-rose-600 border border-rose-500/20 font-bold text-[10px]">
                Reversed
              </Badge>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/20 p-4 rounded-xl border border-border/60 text-xs">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block mb-1">
                Transaction Date
              </span>
              <span className="font-semibold text-foreground">
                {entry.date ? new Date(entry.date).toLocaleDateString() : "—"}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block mb-1">
                Source Type
              </span>
              <span className="font-semibold text-foreground px-2 py-0.5 rounded-md bg-card border border-border inline-block">
                {entry.source || "Manual"}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block mb-1">
                Branch
              </span>
              <span className="font-semibold text-foreground">
                {entry.branchName || "Main Branch"}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block mb-1">
                Status
              </span>
              <span className={`font-bold ${entry.posted ? "text-emerald-600" : "text-amber-600"}`}>
                {entry.posted ? "Posted" : "Draft"}
              </span>
            </div>

            <div className="col-span-2 md:col-span-4 pt-2 border-t border-border/40">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block mb-1">
                Memo / Description
              </span>
              <p className="font-medium text-foreground text-xs leading-relaxed">
                {entry.memo || "No memo provided."}
              </p>
            </div>
          </div>

          {/* Ledger Lines Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              Ledger Lines Breakdown ({lines.length} lines)
            </h3>

            <div className="overflow-x-auto border border-border/60 rounded-xl bg-card">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground select-none">
                    <th className="p-3 font-semibold text-[10px] uppercase">Account</th>
                    <th className="p-3 font-semibold text-[10px] uppercase">Line Memo</th>
                    <th className="p-3 font-semibold text-[10px] uppercase text-right">Debit (KGS)</th>
                    <th className="p-3 font-semibold text-[10px] uppercase text-right">Credit (KGS)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {lines.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-muted-foreground text-xs font-medium">
                        No ledger lines recorded for this journal entry.
                      </td>
                    </tr>
                  ) : (
                    lines.map((line: any, idx: number) => (
                      <tr key={line.id || idx} className="hover:bg-muted/10">
                        <td className="p-3 font-medium">
                          {line.account ? (
                            <div>
                              <div className="font-bold font-mono text-foreground">{line.account.accountNo}</div>
                              <div className="text-[11px] text-muted-foreground">{line.account.accountName}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground font-mono">Account ID: {line.accountIds?.[0] || "—"}</span>
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground font-medium max-w-xs truncate" title={line.memo || entry.memo}>
                          {line.memo || entry.memo || "—"}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-rose-600">
                          {line.debit != null ? `${Number(line.debit).toFixed(2)} KGS` : "—"}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-600">
                          {line.credit != null ? `${Number(line.credit).toFixed(2)} KGS` : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-muted/30 font-mono font-extrabold text-xs">
                    <td colSpan={2} className="p-3 text-right text-muted-foreground uppercase font-sans text-[10px]">
                      Totals:
                    </td>
                    <td className="p-3 text-right text-rose-600">
                      {totalDebit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KGS
                    </td>
                    <td className="p-3 text-right text-emerald-600">
                      {totalCredit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KGS
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-card">
          <div className="text-[11px] text-muted-foreground font-medium">
            Posted entries are immutable and append-only.
          </div>

          <div className="flex items-center gap-3">
            {entry.posted && !entry.isReversed && onReverse && (
              <button
                onClick={() => {
                  onClose();
                  onReverse(entry);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-bold hover:bg-rose-500/20 transition-all cursor-pointer"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" /> Reverse Entry
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
