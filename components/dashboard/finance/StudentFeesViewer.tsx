"use client";

import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Loader2, ChevronLeft, ChevronRight, Search, Calendar, X, CreditCard } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchStudentFeesList,
  selectStudentFeesList,
  selectStudentFeesPagination,
  selectStudentFeesTotalAmount,
  selectStudentFeesLoading,
  selectStudentFeesError,
} from "@/store/slices/financeSlice";

interface StudentFeesViewerProps {
  branchId?: string;
  startDate?: string;
  endDate?: string;
}

export function StudentFeesViewer({ branchId, startDate: propStartDate = "", endDate: propEndDate = "" }: StudentFeesViewerProps) {
  const dispatch = useAppDispatch();

  // Redux hooks
  const data = useAppSelector(selectStudentFeesList);
  const pagination = useAppSelector(selectStudentFeesPagination);
  const totalAmount = useAppSelector(selectStudentFeesTotalAmount);
  const loading = useAppSelector(selectStudentFeesLoading);
  const error = useAppSelector(selectStudentFeesError);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState(propStartDate);
  const [endDate, setEndDate] = useState(propEndDate);

  useEffect(() => {
    setStartDate(propStartDate);
    setEndDate(propEndDate);
  }, [propStartDate, propEndDate]);

  useEffect(() => {
    setPage(1);
  }, [branchId, startDate, endDate, search]);

  useEffect(() => {
    dispatch(
      fetchStudentFeesList({
        page,
        branchId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: search || undefined,
      })
    );
  }, [dispatch, page, branchId, startDate, endDate, search]);

  const formatCurrency = (val: number | null) => {
    if (val === null || val === undefined) return "—";
    return `${val.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} KGS`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const hasActiveFilters = Boolean(startDate || endDate || search);

  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    setSearch("");
  };

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
            <CreditCard className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">Student Fees (Paid)</h3>
              <Badge variant="outline" className="text-[9px] py-0 px-1.5 font-mono">
                {pagination.total} records
              </Badge>
              <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] py-0 px-2 font-mono font-bold">
                Total Paid: {formatCurrency(totalAmount)}
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground font-medium">
              Only successfully paid student fee payments and receipts.
            </p>
          </div>
        </div>

        {/* Date Filter & Search Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative flex items-center">
            <Search className="h-3 w-3 absolute left-2.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search student name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7 pr-3 py-1 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary w-36 md:w-44 text-foreground placeholder:text-muted-foreground/60 font-medium"
            />
          </div>

          {/* Date range pickers */}
          <div className="flex items-center gap-1.5 bg-card border border-border px-2.5 py-1 rounded-xl shadow-xs">
            <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-0 text-[11px] font-semibold text-foreground focus:ring-0 focus:outline-none cursor-pointer"
              title="Start Date"
            />
            <span className="text-[10px] text-muted-foreground font-semibold">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-0 text-[11px] font-semibold text-foreground focus:ring-0 focus:outline-none cursor-pointer"
              title="End Date"
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="p-1.5 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer text-xs flex items-center gap-1 font-semibold"
              title="Clear Filters"
            >
              <X className="h-3 w-3" />
              <span className="text-[10px]">Clear</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground font-semibold">Loading student fees...</span>
        </div>
      ) : error ? (
        <div className="py-8 text-center text-xs text-rose-500 font-medium">
          Error: {error}
        </div>
      ) : data.length === 0 ? (
        <div className="py-12 text-center text-xs text-muted-foreground font-medium">
          No paid student fees found for the selected filter range.
        </div>
      ) : (
        <div className="overflow-x-auto border border-border/60 rounded-xl shadow-inner bg-card/40">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/80 bg-muted/20 text-muted-foreground select-none">
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Student</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Parent / Contact</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Payment Ref</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Date</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Payment Method</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Branch</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase text-right">Amount Paid</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {data.map((row: any) => (
                <tr key={row.id} className="hover:bg-muted/10 transition-colors">
                  <td className="p-3 font-bold text-foreground/90">{row.studentName}</td>
                  <td className="p-3 text-muted-foreground font-medium">{row.parentName}</td>
                  <td className="p-3 font-mono font-semibold text-muted-foreground text-[11px]">
                    {row.paymentRef}
                  </td>
                  <td className="p-3 text-muted-foreground font-medium">{formatDate(row.date)}</td>
                  <td className="p-3 font-medium text-foreground/80 capitalize">{row.method}</td>
                  <td className="p-3 text-muted-foreground font-medium">{row.branchName}</td>
                  <td className="p-3 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(row.amount)}
                  </td>
                  <td className="p-3 text-center">
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] py-0.5 px-2.5 font-bold uppercase select-none"
                    >
                      Paid
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-3 select-none">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted/40 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Previous
          </button>
          <span className="text-[10px] text-muted-foreground font-semibold px-2">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page >= pagination.totalPages}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted/40 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
