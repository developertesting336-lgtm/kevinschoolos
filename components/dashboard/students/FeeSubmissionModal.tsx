"use client";

import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  submitStudentFee,
  updateStudentFee,
  selectSubmittingFeeStudentId,
  Student,
  StudentFeeRecord,
} from "@/store/slices/studentsSlice";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, DollarSign, Calendar, CreditCard, Hash, Pencil } from "lucide-react";

interface FeeSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  selectedMonth: string;
  existingFeeRecord?: StudentFeeRecord | null;
}

/** Returns "YYYY-MM-01" — the first day of the given "YYYY-MM" month string */
function firstDayOfMonth(month: string): string {
  return `${month}-01`;
}

export function FeeSubmissionModal({
  isOpen,
  onClose,
  student,
  selectedMonth,
  existingFeeRecord,
}: FeeSubmissionModalProps) {
  const dispatch = useAppDispatch();
  const submittingId = useAppSelector(selectSubmittingFeeStudentId);

  const isEditMode = !!(existingFeeRecord?.paymentId);

  // Default date: existing payment date if editing, otherwise 1st of selected month
  const defaultDate = existingFeeRecord?.date
    ? existingFeeRecord.date.split("T")[0]
    : firstDayOfMonth(selectedMonth);

  const [date, setDate] = useState<string>(defaultDate);
  const [amount, setAmount] = useState<string>(
    existingFeeRecord?.amount ? String(existingFeeRecord.amount) : ""
  );
  const [method, setMethod] = useState<string>(existingFeeRecord?.method || "Cash");
  const [parentName, setParentName] = useState<string>("");
  const [loadingParent, setLoadingParent] = useState<boolean>(false);

  // Reset form fields whenever the modal opens / student / existingFeeRecord changes
  useEffect(() => {
    if (!isOpen) return;
    const newDate = existingFeeRecord?.date
      ? existingFeeRecord.date.split("T")[0]
      : firstDayOfMonth(selectedMonth);
    setDate(newDate);
    setAmount(existingFeeRecord?.amount ? String(existingFeeRecord.amount) : "");
    setMethod(existingFeeRecord?.method || "Cash");
  }, [isOpen, student, selectedMonth, existingFeeRecord]);

  // Fetch parent name for payment ref preview
  useEffect(() => {
    let isMounted = true;
    if (student && student.parentIds && student.parentIds.length > 0) {
      setLoadingParent(true);
      fetch(`/api/data/parent`)
        .then((res) => res.json())
        .then((parentsData) => {
          if (!isMounted) return;
          const parentsList = Array.isArray(parentsData) ? parentsData : parentsData.data || [];
          const firstParentId = student.parentIds?.[0];
          const parent = firstParentId ? parentsList.find((p: any) => p.id === firstParentId) : null;
          setParentName(parent?.parentName || student.studentName);
        })
        .catch(() => {
          if (isMounted) setParentName(student.studentName);
        })
        .finally(() => {
          if (isMounted) setLoadingParent(false);
        });
    } else if (student) {
      setParentName(student.studentName);
    }
    return () => {
      isMounted = false;
    };
  }, [student]);

  if (!student) return null;

  const displayName = parentName || student.studentName;
  const paymentRefPreview = `${date} - ${displayName}`;
  const isSubmitting = submittingId === student.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid fee amount greater than 0 KGS.");
      return;
    }

    try {
      if (isEditMode && existingFeeRecord?.paymentId) {
        // UPDATE existing payment record
        const actionResult = await dispatch(
          updateStudentFee({
            paymentId: existingFeeRecord.paymentId,
            studentId: student.id,
            amount: numAmount,
            date,
            method,
            month: selectedMonth,
          })
        );

        if (updateStudentFee.fulfilled.match(actionResult)) {
          toast.success(`Fee updated to ${numAmount.toLocaleString()} KGS for ${student.studentName}!`);
          onClose();
        } else {
          const errPayload = actionResult.payload as string;
          toast.error(errPayload || "Failed to update fee. Please try again.");
        }
      } else {
        // CREATE new payment record
        const actionResult = await dispatch(
          submitStudentFee({
            studentId: student.id,
            amount: numAmount,
            date,
            method,
            month: selectedMonth,
          })
        );

        if (submitStudentFee.fulfilled.match(actionResult)) {
          toast.success(`Fee of ${numAmount.toLocaleString()} KGS submitted successfully for ${student.studentName}!`);
          onClose();
        } else {
          const errPayload = actionResult.payload as string;
          toast.error(errPayload || "Failed to submit fee. Please try again.");
        }
      }
    } catch (err: any) {
      toast.error("An unexpected error occurred while processing the fee.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border shadow-xl">
        <DialogHeader className="border-b border-border pb-4">
          <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            {isEditMode ? (
              <Pencil className="h-5 w-5 text-amber-500" />
            ) : (
              <DollarSign className="h-5 w-5 text-emerald-500" />
            )}
            {isEditMode ? "Edit Student Fee" : "Submit Student Monthly Fee"}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {isEditMode ? "Update" : "Record"} tuition fee payment for{" "}
            <span className="font-semibold text-foreground">{student.studentName}</span> ({selectedMonth})
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Payment Ref (Disabled) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5" />
              Payment Ref (Auto-generated)
            </Label>
            <Input
              value={paymentRefPreview}
              disabled
              className="bg-muted/50 font-mono text-xs text-foreground cursor-not-allowed border-border"
            />
          </div>

          {/* Submission Date — defaults to 1st of selected month */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Submission Date
            </Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="text-xs bg-background border-border text-foreground"
            />
          </div>

          {/* Amount & Method */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                Amount (KGS) <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                min="1"
                step="any"
                placeholder="e.g. 5000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                autoFocus
                className="text-xs font-semibold bg-background border-border focus-visible:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-primary" />
                Payment Method <span className="text-destructive">*</span>
              </Label>
              <Select value={method} onValueChange={(val) => val && setMethod(val)}>
                <SelectTrigger className="text-xs bg-background border-border text-foreground h-9">
                  <SelectValue placeholder="Select Method" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-border flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !amount}
              className={
                isEditMode
                  ? "text-xs bg-amber-500 hover:bg-amber-600 text-white font-semibold flex items-center gap-1.5"
                  : "text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5"
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {isEditMode ? "Updating..." : "Saving & Syncing..."}
                </>
              ) : (
                isEditMode ? "Update Fee" : "Submit & Save Fee"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
