"use client";

import React, { useState, useEffect } from "react";
import { X, ArrowLeftRight, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  reverseJournalEntry,
  selectReverseJournalEntryLoading,
  selectReverseJournalEntryError,
  clearJournalEntryErrors,
} from "@/store/slices/financeSlice";

interface ReverseEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  entry: any | null;
}

export function ReverseEntryModal({
  isOpen,
  onClose,
  onSuccess,
  entry,
}: ReverseEntryModalProps) {
  const dispatch = useAppDispatch();
  const submitting = useAppSelector(selectReverseJournalEntryLoading);
  const serverError = useAppSelector(selectReverseJournalEntryError);

  const [reversalMemo, setReversalMemo] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && entry) {
      dispatch(clearJournalEntryErrors());
      setLocalError(null);
      setReversalMemo(`Reversal of ${entry.entryNo}: ${entry.memo || "Journal entry correction"}`);
    }
  }, [isOpen, entry, dispatch]);

  if (!isOpen || !entry) return null;

  const lines = entry.ledgerLines || [];

  const handleConfirmReversal = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!reversalMemo.trim()) {
      setLocalError("Reversal memo is required.");
      return;
    }

    const result: any = await dispatch(
      reverseJournalEntry({
        journalEntryId: entry.id,
        reversalMemo: reversalMemo.trim(),
      })
    );

    if (reverseJournalEntry.fulfilled.match(result)) {
      onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600">
              <ArrowLeftRight className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Reverse Journal Entry</h2>
              <p className="text-xs text-muted-foreground">
                Reversing entry <span className="font-mono font-bold text-foreground">{entry.entryNo}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleConfirmReversal} className="flex-1 overflow-y-auto p-6 space-y-6">
          {(localError || serverError) && (
            <div className="flex items-start gap-2 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{localError || serverError}</span>
            </div>
          )}

          <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 text-xs space-y-2">
            <h4 className="font-bold text-rose-600 uppercase tracking-wider text-[10px]">
              Append-Only Reversal Protocol
            </h4>
            <p className="text-muted-foreground leading-relaxed">
              Accounting entries in SchoolOS are append-only. Reversing this entry will create a new posted Journal Entry that automatically swaps each line's Debit and Credit amounts, maintaining full auditability.
            </p>
          </div>

          {/* Reversal Memo */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Reversal Memo <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={reversalMemo}
              onChange={(e) => setReversalMemo(e.target.value)}
              placeholder="Reason for reversal..."
              required
              className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          </div>

          {/* Line Swap Preview */}
          <div className="space-y-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              Swapped Ledger Lines Preview ({lines.length} lines)
            </h3>

            <div className="overflow-x-auto border border-border/60 rounded-xl bg-card">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground select-none">
                    <th className="p-2.5 font-semibold text-[10px] uppercase">Account</th>
                    <th className="p-2.5 font-semibold text-[10px] uppercase text-right">Original Debit → New Credit</th>
                    <th className="p-2.5 font-semibold text-[10px] uppercase text-right">Original Credit → New Debit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono">
                  {lines.map((line: any, idx: number) => (
                    <tr key={line.id || idx} className="hover:bg-muted/10">
                      <td className="p-2.5 font-sans font-medium text-foreground">
                        {line.account ? `${line.account.accountNo} - ${line.account.accountName}` : "Account"}
                      </td>
                      <td className="p-2.5 text-right font-bold text-emerald-600">
                        {line.debit ? `Cr ${Number(line.debit).toFixed(2)} KGS` : "—"}
                      </td>
                      <td className="p-2.5 text-right font-bold text-rose-600">
                        {line.credit ? `Dr ${Number(line.credit).toFixed(2)} KGS` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-md hover:bg-rose-700 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Processing Reversal...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Post Reversal Entry</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
