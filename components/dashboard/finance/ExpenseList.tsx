"use client";

import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

interface Expense {
  id: string;
  expenseNo: string;
  date: string | null;
  description: string | null;
  amount: number | null;
  paymentMethod: string | null;
  paid: boolean;
  notes: string | null;
  vendorIds: string[];
  branchIds: string[];
  vendorName: string;
  category: string;
  branchName: string;
  submittedBy: string;
  approvalStatus: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ExpenseListProps {
  branchId?: string;
}

export function ExpenseList({ branchId }: ExpenseListProps) {
  const [data, setData] = useState<Expense[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [branchId]);

  useEffect(() => {
    fetchData();
  }, [page, branchId]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/dashboard/finance/expenses?page=${page}&limit=10`;
      if (branchId) {
        url += `&branchId=${encodeURIComponent(branchId)}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to load expenses (${res.status})`);
      const json = await res.json();
      setData(json.data || []);
      setPagination(json.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 });
    } catch (err: any) {
      setError(err.message || "Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (val: number | null) => {
    if (val === null || val === undefined) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(val);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Expense List</h3>
          <Badge variant="outline" className="text-[8px] py-0 px-1.5 font-mono">
            {pagination.total} records
          </Badge>
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
          No expenses recorded.
        </div>
      ) : (
        <div className="overflow-x-auto border border-border/60 rounded-xl shadow-inner bg-card/40">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/80 bg-muted/20 text-muted-foreground select-none">
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Expense Date</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Vendor</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Category</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase text-right">Amount</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Branch</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Submitted By</th>
                <th className="p-3 font-semibold tracking-tight text-[10px] uppercase text-center">Approval Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {data.map((row) => (
                <tr key={row.id} className="hover:bg-muted/10 transition-colors">
                  <td className="p-3 text-muted-foreground font-medium">{formatDate(row.date)}</td>
                  <td className="p-3 font-bold text-foreground/90">{row.vendorName}</td>
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
                    <Badge
                      variant="outline"
                      className={`text-[9px] py-0.5 px-2.5 font-bold capitalize select-none ${
                        row.approvalStatus === "Approved"
                          ? "bg-emerald-500/5 text-emerald-600 border-emerald-500/10"
                          : "bg-amber-500/5 text-amber-600 border-amber-500/10"
                      }`}
                    >
                      {row.approvalStatus}
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