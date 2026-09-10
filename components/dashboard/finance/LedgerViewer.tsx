"use client";

import React, { useEffect, useState } from "react";
import {
  Search,
  Plus,
  Eye,
  ArrowLeftRight,
  Lock,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchJournalEntriesList,
  selectJournalEntriesList,
  selectJournalEntriesPagination,
  selectJournalEntriesLoading,
  selectJournalEntriesError,
} from "@/store/slices/financeSlice";
import { NewJournalEntryModal } from "@/components/dashboard/finance/NewJournalEntryModal";
import { ViewJournalEntryModal } from "@/components/dashboard/finance/ViewJournalEntryModal";
import { ReverseEntryModal } from "@/components/dashboard/finance/ReverseEntryModal";

interface LedgerViewerProps {
  branchId?: string;
  startDate?: string;
  endDate?: string;
}

export function LedgerViewer({ branchId, startDate, endDate }: LedgerViewerProps) {
  const dispatch = useAppDispatch();

  // Redux selectors
  const data = useAppSelector(selectJournalEntriesList);
  const pagination = useAppSelector(selectJournalEntriesPagination);
  const loading = useAppSelector(selectJournalEntriesLoading);
  const error = useAppSelector(selectJournalEntriesError);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [postedFilter, setPostedFilter] = useState("all");

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedEntryForView, setSelectedEntryForView] = useState<any | null>(null);
  const [selectedEntryForReverse, setSelectedEntryForReverse] = useState<any | null>(null);

  // Search input debouncer (400ms delay)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [branchId, debouncedSearch, postedFilter, startDate, endDate]);

  useEffect(() => {
    dispatch(
      fetchJournalEntriesList({
        page,
        search: debouncedSearch,
        posted: postedFilter,
        branchId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      })
    );
  }, [dispatch, page, debouncedSearch, postedFilter, branchId, startDate, endDate]);

  const handleRefresh = () => {
    dispatch(fetchJournalEntriesList({ page, search: debouncedSearch, posted: postedFilter, branchId }));
  };

  return (
    <div className="space-y-4 select-none">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">Journal Entries & Ledger Lines</h3>
              <Badge variant="outline" className="text-[9px] py-0 px-1.5 font-mono">
                {pagination.total} entries
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium">
              Double-entry accounting workflow. Posted entries are immutable and read-only.
            </p>
          </div>
        </div>

        {/* Filter Controls & New Entry Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground/60" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search entry number, memo, source..."
              className="pl-9 text-xs h-9 rounded-xl focus-visible:ring-primary/20 border-border"
            />
          </div>

          {/* Posted Status Filter */}
          <select
            value={postedFilter}
            onChange={(e) => setPostedFilter(e.target.value)}
            className="bg-card border border-border px-3 py-1.5 rounded-xl text-xs font-semibold text-foreground focus:ring-0 focus:outline-none cursor-pointer h-9 shadow-sm"
          >
            <option value="all">All Posting Status</option>
            <option value="true">Posted Only</option>
            <option value="false">Draft Only</option>
          </select>

          {/* New Journal Entry Button */}
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:bg-primary/90 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="h-4 w-4" /> New Journal Entry
          </button>
        </div>
      </div>

      {/* Main Content / Table */}
      {loading ? (
        <div className="space-y-3 py-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-24" />
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 border border-border/60 rounded-xl bg-card space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="py-8 text-center text-xs text-rose-500 font-medium">
          Error loading journal entries: {error}
        </div>
      ) : data.length === 0 ? (
        <div className="py-12 text-center space-y-3">
          <div className="mx-auto h-10 w-10 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground">
            <BookOpen className="h-5 w-5" />
          </div>
          <p className="text-xs text-muted-foreground font-medium">
            No journal entries match your search criteria or branch selection.
          </p>
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary/30 text-primary text-xs font-bold hover:bg-primary/10 transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Create First Entry
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto border border-border/60 rounded-xl shadow-inner bg-card">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-muted-foreground select-none">
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Entry No</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Date</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Source</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Branch</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Memo / Business Purpose</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase text-right">Debit (KGS)</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase text-right">Credit (KGS)</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase text-center">Status</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {data.map((entry: any) => (
                <tr key={entry.id} className="hover:bg-muted/10 transition-colors">
                  <td className="p-3 font-mono font-bold text-foreground">{entry.entryNo}</td>
                  <td className="p-3 text-muted-foreground">
                    {entry.date ? new Date(entry.date).toLocaleDateString() : "—"}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-muted/50 border border-border text-foreground">
                      {entry.source || "Manual"}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground font-medium">{entry.branchName || "Main Branch"}</td>
                  <td className="p-3 font-medium text-foreground max-w-xs truncate" title={entry.memo}>
                    {entry.memo || "—"}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-rose-600">
                    {entry.totalDebit != null ? `${Number(entry.totalDebit).toFixed(2)}` : "0.00"}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-emerald-600">
                    {entry.totalCredit != null ? `${Number(entry.totalCredit).toFixed(2)}` : "0.00"}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      {entry.posted ? (
                        <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[9px] font-bold">
                          <Lock className="h-2.5 w-2.5" />
                          <span>Posted</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2 py-0.5 rounded-full text-[9px] font-bold">
                          <HelpCircle className="h-2.5 w-2.5" />
                          <span>Draft</span>
                        </div>
                      )}

                      {entry.isReversed && (
                        <span className="bg-rose-500/10 text-rose-600 border border-rose-500/20 px-2 py-0.5 rounded-full text-[9px] font-bold">
                          Reversed
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {/* View Details Action */}
                      <button
                        onClick={() => setSelectedEntryForView(entry)}
                        className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
                        title="View Entry Details"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>

                      {/* Reverse Entry Action (Allowed for Posted, Non-Reversed entries) */}
                      {entry.posted && !entry.isReversed && (
                        <button
                          onClick={() => setSelectedEntryForReverse(entry)}
                          className="p-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 text-rose-600 hover:bg-rose-500/20 transition-colors cursor-pointer"
                          title="Reverse Entry"
                        >
                          <ArrowLeftRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 select-none">
          <span className="text-[11px] text-muted-foreground font-semibold">
            Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted/40 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted/40 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <NewJournalEntryModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSuccess={handleRefresh}
        currentBranchId={branchId}
      />

      <ViewJournalEntryModal
        isOpen={Boolean(selectedEntryForView)}
        onClose={() => setSelectedEntryForView(null)}
        entry={selectedEntryForView}
        onReverse={(ent) => setSelectedEntryForReverse(ent)}
      />

      <ReverseEntryModal
        isOpen={Boolean(selectedEntryForReverse)}
        onClose={() => setSelectedEntryForReverse(null)}
        onSuccess={handleRefresh}
        entry={selectedEntryForReverse}
      />
    </div>
  );
}