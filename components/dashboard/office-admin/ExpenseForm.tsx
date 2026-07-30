"use client";

import React, { useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { createExpense, selectExpenseFormVendors, selectExpenseFormAccounts, selectExpenseFormBranchId, selectExpenseFormBranchName } from "@/store/slices/financeSlice";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Loader2, Receipt, Send } from "lucide-react";

interface Option {
  id: string;
  name: string;
}

interface ExpenseFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const PAYMENT_METHODS = ["Cash", "Bank Transfer", "Card", "On Account (Unpaid)"];

export function ExpenseForm({ onSuccess, onCancel }: ExpenseFormProps) {
  const dispatch = useAppDispatch();

  // Consume data from centralized Redux store
  const vendors = useAppSelector(selectExpenseFormVendors);
  const accounts = useAppSelector(selectExpenseFormAccounts);
  const userBranchId = useAppSelector(selectExpenseFormBranchId);
  const userBranchName = useAppSelector(selectExpenseFormBranchName);

  const [submitting, setSubmitting] = useState(false);

  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [expenseAccountId, setExpenseAccountId] = useState("");
  const [paid, setPaid] = useState(false);
  const [notes, setNotes] = useState("");

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

    setSubmitting(true);

    try {
      const result = await dispatch(createExpense({
        date,
        description: description.trim(),
        amount: amountNum,
        paymentMethod,
        vendorId,
        expenseAccountId,
        branchId: userBranchId,
        paid,
        notes: notes.trim() || undefined,
      })).unwrap();

      toast.success(`Expense ${result.expenseNo} created successfully!`, {
        description: `${result.description} — ${result.amount} KGS. Pending approval.`,
      });

      // Reset form
      setDescription("");
      setAmount("");
      setPaymentMethod("");
      setVendorId("");
      setExpenseAccountId("");
      setPaid(false);
      setNotes("");
      setDate(new Date().toISOString().split("T")[0]);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      const errorMsg = typeof err === "string" ? err : err?.message || "Failed to create expense.";
      toast.error("Expense creation failed", { description: errorMsg });
    } finally {
      setSubmitting(false);
    }
  }, [date, description, amount, paymentMethod, vendorId, expenseAccountId, paid, notes, userBranchId, dispatch, onSuccess]);

  return (
    <Card className="bg-card border-border shadow-md overflow-hidden">
      <CardHeader className="border-b border-border/60 py-4 px-5 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-sm font-bold text-foreground">New Expense Submission</CardTitle>
            <CardDescription className="text-[10px] mt-0.5">
              Create a new expense record. Branch: <span className="font-semibold text-foreground">{userBranchName || "Main Branch"}</span>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Row 1: Date + Paid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="expense-date" className="text-[11px] font-bold text-foreground">
                Expense Date
              </Label>
              <Input
                id="expense-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="text-xs h-9"
              />
            </div>
            <div className="space-y-1.5 flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={paid}
                  onChange={(e) => setPaid(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-[11px] font-bold text-foreground">Paid / Оплачено</span>
              </label>
            </div>
          </div>

          {/* Row 2: Description */}
          <div className="space-y-1.5">
            <Label htmlFor="expense-description" className="text-[11px] font-bold text-foreground">
              Description <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="expense-description"
              type="text"
              placeholder="e.g. Office supplies purchase"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs h-9"
              required
            />
          </div>

          {/* Row 3: Amount + Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="expense-amount" className="text-[11px] font-bold text-foreground">
                Amount (KGS) <span className="text-rose-500">*</span>
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
                className="text-xs h-9 font-mono"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expense-payment-method" className="text-[11px] font-bold text-foreground">
                Payment Method <span className="text-rose-500">*</span>
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

          {/* Row 4: Vendor + Expense Account */}
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
                    No vendors available for this branch
                  </NativeSelectOption>
                )}
              </NativeSelect>
              {vendors.length > 0 && (
                <p className="text-[8px] text-muted-foreground">{vendors.length} vendor(s) in your branch</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expense-account" className="text-[11px] font-bold text-foreground">
                Expense Account <span className="text-rose-500">*</span>
              </Label>
              <NativeSelect
                value={expenseAccountId}
                onChange={(e) => setExpenseAccountId(e.target.value)}
                className="text-xs"
              >
                <NativeSelectOption value="">Select account...</NativeSelectOption>
                {accounts.map((a: Option) => (
                  <NativeSelectOption key={a.id} value={a.id}>
                    {a.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          </div>

          {/* Row 5: Branch (auto-filled, read-only) */}
          <div className="space-y-1.5">
            <Label htmlFor="expense-branch" className="text-[11px] font-bold text-foreground">
              Branch
            </Label>
            <Input
              id="expense-branch"
              type="text"
              value={userBranchName || "Main Branch"}
              className="text-xs h-9 bg-muted/40 font-semibold text-foreground cursor-not-allowed"
              readOnly
              disabled
            />
          </div>

          {/* Row 6: Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="expense-notes" className="text-[11px] font-bold text-foreground">
              Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <textarea
              id="expense-notes"
              rows={2}
              placeholder="Any additional notes..."
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
              className="h-9 px-5 text-xs font-bold gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Submit Expense
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}