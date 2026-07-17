"use client";

import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Lock,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

interface AccountInfo {
  id: string;
  accountNo: string;
  accountName: string;
}

interface LedgerLine {
  id: string;
  line: string;
  debit: number | null;
  credit: number | null;
  memo: string | null;
  accountIds: string[];
  branchIds: string[];
  account?: AccountInfo | null;
}

interface JournalEntry {
  id: string;
  entryNo: string;
  date: string | null;
  memo: string | null;
  source: string | null;
  posted: boolean;
  isReversed?: boolean;
  branchIds: string[];
  ledgerLines: LedgerLine[];
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface LedgerViewerProps {
  branchId?: string;
}

export function LedgerViewer({ branchId }: LedgerViewerProps) {
  const [data, setData] = useState<JournalEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [postedFilter, setPostedFilter] = useState("all");

  useEffect(() => {
    setPage(1);
  }, [search, postedFilter, branchId]);

  useEffect(() => {
    fetchData();
  }, [page, search, postedFilter, branchId]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/dashboard/finance/ledger?page=${page}&limit=10`;
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }
      if (postedFilter !== "all") {
        url += `&posted=${encodeURIComponent(postedFilter)}`;
      }
      if (branchId) {
        url += `&branchId=${encodeURIComponent(branchId)}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to load ledger data (${res.status})`);
      const json = await res.json();
      setData(json.data || []);
      setPagination(json.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 });
    } catch (err: any) {
      setError(err.message || "Failed to load ledger data");
    } finally {
      setLoading(false);
    }
  }

  // Flatten the journal entries and their ledger lines for the table rows
  const rows = data.flatMap((entry) => {
    if (entry.ledgerLines.length === 0) {
      return [
        {
          id: `${entry.id}-empty`,
          entryNo: entry.entryNo,
          date: entry.date,
          posted: entry.posted,
          isReversed: entry.isReversed,
          accountNo: "—",
          accountName: "No ledger lines",
          description: entry.memo || "—",
          debit: null,
          credit: null,
          balance: 0,
        },
      ];
    }
    return entry.ledgerLines.map((line) => ({
      id: line.id,
      entryNo: entry.entryNo,
      date: entry.date,
      posted: entry.posted,
      isReversed: entry.isReversed,
      accountNo: line.account?.accountNo || "—",
      accountName: line.account?.accountName || "—",
      description: line.memo || entry.memo || "—",
      debit: line.debit,
      credit: line.credit,
      balance: (line.debit || 0) - (line.credit || 0),
    }));
  });

  return (
    <div className="space-y-4">
      {/* Search & Filter bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Ledger Lines Viewer</h3>
          <Badge variant="outline" className="text-[8px] py-0 px-1.5 font-mono">
            {pagination.total} entries
          </Badge>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground/60" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search entry number, memo..."
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
            <option value="true">Posted</option>
            <option value="false">Draft</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground font-semibold">Loading ledger records...</span>
        </div>
      ) : error ? (
        <div className="py-8 text-center text-xs text-rose-500 font-medium">
          Error: {error}
        </div>
      ) : rows.length === 0 ? (
        <div className="py-12 text-center text-xs text-muted-foreground font-medium">
          No ledger lines matching search criteria.
        </div>
      ) : (
        <div className="overflow-x-auto border border-border/60 rounded-xl shadow-inner bg-card/40">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/80 bg-muted/20 text-muted-foreground select-none">
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Journal Number</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Date</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Account</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Description</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase text-right">Debit</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase text-right">Credit</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase text-right">Balance</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-muted/10 transition-colors">
                  <td className="p-3 font-mono font-bold text-foreground/90">{row.entryNo}</td>
                  <td className="p-3 text-muted-foreground">
                    {row.date ? new Date(row.date).toLocaleDateString() : "—"}
                  </td>
                  <td className="p-3 font-medium">
                    {row.accountNo !== "—" ? (
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground font-mono">{row.accountNo}</span>
                        <span className="text-[10px] text-muted-foreground">{row.accountName}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/60">{row.accountName}</span>
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground font-medium max-w-xs truncate" title={row.description}>
                    {row.description}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-rose-600">
                    {row.debit != null ? `$${row.debit.toFixed(2)}` : "—"}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-emerald-600">
                    {row.credit != null ? `$${row.credit.toFixed(2)}` : "—"}
                  </td>
                  <td className={`p-3 text-right font-mono font-bold ${row.balance < 0 ? "text-rose-600" : row.balance > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
                    {row.balance !== 0 ? `${row.balance < 0 ? "-" : ""}$${Math.abs(row.balance).toFixed(2)}` : "$0.00"}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {row.posted ? (
                        <div className="flex items-center gap-1 bg-emerald-500/5 text-emerald-600 border border-emerald-500/10 px-2 py-0.5 rounded-full text-[9px] font-bold">
                          <Lock className="h-2.5 w-2.5" />
                          <span>Posted</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 bg-amber-500/5 text-amber-600 border border-amber-500/10 px-2 py-0.5 rounded-full text-[9px] font-bold">
                          <HelpCircle className="h-2.5 w-2.5" />
                          <span>Draft</span>
                        </div>
                      )}
                      
                      {row.isReversed && (
                        <div className="bg-rose-500/5 text-rose-600 border border-rose-500/10 px-2 py-0.5 rounded-full text-[9px] font-bold">
                          Reversed
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination component */}
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