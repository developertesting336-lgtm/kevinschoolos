"use client";

import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Users, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchTeacherPayList, selectTeacherPayList, selectTeacherPayPagination, selectTeacherPayLoading, selectTeacherPayError } from "@/store/slices/financeSlice";

interface TeacherPayViewerProps {
  branchId?: string;
}

export function TeacherPayViewer({ branchId }: TeacherPayViewerProps) {
  const dispatch = useAppDispatch();

  // Redux hooks
  const data = useAppSelector(selectTeacherPayList);
  const pagination = useAppSelector(selectTeacherPayPagination);
  const loading = useAppSelector(selectTeacherPayLoading);
  const error = useAppSelector(selectTeacherPayError);

  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [branchId]);

  useEffect(() => {
    dispatch(fetchTeacherPayList({ page, branchId }));
  }, [dispatch, page, branchId]);

  const formatCurrency = (val: number | null) => {
    if (val === null || val === undefined) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(val);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Teacher Pay Summary</h3>
          <Badge variant="outline" className="text-[8px] py-0 px-1.5 font-mono">
            {pagination.total} records
          </Badge>
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground font-semibold">Loading teacher payroll...</span>
        </div>
      ) : error ? (
        <div className="py-8 text-center text-xs text-rose-500 font-medium">
          Error: {error}
        </div>
      ) : data.length === 0 ? (
        <div className="py-12 text-center text-xs text-muted-foreground font-medium">
          No teacher pay runs recorded.
        </div>
      ) : (
        <div className="overflow-x-auto border border-border/60 rounded-xl shadow-inner bg-card/40">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/80 bg-muted/20 text-muted-foreground select-none">
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Teacher</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Payroll Period</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase text-right">Teaching Hours</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase text-right">Hourly Rate</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase text-right">Gross Pay</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase text-right">Adjustments</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase text-right">Final Pay</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase text-center">Payroll Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {data.map((row: any) => (
                <tr key={row.id} className="hover:bg-muted/10 transition-colors">
                  <td className="p-3 font-bold text-foreground/90">{row.teacherName}</td>
                  <td className="p-3 text-muted-foreground font-medium">{formatDate(row.period)}</td>
                  <td className="p-3 text-right font-mono font-semibold text-foreground">
                    {row.hours != null ? row.hours.toFixed(1) : "—"}
                  </td>
                  <td className="p-3 text-right font-mono font-semibold text-muted-foreground">
                    {row.rate != null ? `$${row.rate.toFixed(2)}` : "—"}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-foreground">
                    {formatCurrency((row.hours || 0) * (row.rate || 0))}
                  </td>
                  <td className={`p-3 text-right font-mono font-bold ${row.adjustments < 0 ? "text-rose-600" : row.adjustments > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
                    {row.adjustments !== 0 ? `${row.adjustments < 0 ? "-" : ""}$${Math.abs(row.adjustments).toFixed(2)}` : "$0.00"}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-primary">
                    {formatCurrency(row.finalPay)}
                  </td>
                  <td className="p-3 text-center">
                    <Badge
                      variant="outline"
                      className={`text-[9px] py-0.5 px-2.5 font-bold capitalize select-none ${
                        row.status?.toLowerCase() === "paid"
                          ? "bg-emerald-500/5 text-emerald-600 border-emerald-500/10"
                          : row.status?.toLowerCase() === "approved"
                          ? "bg-blue-500/5 text-blue-600 border-blue-500/10"
                          : "bg-amber-500/5 text-amber-600 border-amber-500/10"
                      }`}
                    >
                      {row.status || "Draft"}
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