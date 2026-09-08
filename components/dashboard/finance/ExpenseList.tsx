"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CreditCard, Loader2, ChevronLeft, ChevronRight, Check, X, Search } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchExpensesList,
  updateExpenseApprovalStatus,
  selectExpensesList,
  selectExpensesPagination,
  selectExpensesLoading,
  selectExpensesError,
  selectFinanceUserRole,
} from "@/store/slices/financeSlice";
import { normalizeRole } from "@/lib/roles";
import { toast } from "sonner";

interface ExpenseListProps {
  branchId?: string;
}

export function ExpenseList({ branchId }: ExpenseListProps) {
  const dispatch = useAppDispatch();

  // Redux hooks
  const data = useAppSelector(selectExpensesList);
  const pagination = useAppSelector(selectExpensesPagination);
  const loading = useAppSelector(selectExpensesLoading);
  const error = useAppSelector(selectExpensesError);
  const reduxUserRole = useAppSelector(selectFinanceUserRole);

  const [page, setPage] = useState(1);
  const [userRole, setUserRole] = useState<string>(reduxUserRole || "");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Ensure role is retrieved even if accessed directly
  useEffect(() => {
    if (reduxUserRole) {
      setUserRole(reduxUserRole);
    } else {
      fetch("/api/auth/me")
        .then((r) => r.json())
        .then((res) => {
          if (res.role) setUserRole(res.role);
        })
        .catch(() => { });
    }
  }, [reduxUserRole]);

  const normalizedRole = normalizeRole(userRole);
  const isAuthorizedToApprove = normalizedRole === "finance" || normalizedRole === "owner";

  useEffect(() => {
    setPage(1);
  }, [branchId]);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    dispatch(fetchExpensesList({ page, branchId, search: debouncedSearch }));
  }, [dispatch, page, branchId, debouncedSearch]);

  const handleApprovalAction = useCallback(
    async (expenseId: string, status: "Approved" | "Rejected") => {
      setActionLoadingId(expenseId);
      try {
        await dispatch(updateExpenseApprovalStatus({ expenseId, status })).unwrap();
        toast.success(`Expense ${status === "Approved" ? "Approved" : "Rejected"}`, {
          description: `Status updated to ${status}.`,
        });
      } catch (err: any) {
        const msg = typeof err === "string" ? err : err?.message || "Failed to update status.";
        toast.error("Action failed", { description: msg });
      } finally {
        setActionLoadingId(null);
      }
    },
    [dispatch]
  );

  const formatCurrency = (val: number | null) => {
    if (val === null || val === undefined) return "—";
    return `${val.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} KGS`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/40 pb-4 gap-3">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Expense List</h3>
          <Badge variant="outline" className="text-[8px] py-0 px-1.5 font-mono">
            {pagination.total} records
          </Badge>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search expense by description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-8 text-xs h-8 bg-muted/20 border-border"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground font-semibold">Loading expenses...</span>
        </div>
      ) : error ? (
        <div className="py-8 text-center text-xs text-rose-500 font-medium">
          Error: {error}
        </div>
      ) : data.length === 0 ? (
        <div className="py-12 text-center text-xs text-muted-foreground font-medium">
          {debouncedSearch ? `No expenses matching "${debouncedSearch}".` : "No expenses recorded."}
        </div>
      ) : (
        <div className="overflow-x-auto border border-border/60 rounded-xl shadow-inner bg-card/40">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/80 bg-muted/20 text-muted-foreground select-none">
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Expense Date</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Vendor</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Description</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Category</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase text-right">Amount</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Branch</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Submitted By</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase text-center">Approval Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {data.map((row: any) => {
                const isPending = row.approvalStatus === "Pending" || row.approvalStatus === "Pending Approval";
                const isProcessing = actionLoadingId === row.id;

                return (
                  <tr key={row.id} className="hover:bg-muted/10 transition-colors">
                    <td className="p-3 text-muted-foreground font-medium">{formatDate(row.date)}</td>
                    <td className="p-3 font-bold text-foreground/90">{row.vendorName}</td>
                    <td className="p-3 font-medium text-foreground/90 max-w-xs truncate" title={row.description}>
                      {row.description || "—"}
                    </td>
                    <td className="p-3 font-medium">
                      <Badge variant="secondary" className="text-[9px] py-0.5 px-2 bg-muted text-muted-foreground border-none capitalize">
                        {row.category}
                      </Badge>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-rose-600">
                      {formatCurrency(row.amount)}
                    </td>
                    <td className="p-3 text-muted-foreground font-medium">{row.branchName}</td>
                    <td className="p-3 text-muted-foreground font-medium">{row.submittedBy}</td>
                    <td className="p-3 text-center">
                      {isAuthorizedToApprove && isPending ? (
                        <div className="flex items-center justify-center gap-1.5">
                          {isProcessing ? (
                            <Loader2 className="h-4 w-4 animate-spin text-primary mx-auto" />
                          ) : (
                            <>
                              <button
                                onClick={() => handleApprovalAction(row.id, "Approved")}
                                className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-extrabold py-1 px-2.5 rounded-lg transition-all shadow-xs cursor-pointer active:scale-95"
                                title="Approve expense"
                              >
                                <Check className="h-3 w-3" /> Approve
                              </button>
                              <button
                                onClick={() => handleApprovalAction(row.id, "Rejected")}
                                className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 text-[10px] font-extrabold py-1 px-2.5 rounded-lg transition-all shadow-xs cursor-pointer active:scale-95"
                                title="Reject expense"
                              >
                                <X className="h-3 w-3" /> Reject
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        <Badge
                          variant="outline"
                          className={`text-[9px] py-0.5 px-2.5 font-bold capitalize select-none ${row.approvalStatus === "Approved"
                              ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/20"
                              : row.approvalStatus === "Rejected"
                                ? "bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border-rose-500/20"
                                : "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border-amber-500/20"
                            }`}
                        >
                          {row.approvalStatus}
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
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