"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchOfficeAdminExpensesList,
  fetchExpenseFormData,
  selectExpensesList,
  selectExpensesPagination,
  selectExpensesLoading,
  selectExpensesError,
  selectExpenseFormBranchName,
} from "@/store/slices/financeSlice";
import { ExpenseForm } from "@/components/dashboard/office-admin/ExpenseForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Receipt,
  Building2,
  ChevronRight,
  Plus,
  Search,
  X,
  ChevronLeft,
  RefreshCw,
  FileSpreadsheet,
  AlertCircle,
} from "lucide-react";

export default function OfficeAdminExpensesPage() {
  const dispatch = useAppDispatch();

  // Redux selectors
  const expenses = useAppSelector(selectExpensesList);
  const pagination = useAppSelector(selectExpensesPagination);
  const loading = useAppSelector(selectExpensesLoading);
  const error = useAppSelector(selectExpensesError);
  const userBranchName = useAppSelector(selectExpenseFormBranchName);

  // Local state
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Load form options & branch info once on mount
  useEffect(() => {
    dispatch(fetchExpenseFormData());
  }, [dispatch]);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to page 1 on new search query
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch expenses when page or debouncedSearch changes
  const loadExpenses = useCallback(() => {
    dispatch(fetchOfficeAdminExpensesList({ page, search: debouncedSearch }));
  }, [dispatch, page, debouncedSearch]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const handleExpenseCreated = () => {
    setIsAddModalOpen(false);
    loadExpenses();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const formatAmount = (val: number | null) => {
    if (val === null || val === undefined) return "0.00 KGS";
    return `${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KGS`;
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "Approved":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/20 font-bold text-[10px] py-0.5 px-2.5">
            Approved
          </Badge>
        );
      case "Rejected":
        return (
          <Badge className="bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border-rose-500/20 font-bold text-[10px] py-0.5 px-2.5">
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border-amber-500/20 font-bold text-[10px] py-0.5 px-2.5">
            Pending Approval
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-500 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5">
            <span>Office Admin</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-semibold">Expenses</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" />
            Office Admin Expenses
          </h1>
          <p className="text-muted-foreground text-xs mt-1 max-w-xl leading-relaxed font-medium">
            Manage operational branch expenses, view approval statuses, and
            record new expense entries.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {userBranchName && (
            <div className="flex items-center gap-2 bg-card border border-border px-3 py-1.5 rounded-xl shadow-sm">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
              <span className="text-xs font-bold text-foreground">
                {userBranchName}
              </span>
            </div>
          )}
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="h-9 px-4 text-xs font-bold gap-1.5 shadow-md shadow-primary/20 hover:shadow-lg transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Controls & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card border border-border p-3 rounded-xl shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search expense by description "
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-8 text-xs h-9 bg-muted/20 border-border"
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

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadExpenses()}
            disabled={loading}
            className="h-9 text-xs font-semibold gap-1.5"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-card border border-border/80 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-4 py-2 border-b border-border/40"
              >
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="py-12 px-4 text-center space-y-3">
            <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
            <p className="text-xs font-bold text-rose-500">
              Failed to load expenses
            </p>
            <p className="text-[11px] text-muted-foreground">{error}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => loadExpenses()}
              className="text-xs font-semibold"
            >
              Try Again
            </Button>
          </div>
        ) : expenses.length === 0 ? (
          <div className="py-16 px-4 text-center space-y-3">
            <FileSpreadsheet className="h-10 w-10 text-muted-foreground/50 mx-auto" />
            <p className="text-sm font-bold text-foreground">
              No Expenses Found
            </p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {debouncedSearch
                ? `No expense records matching "${debouncedSearch}". Try clearing your search filter.`
                : "No operational expenses recorded for your branch yet. Click 'Add Expense' to create one."}
            </p>
            {debouncedSearch ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSearchTerm("")}
                className="text-xs font-semibold"
              >
                Clear Search
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => setIsAddModalOpen(true)}
                className="text-xs font-bold gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> Add First Expense
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground select-none">
                  <th className="p-3.5 font-bold tracking-tight text-[10px] uppercase">
                    Expense No
                  </th>
                  <th className="p-3.5 font-bold tracking-tight text-[10px] uppercase">
                    Date
                  </th>
                  <th className="p-3.5 font-bold tracking-tight text-[10px] uppercase">
                    Description
                  </th>
                  <th className="p-3.5 font-bold tracking-tight text-[10px] uppercase text-right">
                    Amount (KGS)
                  </th>
                  <th className="p-3.5 font-bold tracking-tight text-[10px] uppercase">
                    Vendor
                  </th>
                  <th className="p-3.5 font-bold tracking-tight text-[10px] uppercase">
                    Payment Method
                  </th>
                  <th className="p-3.5 font-bold tracking-tight text-[10px] uppercase">
                    Branch
                  </th>
                  <th className="p-3.5 font-bold tracking-tight text-[10px] uppercase text-center">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {expenses.map((exp: any) => (
                  <tr
                    key={exp.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-3.5 font-mono font-bold text-foreground">
                      {exp.expenseNo || exp.id}
                    </td>
                    <td className="p-3.5 text-muted-foreground font-medium">
                      {formatDate(exp.date)}
                    </td>
                    <td
                      className="p-3.5 font-semibold text-foreground max-w-xs truncate"
                      title={exp.description}
                    >
                      {exp.description || "—"}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                      {formatAmount(exp.amount)}
                    </td>
                    <td className="p-3.5 font-medium text-foreground/90">
                      {exp.vendorName || "—"}
                    </td>
                    <td className="p-3.5 font-medium text-muted-foreground">
                      {exp.paymentMethod || "—"}
                    </td>
                    <td className="p-3.5 text-muted-foreground font-medium">
                      {exp.branchName || "—"}
                    </td>
                    <td className="p-3.5 text-center">
                      {renderStatusBadge(
                        exp.approvalStatus || "Pending Approval",
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && !error && pagination.totalPages > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-card/60 select-none">
            <span className="text-[11px] text-muted-foreground font-medium">
              Showing page{" "}
              <span className="font-bold text-foreground">
                {pagination.page}
              </span>{" "}
              of{" "}
              <span className="font-bold text-foreground">
                {pagination.totalPages}
              </span>{" "}
              ({pagination.total} total)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-8 px-3 text-xs font-semibold gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((p) => Math.min(pagination.totalPages, p + 1))
                }
                disabled={page >= pagination.totalPages}
                className="h-8 px-3 text-xs font-semibold gap-1"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add Expense Modal Dialog */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground p-1.5 rounded-full hover:bg-muted/50 transition-colors z-10"
              title="Close modal"
            >
              <X className="h-4 w-4" />
            </button>
            <ExpenseForm
              onSuccess={handleExpenseCreated}
              onCancel={() => setIsAddModalOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
