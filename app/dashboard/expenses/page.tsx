"use client";

import React, { useEffect, useState, useCallback, useTransition } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchOfficeAdminExpensesList,
  fetchExpenseFormData,
  selectExpensesList,
  selectExpensesPagination,
  selectExpensesLoading,
  selectExpensesError,
  selectExpenseFormBranchName,
  selectExpenseFormBranches,
} from "@/store/slices/financeSlice";
import { ExpenseForm, EditExpenseData } from "@/components/dashboard/office-admin/ExpenseForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
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
  CheckCircle2,
  Clock,
  Filter,
  Pencil,
} from "lucide-react";

export default function ExpensesPage() {
  const dispatch = useAppDispatch();

  // Redux selectors
  const expenses = useAppSelector(selectExpensesList);
  const pagination = useAppSelector(selectExpensesPagination);
  const loading = useAppSelector(selectExpensesLoading);
  const error = useAppSelector(selectExpensesError);
  const userBranchName = useAppSelector(selectExpenseFormBranchName);
  const branches = useAppSelector(selectExpenseFormBranches);

  // Local state for pagination, filters, search
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [paidFilter, setPaidFilter] = useState("all"); // 'all' | 'paid' | 'unpaid'
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("all");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<EditExpenseData | null>(null);
  const [isPending, startTransition] = useTransition();

  // Load form options & branch info once on mount
  useEffect(() => {
    dispatch(fetchExpenseFormData());
  }, [dispatch]);

  // Debounce search term with 300ms delay
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to page 1 on search change
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch expenses when page, debouncedSearch, paidFilter, dates, or branch change
  const loadExpenses = useCallback(() => {
    startTransition(() => {
      dispatch(
        fetchOfficeAdminExpensesList({
          page,
          search: debouncedSearch,
          paid: paidFilter,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          branchId: selectedBranchId !== "all" ? selectedBranchId : undefined,
        })
      );
    });
  }, [dispatch, page, debouncedSearch, paidFilter, startDate, endDate, selectedBranchId]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const handleOpenCreateModal = () => {
    setEditingExpense(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (exp: any) => {
    setEditingExpense({
      id: exp.id,
      expenseNo: exp.expenseNo,
      date: exp.date,
      description: exp.description,
      amount: exp.amount,
      paymentMethod: exp.paymentMethod,
      vendorId: exp.vendorId || (exp.vendorIds && exp.vendorIds[0]) || "",
      expenseAccountId: exp.expenseAccountId || (exp.expenseAccountIds && exp.expenseAccountIds[0]) || "",
      branchId: exp.branchId || (exp.branchIds && exp.branchIds[0]) || "",
      paid: exp.paid,
      notes: exp.notes,
    });
    setIsAddModalOpen(true);
  };

  const handleExpenseSaved = () => {
    setIsAddModalOpen(false);
    setEditingExpense(null);
    // Refresh form data to get next Expense No
    dispatch(fetchExpenseFormData());
    loadExpenses();
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setPaidFilter("all");
    setStartDate("");
    setEndDate("");
    setSelectedBranchId("all");
    setPage(1);
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

  // Render visual Paid status badge: Green mark for Paid, Orange for Unpaid
  const renderPaidStatus = (paid: boolean) => {
    if (paid) {
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/30 font-bold text-[10px] py-0.5 px-2.5 flex items-center gap-1.5 w-fit">
          <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
          <span>Paid / Оплачено</span>
        </Badge>
      );
    }
    return (
      <Badge className="bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border-amber-500/30 font-bold text-[10px] py-0.5 px-2.5 flex items-center gap-1.5 w-fit">
        <Clock className="h-3 w-3 text-amber-500 shrink-0" />
        <span>Unpaid / Ожидает</span>
      </Badge>
    );
  };

  const activeFilterCount =
    (debouncedSearch ? 1 : 0) +
    (paidFilter !== "all" ? 1 : 0) +
    (startDate ? 1 : 0) +
    (endDate ? 1 : 0) +
    (selectedBranchId !== "all" ? 1 : 0);

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-500 pb-12">
      {/* Page Header (Static top section) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5">
            <span>Dashboard</span>
            <ChevronRight className="h-3 w-3" />
            <span>Operations</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-semibold">Expenses</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" />
            Expenses Console
          </h1>
          <p className="text-muted-foreground text-xs mt-1 max-w-xl leading-relaxed font-medium">
            Record & edit operating expenses, filter by paid/unpaid status and date range, and automatically generate linked journal entries.
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
            onClick={handleOpenCreateModal}
            className="h-9 px-4 text-xs font-bold gap-1.5 shadow-md shadow-primary/20 hover:shadow-lg transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="bg-card border border-border p-3.5 rounded-2xl shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Search Input with Debounce */}
          <div className="relative lg:col-span-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search expense by description or number..."
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

          {/* Paid / Unpaid Status Pills */}
          <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-xl border border-border/50 lg:col-span-3">
            <button
              type="button"
              onClick={() => {
                setPaidFilter("all");
                setPage(1);
              }}
              className={`flex-1 text-[11px] font-bold py-1 px-2.5 rounded-lg transition-all text-center ${paidFilter === "all"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => {
                setPaidFilter("paid");
                setPage(1);
              }}
              className={`flex-1 text-[11px] font-bold py-1 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${paidFilter === "paid"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs"
                : "text-muted-foreground hover:text-emerald-600"
                }`}
            >
              <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
              Paid
            </button>
            <button
              type="button"
              onClick={() => {
                setPaidFilter("unpaid");
                setPage(1);
              }}
              className={`flex-1 text-[11px] font-bold py-1 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${paidFilter === "unpaid"
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-xs"
                : "text-muted-foreground hover:text-amber-600"
                }`}
            >
              <Clock className="h-3 w-3 text-amber-500 shrink-0" />
              Unpaid
            </button>
          </div>

          {/* Date Range Inputs */}
          <div className="flex items-center gap-2 lg:col-span-3">
            <div className="relative flex-1">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="text-xs h-9 bg-muted/20 border-border"
                title="Start Date"
              />
            </div>
            <span className="text-xs text-muted-foreground font-medium">to</span>
            <div className="relative flex-1">
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="text-xs h-9 bg-muted/20 border-border"
                title="End Date"
              />
            </div>
          </div>

          {/* Refresh & Action Controls */}
          <div className="flex items-center justify-end gap-2 lg:col-span-2">
            {branches.length > 1 && (
              <NativeSelect
                value={selectedBranchId}
                onChange={(e) => {
                  setSelectedBranchId(e.target.value);
                  setPage(1);
                }}
                className="text-xs h-9"
              >
                <NativeSelectOption value="all">All Branches</NativeSelectOption>
                {branches.map((b: any) => (
                  <NativeSelectOption key={b.id} value={b.id}>
                    {b.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => loadExpenses()}
              disabled={loading || isPending}
              className="h-9 text-xs font-semibold gap-1.5 shrink-0"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading || isPending ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Active Filters indicator */}
        {activeFilterCount > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground font-medium text-[11px]">
              <Filter className="h-3.5 w-3.5 text-primary" />
              <span>
                Active filters: <strong className="text-foreground">{activeFilterCount}</strong> applied
              </span>
            </div>
            <button
              onClick={handleResetFilters}
              className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <X className="h-3 w-3" /> Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Expenses Table (Only this section re-renders on filter/page changes) */}
      <div className="bg-card border border-border/80 rounded-2xl shadow-sm overflow-hidden">
        {loading || isPending ? (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-4 py-2.5 border-b border-border/40"
              >
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-4 w-24 text-right" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-14" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="py-12 px-4 text-center space-y-3">
            <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
            <p className="text-xs font-bold text-rose-500">
              Failed to load expense records
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
              No Expense Records Found
            </p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {activeFilterCount > 0
                ? "No expenses matching your search filters. Try clearing or adjusting filters."
                : "No operational expenses recorded yet. Click 'Add Expense' to record a new entry."}
            </p>
            {activeFilterCount > 0 ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleResetFilters}
                className="text-xs font-semibold"
              >
                Clear Filters
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleOpenCreateModal}
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
                    Expense No / Номер расхода
                  </th>
                  <th className="p-3.5 font-bold tracking-tight text-[10px] uppercase">
                    Date / Дата
                  </th>
                  <th className="p-3.5 font-bold tracking-tight text-[10px] uppercase">
                    Description / Описание
                  </th>
                  <th className="p-3.5 font-bold tracking-tight text-[10px] uppercase text-right">
                    Amount (KGS) / Сумма
                  </th>
                  <th className="p-3.5 font-bold tracking-tight text-[10px] uppercase">
                    Vendor / Поставщики
                  </th>
                  <th className="p-3.5 font-bold tracking-tight text-[10px] uppercase">
                    Payment Method
                  </th>
                  <th className="p-3.5 font-bold tracking-tight text-[10px] uppercase">
                    Branch
                  </th>
                  <th className="p-3.5 font-bold tracking-tight text-[10px] uppercase text-center">
                    Paid Status
                  </th>
                  <th className="p-3.5 font-bold tracking-tight text-[10px] uppercase text-center">
                    Action
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
                    <td className="p-3.5 text-muted-foreground font-medium whitespace-nowrap">
                      {formatDate(exp.date)}
                    </td>
                    <td
                      className="p-3.5 font-semibold text-foreground max-w-xs truncate"
                      title={exp.description}
                    >
                      {exp.description || "—"}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
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
                    <td className="p-3.5 flex justify-center">
                      {renderPaidStatus(exp.paid)}
                    </td>
                    <td className="p-3.5 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEditModal(exp)}
                        className="h-7 px-2 text-[11px] font-bold gap-1 text-muted-foreground hover:text-foreground hover:bg-muted"
                        title="Edit Expense"
                      >
                        <Pencil className="h-3.5 w-3.5 text-primary" />
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && !error && pagination.totalPages > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border bg-card/60 select-none">
            <span className="text-[11px] text-muted-foreground font-medium">
              Showing page{" "}
              <span className="font-bold text-foreground">
                {pagination.page}
              </span>{" "}
              of{" "}
              <span className="font-bold text-foreground">
                {pagination.totalPages}
              </span>{" "}
              ({pagination.total} total expenses)
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

      {/* Add / Edit Expense Modal Dialog */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingExpense(null);
              }}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground p-1.5 rounded-full hover:bg-muted/50 transition-colors z-10"
              title="Close modal"
            >
              <X className="h-4 w-4" />
            </button>
            <ExpenseForm
              editExpenseData={editingExpense}
              onSuccess={handleExpenseSaved}
              onCancel={() => {
                setIsAddModalOpen(false);
                setEditingExpense(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
