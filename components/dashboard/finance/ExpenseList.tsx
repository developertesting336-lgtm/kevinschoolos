"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CreditCard, Loader2, ChevronLeft, ChevronRight, CheckCircle2, Clock, Search, X, Calendar } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchExpensesList,
  selectExpensesList,
  selectExpensesPagination,
  selectExpensesLoading,
  selectExpensesError,
  selectFinanceUserRole,
} from "@/store/slices/financeSlice";
import { normalizeRole } from "@/lib/roles";

interface ExpenseListProps {
  branchId?: string;
  startDate?: string;
  endDate?: string;
}

export function ExpenseList({ branchId, startDate: propStartDate, endDate: propEndDate }: ExpenseListProps) {
  const dispatch = useAppDispatch();

  // Redux hooks
  const data = useAppSelector(selectExpensesList);
  const pagination = useAppSelector(selectExpensesPagination);
  const loading = useAppSelector(selectExpensesLoading);
  const error = useAppSelector(selectExpensesError);
  const reduxUserRole = useAppSelector(selectFinanceUserRole);

  const [page, setPage] = useState(1);
  const [userRole, setUserRole] = useState<string>(reduxUserRole || "");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Filters
  const [paidFilter, setPaidFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [localStartDate, setLocalStartDate] = useState<string>(propStartDate || "");
  const [localEndDate, setLocalEndDate] = useState<string>(propEndDate || "");

  // Sync prop changes if external filter is applied
  useEffect(() => {
    if (propStartDate !== undefined) setLocalStartDate(propStartDate || "");
    if (propEndDate !== undefined) setLocalEndDate(propEndDate || "");
  }, [propStartDate, propEndDate]);

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

  useEffect(() => {
    setPage(1);
  }, [branchId, localStartDate, localEndDate, paidFilter]);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    dispatch(
      fetchExpensesList({
        page,
        branchId,
        search: debouncedSearch,
        paid: paidFilter === "all" ? undefined : paidFilter,
        startDate: localStartDate || undefined,
        endDate: localEndDate || undefined,
      })
    );
  }, [dispatch, page, branchId, debouncedSearch, paidFilter, localStartDate, localEndDate]);

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
      {/* Top Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-border/40 pb-4 gap-3">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Expense List</h3>
          <Badge variant="outline" className="text-[10px] py-0.5 px-2 font-mono">
            {pagination.total} records
          </Badge>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date range filters */}
          <div className="flex items-center gap-1.5 bg-muted/20 border border-border/60 rounded-xl px-2 py-1">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              type="date"
              value={localStartDate}
              onChange={(e) => setLocalStartDate(e.target.value)}
              className="bg-transparent text-xs text-foreground font-medium focus:outline-none cursor-pointer"
              title="Start Date"
            />
            <span className="text-xs text-muted-foreground font-bold">-</span>
            <input
              type="date"
              value={localEndDate}
              onChange={(e) => setLocalEndDate(e.target.value)}
              className="bg-transparent text-xs text-foreground font-medium focus:outline-none cursor-pointer"
              title="End Date"
            />
            {(localStartDate || localEndDate) && (
              <button
                onClick={() => {
                  setLocalStartDate("");
                  setLocalEndDate("");
                }}
                className="text-muted-foreground hover:text-foreground p-0.5"
                title="Clear date filter"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Paid / Unpaid Status Pills */}
          <div className="flex items-center p-0.5 bg-muted/40 rounded-xl border border-border/60">
            <button
              onClick={() => setPaidFilter("all")}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                paidFilter === "all"
                  ? "bg-card text-foreground shadow-xs border border-border/40"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setPaidFilter("paid")}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                paidFilter === "paid"
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-xs border border-emerald-500/30"
                  : "text-muted-foreground hover:text-emerald-600"
              }`}
            >
              <CheckCircle2 className="h-3 w-3" />
              Paid
            </button>
            <button
              onClick={() => setPaidFilter("unpaid")}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                paidFilter === "unpaid"
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-xs border border-amber-500/30"
                  : "text-muted-foreground hover:text-amber-600"
              }`}
            >
              <Clock className="h-3 w-3" />
              Unpaid
            </button>
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search description..."
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
          {debouncedSearch
            ? `No expenses matching "${debouncedSearch}".`
            : "No expenses recorded for selected criteria."}
        </div>
      ) : (
        <div className="overflow-x-auto border border-border/60 rounded-xl shadow-inner bg-card/40">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/80 bg-muted/20 text-muted-foreground select-none">
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Expense Date</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Vendor</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Description</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Payment Method</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Expense Account</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase text-right">Amount</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Branch</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {data.map((row: any) => {
                const isPaid = row.paid === true;
                return (
                  <tr key={row.id} className="hover:bg-muted/10 transition-colors">
                    <td className="p-3 text-muted-foreground font-medium whitespace-nowrap">
                      {formatDate(row.date)}
                    </td>
                    <td className="p-3 font-bold text-foreground/90 whitespace-nowrap">
                      {row.vendorName}
                    </td>
                    <td className="p-3 font-medium text-foreground/90 max-w-xs truncate" title={row.description}>
                      {row.description || "—"}
                    </td>
                    <td className="p-3 font-medium text-muted-foreground">
                      <Badge variant="outline" className="text-[10px] py-0 px-2 font-normal capitalize bg-muted/30">
                        {row.paymentMethod || "—"}
                      </Badge>
                    </td>
                    <td className="p-3 font-medium text-foreground/80 max-w-xs truncate" title={row.expenseAccountName}>
                      {row.expenseAccountName || "—"}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-rose-600 whitespace-nowrap">
                      {formatCurrency(row.amount)}
                    </td>
                    <td className="p-3 text-muted-foreground font-medium whitespace-nowrap">
                      {row.branchName}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="h-3 w-3" />
                          Paid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          <Clock className="h-3 w-3" />
                          Unpaid
                        </span>
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