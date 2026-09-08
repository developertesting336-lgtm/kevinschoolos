"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchJournalEntryFormData,
  createJournalEntry,
  selectJournalEntryFormData,
  selectJournalEntryFormLoading,
  selectCreateJournalEntryLoading,
  selectCreateJournalEntryError,
  clearJournalEntryErrors,
} from "@/store/slices/financeSlice";

interface NewJournalEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentBranchId?: string;
}

interface LedgerLineRow {
  accountId: string;
  debit: string;
  credit: string;
  memo: string;
}

export function NewJournalEntryModal({
  isOpen,
  onClose,
  onSuccess,
  currentBranchId,
}: NewJournalEntryModalProps) {
  const dispatch = useAppDispatch();
  const formData = useAppSelector(selectJournalEntryFormData);
  const formLoading = useAppSelector(selectJournalEntryFormLoading);
  const submitting = useAppSelector(selectCreateJournalEntryLoading);
  const serverError = useAppSelector(selectCreateJournalEntryError);

  const todayStr = new Date().toISOString().split("T")[0];

  const [date, setDate] = useState(todayStr);
  const [memo, setMemo] = useState("");
  const [source, setSource] = useState<string>("Manual");
  const [branchId, setBranchId] = useState<string>("");
  const [sourceRecordId, setSourceRecordId] = useState<string>("");
  const [localError, setLocalError] = useState<string | null>(null);

  // Initialize at least 2 empty ledger line rows
  const [lines, setLines] = useState<LedgerLineRow[]>([
    { accountId: "", debit: "", credit: "", memo: "" },
    { accountId: "", debit: "", credit: "", memo: "" },
  ]);

  useEffect(() => {
    if (isOpen) {
      dispatch(clearJournalEntryErrors());
      setLocalError(null);
      setDate(todayStr);
      setMemo("");
      setSource("Manual");
      setSourceRecordId("");
      setLines([
        { accountId: "", debit: "", credit: "", memo: "" },
        { accountId: "", debit: "", credit: "", memo: "" },
      ]);
      dispatch(fetchJournalEntryFormData());
    }
  }, [isOpen, dispatch]);

  useEffect(() => {
    if (formData.userBranchId) {
      setBranchId(currentBranchId || formData.userBranchId);
    } else if (formData.branches.length > 0) {
      setBranchId(currentBranchId || formData.branches[0].id);
    }
  }, [formData, currentBranchId]);

  if (!isOpen) return null;

  const handleAddLine = () => {
    setLines([...lines, { accountId: "", debit: "", credit: "", memo: "" }]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 2) {
      setLocalError("A Journal Entry requires at least two Ledger Lines.");
      return;
    }
    const updated = lines.filter((_, idx) => idx !== index);
    setLines(updated);
  };

  const handleLineChange = (index: number, field: keyof LedgerLineRow, value: string) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };

    // Enforce mutual exclusivity between Debit and Credit in UI
    if (field === "debit" && value && Number(value) > 0) {
      updated[index].credit = "";
    } else if (field === "credit" && value && Number(value) > 0) {
      updated[index].debit = "";
    }

    setLines(updated);
  };

  // Calculation for total Debits and Credits
  const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
  const difference = totalDebit - totalCredit;
  const isBalanced = Math.abs(difference) < 0.01 && totalDebit > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // --- Validation ---
    if (!memo.trim()) {
      setLocalError("Journal Entry Memo is required.");
      return;
    }

    if (!date) {
      setLocalError("Date is required.");
      return;
    }

    if (!branchId) {
      setLocalError("Branch is required.");
      return;
    }

    const requiresSourceRecord = ["Payment", "Invoice", "Teacher Pay", "Expense", "Royalty"].includes(source);
    if (requiresSourceRecord && !sourceRecordId) {
      setLocalError(`Please select a linked ${source} record.`);
      return;
    }

    if (lines.length < 2) {
      setLocalError("At least two Ledger Lines are required.");
      return;
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const rNum = i + 1;
      if (!line.accountId) {
        setLocalError(`Row ${rNum}: Account selection is required.`);
        return;
      }
      const dr = parseFloat(line.debit) || 0;
      const cr = parseFloat(line.credit) || 0;

      if (dr < 0 || cr < 0) {
        setLocalError(`Row ${rNum}: Amounts cannot be negative.`);
        return;
      }

      if ((dr > 0 && cr > 0) || (dr === 0 && cr === 0)) {
        setLocalError(`Row ${rNum}: Line must have EITHER a Debit OR a Credit amount, but never both and never neither.`);
        return;
      }
    }

    if (!isBalanced) {
      setLocalError(`Unbalanced Entry: Total Debit (${totalDebit.toFixed(2)} KGS) must equal Total Credit (${totalCredit.toFixed(2)} KGS).`);
      return;
    }

    // Format payload for Redux dispatch
    const payload = {
      date,
      memo: memo.trim(),
      source,
      branchId,
      sourceRecordId: requiresSourceRecord ? sourceRecordId : undefined,
      lines: lines.map(l => ({
        accountId: l.accountId,
        debit: l.debit ? parseFloat(l.debit) : null,
        credit: l.credit ? parseFloat(l.credit) : null,
        memo: l.memo ? l.memo.trim() : undefined,
      })),
    };

    const result: any = await dispatch(createJournalEntry(payload));
    if (createJournalEntry.fulfilled.match(result)) {
      onSuccess();
      onClose();
    }
  };

  // Linked Source Record Options
  let sourceOptions: { id: string; label: string }[] = [];
  if (source === "Payment") sourceOptions = formData.sourcesData.payments;
  else if (source === "Invoice") sourceOptions = formData.sourcesData.invoices;
  else if (source === "Teacher Pay") sourceOptions = formData.sourcesData.teacherPays;
  else if (source === "Expense") sourceOptions = formData.sourcesData.expenses;
  else if (source === "Royalty") sourceOptions = formData.sourcesData.royalties;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/80 bg-card">
          <div>
            <h2 className="text-lg font-bold text-foreground">New Journal Entry</h2>
            <p className="text-xs text-muted-foreground">
              Create a new double-entry accounting transaction. Entry will be posted upon verification.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {formLoading ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground font-semibold">Loading active accounts & branch data...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            {(localError || serverError) && (
              <div className="flex items-start gap-2 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{localError || serverError}</span>
              </div>
            )}

            {/* Entry Header Information */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-muted/20 p-4 rounded-xl border border-border/60">
              {/* Entry No (Read-Only) */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Entry No (Auto)
                </label>
                <input
                  type="text"
                  value={formData.nextEntryNo}
                  readOnly
                  className="w-full bg-muted/60 border border-border rounded-xl px-3 py-2 text-xs font-mono font-bold text-foreground/70 cursor-not-allowed"
                />
              </div>

              {/* Date */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Source */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Source <span className="text-rose-500">*</span>
                </label>
                <select
                  value={source}
                  onChange={(e) => {
                    setSource(e.target.value);
                    setSourceRecordId("");
                  }}
                  className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="Manual">Manual</option>
                  <option value="Payment">Payment</option>
                  <option value="Invoice">Invoice</option>
                  <option value="Teacher Pay">Teacher Pay</option>
                  <option value="Expense">Expense</option>
                  <option value="Royalty">Royalty</option>
                  <option value="Opening Balance">Opening Balance</option>
                </select>
              </div>

              {/* Branch */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Branch <span className="text-rose-500">*</span>
                </label>
                {formData.userRole === "finance" ? (
                  <input
                    type="text"
                    value={formData.userBranchName || "Assigned Branch"}
                    readOnly
                    className="w-full bg-muted/60 border border-border rounded-xl px-3 py-2 text-xs font-semibold text-foreground/70 cursor-not-allowed"
                  />
                ) : (
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    required
                    className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {formData.branches.map((b: { id: string; name: string }) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Linked Record Dynamic Dropdown */}
              {["Payment", "Invoice", "Teacher Pay", "Expense", "Royalty"].includes(source) && (
                <div className="md:col-span-4 space-y-1 pt-2 border-t border-border/40">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    Linked {source} Record <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={sourceRecordId}
                    onChange={(e) => setSourceRecordId(e.target.value)}
                    required
                    className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Select a linked {source} record...</option>
                    {sourceOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Journal Entry Memo */}
              <div className="md:col-span-4 space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Memo / Description <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="Enter business purpose or memo for this journal entry..."
                  required
                  className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Ledger Lines Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Ledger Lines</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Select active account, enter either Debit or Credit (never both per line). Total Debits must equal Total Credits.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddLine}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-primary/30 bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-all cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Row
                </button>
              </div>

              <div className="overflow-x-auto border border-border/60 rounded-xl bg-card">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground select-none">
                      <th className="p-2.5 font-semibold text-[10px] uppercase w-8">#</th>
                      <th className="p-2.5 font-semibold text-[10px] uppercase min-w-[220px]">Account (Active Only)</th>
                      <th className="p-2.5 font-semibold text-[10px] uppercase w-32 text-right">Debit (KGS)</th>
                      <th className="p-2.5 font-semibold text-[10px] uppercase w-32 text-right">Credit (KGS)</th>
                      <th className="p-2.5 font-semibold text-[10px] uppercase min-w-[180px]">Line Memo (Optional)</th>
                      <th className="p-2.5 font-semibold text-[10px] uppercase w-10 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {lines.map((line, index) => (
                      <tr key={index} className="hover:bg-muted/10">
                        <td className="p-2.5 text-muted-foreground font-mono font-bold text-[11px]">
                          {index + 1}
                        </td>
                        <td className="p-2.5">
                          <select
                            value={line.accountId}
                            onChange={(e) => handleLineChange(index, "accountId", e.target.value)}
                            required
                            className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                          >
                            <option value="">Select Active Account...</option>
                            {formData.activeAccounts.map((acc: any) => (
                              <option key={acc.id} value={acc.id}>
                                {acc.accountNo} - {acc.accountName} ({acc.type})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={line.debit}
                            onChange={(e) => handleLineChange(index, "debit", e.target.value)}
                            disabled={Boolean(line.credit && parseFloat(line.credit) > 0)}
                            className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-right text-rose-600 focus:ring-1 focus:ring-rose-500 focus:outline-none disabled:bg-muted/40 disabled:text-muted-foreground"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={line.credit}
                            onChange={(e) => handleLineChange(index, "credit", e.target.value)}
                            disabled={Boolean(line.debit && parseFloat(line.debit) > 0)}
                            className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-right text-emerald-600 focus:ring-1 focus:ring-emerald-500 focus:outline-none disabled:bg-muted/40 disabled:text-muted-foreground"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            placeholder="Line note..."
                            value={line.memo}
                            onChange={(e) => handleLineChange(index, "memo", e.target.value)}
                            className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(index)}
                            disabled={lines.length <= 2}
                            className="p-1 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                            title="Remove row"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Real-time Balancing Status Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-muted/20 border border-border/60">
                <div className="flex items-center gap-2">
                  {isBalanced ? (
                    <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Entry Balanced</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 bg-rose-500/10 text-rose-600 border border-rose-500/20 px-3 py-1 rounded-full text-xs font-bold">
                      <AlertCircle className="h-4 w-4" />
                      <span>
                        Out of Balance ({difference > 0 ? `+${difference.toFixed(2)}` : difference.toFixed(2)} KGS)
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-6 font-mono text-xs font-extrabold">
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase font-sans mr-2">Total Debit:</span>
                    <span className="text-rose-600">{totalDebit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KGS</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase font-sans mr-2">Total Credit:</span>
                    <span className="text-emerald-600">{totalCredit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KGS</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/80">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !isBalanced}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Posting Entry...</span>
                  </>
                ) : (
                  <span>Post Journal Entry</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
