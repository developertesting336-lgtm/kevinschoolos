"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  createExpense,
  updateExpense,
  selectExpenseFormVendors,
  selectExpenseFormAccounts,
  selectExpenseFormBranches,
  selectExpenseFormBranchId,
  selectExpenseFormBranchName,
  selectExpenseFormNextNo,
} from "@/store/slices/financeSlice";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Loader2, Receipt, Send, Save } from "lucide-react";

interface Option {
  id: string;
  name: string;
}

export interface EditExpenseData {
  id: string;
  expenseNo?: string;
  date?: string;
  description?: string;
  amount?: number;
  paymentMethod?: string;
  vendorId?: string;
  expenseAccountId?: string;
  branchId?: string;
  paid?: boolean;
  notes?: string;
}

interface ExpenseFormProps {
  editExpenseData?: EditExpenseData | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const PAYMENT_METHODS = ["Cash", "Bank Transfer", "Card", "On Account (Unpaid)"];

export function ExpenseForm({ editExpenseData, onSuccess, onCancel }: ExpenseFormProps) {
  const dispatch = useAppDispatch();

  const isEditing = Boolean(editExpenseData?.id);

  // Consume data from centralized Redux store
  const vendors = useAppSelector(selectExpenseFormVendors);
  const accounts = useAppSelector(selectExpenseFormAccounts);
  const branches = useAppSelector(selectExpenseFormBranches);
  const userBranchId = useAppSelector(selectExpenseFormBranchId);
  const userBranchName = useAppSelector(selectExpenseFormBranchName);
  const nextExpenseNo = useAppSelector(selectExpenseFormNextNo);

  const [submitting, setSubmitting] = useState(false);

  const [date, setDate] = useState(() => {
    if (editExpenseData?.date) {
      try {
        return new Date(editExpenseData.date).toISOString().split("T")[0];
      } catch {
        return editExpenseData.date;
      }
    }
    return new Date().toISOString().split("T")[0];
  });
  const [description, setDescription] = useState(editExpenseData?.description || "");
  const [amount, setAmount] = useState(editExpenseData?.amount !== undefined ? String(editExpenseData.amount) : "");
  const [paymentMethod, setPaymentMethod] = useState(editExpenseData?.paymentMethod || "");
  const [vendorId, setVendorId] = useState(editExpenseData?.vendorId || "");
  const [expenseAccountId, setExpenseAccountId] = useState(editExpenseData?.expenseAccountId || "");
  const [selectedBranchId, setSelectedBranchId] = useState(editExpenseData?.branchId || userBranchId);
  const [paid, setPaid] = useState(editExpenseData?.paid ?? false);
  const [notes, setNotes] = useState(editExpenseData?.notes || "");

  useEffect(() => {
    if (editExpenseData) {
      if (editExpenseData.date) {
        try {
          setDate(new Date(editExpenseData.date).toISOString().split("T")[0]);
        } catch {
          setDate(editExpenseData.date);
        }
      }
      setDescription(editExpenseData.description || "");
      setAmount(editExpenseData.amount !== undefined ? String(editExpenseData.amount) : "");
      setPaymentMethod(editExpenseData.paymentMethod || "");
      setVendorId(editExpenseData.vendorId || "");
      setExpenseAccountId(editExpenseData.expenseAccountId || "");
      if (editExpenseData.branchId) {
        setSelectedBranchId(editExpenseData.branchId);
      }
      setPaid(editExpenseData.paid ?? false);
      setNotes(editExpenseData.notes || "");
    } else if (userBranchId && !selectedBranchId) {
      setSelectedBranchId(userBranchId);
    }
  }, [editExpenseData, userBranchId]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    if (!description.trim()) {
      toast.error("Description is required.");
      return;
    }
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      toast.error("Amount (KGS) must be greater than zero.");
      return;
    }
    if (!paymentMethod) {
      toast.error("Payment Method is required.");
      return;
    }
    if (!vendorId) {
      toast.error("Vendor is required.");
      return;
    }
    if (!expenseAccountId) {
      toast.error("Expense Account is required.");
      return;
    }
    const finalBranchId = selectedBranchId || userBranchId;
    if (!finalBranchId) {
      toast.error("Branch is required.");
      return;
    }

    setSubmitting(true);

    try {
      if (isEditing && editExpenseData?.id) {
        const result = await dispatch(updateExpense({
          id: editExpenseData.id,
          date,
          description: description.trim(),
          amount: amountNum,
          paymentMethod,
          vendorId,
          expenseAccountId,
          branchId: finalBranchId,
          paid,
          notes: notes.trim() || undefined,
        })).unwrap();

        toast.success(`Expense ${result.expenseNo || editExpenseData.expenseNo} updated successfully!`, {
          description: `${result.description} — ${result.amount} KGS.`,
        });
      } else {
        const result = await dispatch(createExpense({
          date,
          description: description.trim(),
          amount: amountNum,
          paymentMethod,
          vendorId,
          expenseAccountId,
          branchId: finalBranchId,
          paid,
          notes: notes.trim() || undefined,
        })).unwrap();

        toast.success(`Expense ${result.expenseNo || nextExpenseNo} created successfully!`, {
          description: `${result.description} — ${result.amount} KGS. ${result.journalEntryNo ? `Linked Journal Entry ${result.journalEntryNo}.` : ""}`,
        });

        // Reset form after creation
        setDescription("");
        setAmount("");
        setPaymentMethod("");
        setVendorId("");
        setExpenseAccountId("");
        setPaid(false);
        setNotes("");
        setDate(new Date().toISOString().split("T")[0]);
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      const errorMsg = typeof err === "string" ? err : err?.message || "Failed to save expense.";
      toast.error(isEditing ? "Expense update failed" : "Expense creation failed", { description: errorMsg });
    } finally {
      setSubmitting(false);
    }
  }, [isEditing, editExpenseData, date, description, amount, paymentMethod, vendorId, expenseAccountId, selectedBranchId, userBranchId, paid, notes, nextExpenseNo, dispatch, onSuccess]);

