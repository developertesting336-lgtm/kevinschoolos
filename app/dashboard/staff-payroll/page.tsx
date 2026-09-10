"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/store/hooks";
import { validateSessionThunk } from "@/store/slices/authSlice";
import { StaffPayrollClient } from "@/components/dashboard/staff-payroll/StaffPayrollClient";

export default function StaffPayrollPage() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(validateSessionThunk());
  }, [dispatch]);

  return (
    <div className="space-y-8 select-none animate-in fade-in duration-300 p-2 md:p-6">
      <div className="max-w-7xl mx-auto">
        <StaffPayrollClient />
      </div>
    </div>
  );
}
