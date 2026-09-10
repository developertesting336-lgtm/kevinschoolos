"use client";

import { useState, useEffect, useMemo } from "react";
import { StaffPayrollItem, SubmitPaymentPayload } from "@/store/slices/staffPayrollSlice";
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

interface SubmitPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffItem: StaffPayrollItem | null;
  currentPeriod: string;
  submitting: boolean;
  onSubmit: (payload: SubmitPaymentPayload) => Promise<void>;
}

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "") || "staff";
}

export function SubmitPaymentModal({
  isOpen,
  onClose,
  staffItem,
  currentPeriod,
  submitting,
  onSubmit,
}: SubmitPaymentModalProps) {
  const todayStr = new Date().toISOString().substring(0, 10);

  const [datePaid, setDatePaid] = useState<string>(todayStr);
  const [period, setPeriod] = useState<string>(currentPeriod);
  const [payType, setPayType] = useState<string>("Monthly Salary");
  const [hours, setHours] = useState<number | string>("");
  const [rate, setRate] = useState<number | string>("");
  const [grossPay, setGrossPay] = useState<number | string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("Bank Transfer");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (staffItem) {
      const rec = staffItem.paymentRecord;
      const initialDatePaid = rec?.datePaid || todayStr;
      setDatePaid(initialDatePaid);
      setPeriod(rec?.period || currentPeriod);
      setPayType(rec?.payType || "Monthly Salary");
      
      const initialHours = rec?.hours ?? staffItem.loggedHours ?? 0;
      const initialRate = rec?.rate ?? 0;
      const initialGross = rec?.grossPay ?? (initialHours * initialRate);

      setHours(initialHours === 0 ? "" : initialHours);
      setRate(initialRate === 0 ? "" : initialRate);
      setGrossPay(initialGross === 0 ? "" : initialGross);
      setPaymentMethod(rec?.paymentMethod || "Bank Transfer");
      setNotes(rec?.notes || "");
    }
  }, [staffItem, currentPeriod, todayStr]);

  const isSmmOrCleaner = useMemo(() => {
    const role = (staffItem?.role || "").toLowerCase();
    return role.includes("smm") || role.includes("cleaner");
  }, [staffItem]);

  const payRunNo = useMemo(() => {
    if (!staffItem) return "PAY-2026-05-staff";
    const d = datePaid ? new Date(datePaid) : new Date();
    const yr = isNaN(d.getFullYear()) ? "2026" : d.getFullYear();
    const mo = isNaN(d.getMonth()) ? "05" : String(d.getMonth() + 1).padStart(2, "0");
    const slug = slugifyName(staffItem.fullName);
    return `PAY-${yr}-${mo}-${slug}`;
  }, [datePaid, staffItem]);

  const handleHoursChange = (rawVal: string) => {
    const sanitized = rawVal === "" ? "" : rawVal.replace(/^0+(?=\d)/, "");
    setHours(sanitized);

    const numHours = parseFloat(sanitized) || 0;
    const numRate = parseFloat(String(rate)) || 0;
    setGrossPay(numHours * numRate === 0 ? "" : numHours * numRate);
  };

  const handleRateChange = (rawVal: string) => {
    const sanitized = rawVal === "" ? "" : rawVal.replace(/^0+(?=\d)/, "");
    setRate(sanitized);

    const numHours = parseFloat(String(hours)) || 0;
    const numRate = parseFloat(sanitized) || 0;
    setGrossPay(numHours * numRate === 0 ? "" : numHours * numRate);
  };

  const handleGrossPayChange = (rawVal: string) => {
    const sanitized = rawVal === "" ? "" : rawVal.replace(/^0+(?=\d)/, "");
    setGrossPay(sanitized);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffItem) return;

    await onSubmit({
      userId: staffItem.id,
      datePaid,
      period,
      payType,
      hours: parseFloat(String(hours)) || 0,
      rate: parseFloat(String(rate)) || 0,
      grossPay: parseFloat(String(grossPay)) || 0,
      paymentMethod,
      notes,
      branchId: staffItem.branchIds[0] || "main",
    });
  };

  if (!staffItem) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px] bg-white text-slate-900 border-slate-200 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <span>Payment Fill Form</span>
            <span className="text-sm font-normal text-indigo-600">({staffItem.fullName})</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-slate-800">
          {/* Pay Run No (DISABLED) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Pay Run No / Номер выплаты <span className="text-xs text-slate-400 font-normal">(Auto-generated)</span>
            </Label>
            <Input
              value={payRunNo}
              disabled
              className="bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed font-mono text-sm font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Date Paid */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Date Paid / Дата выплаты *
              </Label>
              <Input
                type="date"
                value={datePaid}
                onChange={(e) => setDatePaid(e.target.value)}
                required
                className="bg-white border-slate-300 text-slate-900"
              />
            </div>

            {/* Period */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Period / Период *
              </Label>
              <Input
                type="text"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="2026-05"
                required
                className="bg-white border-slate-300 text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Pay Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Pay Type / Тип оплаты *
              </Label>
              {isSmmOrCleaner ? (
                <Input
                  value="Monthly Salary"
                  disabled
                  className="bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed font-medium text-sm"
                />
              ) : (
                <select
                  value={payType}
                  onChange={(e) => setPayType(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Monthly Salary">Monthly Salary</option>
                  <option value="Hourly Salary">Hourly Salary</option>
                  <option value="Bonus / Commission">Bonus / Commission</option>
                </select>
              )}
            </div>

            {/* Payment Method */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Payment Method / Способ оплаты *
              </Label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
              </select>
            </div>
          </div>

          {/* Amount / Hours & Rate Section */}
          {isSmmOrCleaner ? (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Gross Pay (KGS) / Начислено (сом) *
              </Label>
              <Input
                type="number"
                min="0"
                step="100"
                placeholder="0"
                value={grossPay}
                onChange={(e) => handleGrossPayChange(e.target.value)}
                required
                className="bg-white border-slate-300 text-emerald-600 font-bold text-base"
              />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {/* Hours */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Hours / Часы
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="0"
                  value={hours}
                  onChange={(e) => handleHoursChange(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900"
                />
              </div>

              {/* Rate (KGS) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Rate (KGS) / Ставка (сом)
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="10"
                  placeholder="0"
                  value={rate}
                  onChange={(e) => handleRateChange(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900"
                />
              </div>

              {/* Gross Pay (KGS) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Gross Pay (KGS) / Начислено <span className="text-xs text-slate-400 font-normal">(Auto-calculated)</span>
                </Label>
                <Input
                  type="number"
                  disabled
                  placeholder="0"
                  value={grossPay}
                  className="bg-slate-100 border-slate-200 text-emerald-600 font-bold cursor-not-allowed"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Notes / Заметки
            </Label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes or details..."
              className="w-full p-2.5 rounded-md bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <DialogFooter className="pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 shadow-xs"
            >
              {submitting ? "Processing..." : "Submit Payment (Paid)"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