  const getCalculatedExpenseNo = useCallback(() => {
    if (isEditing && editExpenseData?.expenseNo) {
      return editExpenseData.expenseNo;
    }
    try {
      const d = date ? new Date(date) : new Date();
      const validD = isNaN(d.getTime()) ? new Date() : d;
      const yyyy = validD.getFullYear();
      const mm = String(validD.getMonth() + 1).padStart(2, "0");
      const dd = String(validD.getDate()).padStart(2, "0");
      return `EXP-${yyyy}-${mm}-${dd}`;
    } catch {
      return "EXP-2026-09-10";
    }
  }, [isEditing, editExpenseData, date]);

  return (
    <Card className="bg-card border-border shadow-md overflow-hidden">
      <CardHeader className="border-b border-border/60 py-4 px-5 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-sm font-bold text-foreground">
              {isEditing ? "Edit Expense / Редактирование расхода" : "New Expense Submission / Создание расхода"}
            </CardTitle>
            <CardDescription className="text-[10px] mt-0.5">
              {isEditing
                ? `Updating expense record ${editExpenseData?.expenseNo || ""}. Changes sync to Airtable and Prisma DB.`
                : "Expense record saves synchronously to Airtable and Prisma DB."}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Row 1: Expense No + Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="expense-no" className="text-[11px] font-bold text-foreground">
                Expense No / Номер расхода
              </Label>
              <Input
                id="expense-no"
                type="text"
                value={getCalculatedExpenseNo()}
                className="text-xs h-9 bg-muted/50 font-mono font-bold text-primary cursor-not-allowed border-primary/20"
                readOnly
                disabled
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expense-date" className="text-[11px] font-bold text-foreground">
                Date / Дата <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="expense-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="text-xs h-9"
                required
              />
            </div>
          </div>

          {/* Row 2: Description */}
          <div className="space-y-1.5">
            <Label htmlFor="expense-description" className="text-[11px] font-bold text-foreground">
              Description / Описание <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="expense-description"
              type="text"
              placeholder="e.g. Office stationery & printer paper"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs h-9"
              required
            />
          </div>

          {/* Row 3: Amount (KGS) + Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="expense-amount" className="text-[11px] font-bold text-foreground">
                Amount (KGS) / Сумма (сом) <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="expense-amount"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || /^\d*\.?\d*$/.test(value)) {
                    setAmount(value);
                  }
                }}
                className="text-xs h-9 font-mono font-bold"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expense-payment-method" className="text-[11px] font-bold text-foreground">
                Payment Method / Способ оплаты <span className="text-rose-500">*</span>
              </Label>
              <NativeSelect
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="text-xs"
              >
                <NativeSelectOption value="">Select method...</NativeSelectOption>
                {PAYMENT_METHODS.map((method) => (
                  <NativeSelectOption key={method} value={method}>
                    {method}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          </div>

          {/* Row 4: Paid Checkbox */}
          <div className="p-3 bg-muted/20 border border-border/60 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <input
                id="expense-paid"
                type="checkbox"
                checked={paid}
                onChange={(e) => setPaid(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
              />
              <Label htmlFor="expense-paid" className="text-xs font-bold text-foreground cursor-pointer">
                Paid / Оплачено
              </Label>
            </div>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${paid
              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
              : "bg-amber-500/10 text-amber-600 border-amber-500/20"
              }`}>
              {paid ? "Paid" : "Unpaid / On Account"}
            </span>
          </div>

          {/* Row 5: Vendor + Expense Account */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="expense-vendor" className="text-[11px] font-bold text-foreground">
                Vendor <span className="text-rose-500">*</span>
              </Label>
              <NativeSelect
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="text-xs"
              >
                <NativeSelectOption value="">Select vendor...</NativeSelectOption>
                {vendors.map((v: Option) => (
                  <NativeSelectOption key={v.id} value={v.id}>
                    {v.name}
                  </NativeSelectOption>
                ))}
                {vendors.length === 0 && (
                  <NativeSelectOption value="" disabled>
                    No vendors available
                  </NativeSelectOption>
                )}
              </NativeSelect>
              {vendors.length > 0 && (
                <p className="text-[9px] text-muted-foreground">{vendors.length} vendor(s) loaded</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expense-account" className="text-[11px] font-bold text-foreground">
                Expense Account  <span className="text-rose-500">*</span>
              </Label>
              <NativeSelect
                value={expenseAccountId}
                onChange={(e) => setExpenseAccountId(e.target.value)}
                className="text-xs"
              >
                <NativeSelectOption value="">Select active account...</NativeSelectOption>
                {accounts.map((a: Option) => (
                  <NativeSelectOption key={a.id} value={a.id}>
                    {a.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          </div>

          {/* Row 6: Branch Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="expense-branch" className="text-[11px] font-bold text-foreground">
              Branch<span className="text-rose-500">*</span>
            </Label>
            {branches.length > 1 ? (
              <NativeSelect
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="text-xs"
              >
                <NativeSelectOption value="">Select branch...</NativeSelectOption>
                {branches.map((b: Option) => (
                  <NativeSelectOption key={b.id} value={b.id}>
                    {b.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            ) : (
              <Input
                id="expense-branch"
                type="text"
                value={userBranchName || "Main Branch"}
                className="text-xs h-9 bg-muted/40 font-semibold text-foreground cursor-not-allowed"
                readOnly
                disabled
              />
            )}
          </div>

          {/* Row 7: Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="expense-notes" className="text-[11px] font-bold text-foreground">
              Notes / Заметки <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <textarea
              id="expense-notes"
              rows={2}
              placeholder="Additional details or reference info..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* Submit & Cancel */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={submitting}
                className="h-9 px-4 text-xs font-semibold"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={submitting}
              className="h-9 px-5 text-xs font-bold gap-1.5 shadow-md shadow-primary/20 hover:shadow-lg transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {isEditing ? "Saving..." : "Submitting..."}
                </>
              ) : isEditing ? (
                <>
                  <Save className="h-3.5 w-3.5" />
                  Save Changes / Сохранить
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Submit Expense Record
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}