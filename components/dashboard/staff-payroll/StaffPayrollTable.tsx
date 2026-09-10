"use client";

import { memo } from "react";
import { StaffPayrollItem } from "@/store/slices/staffPayrollSlice";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Wallet, CheckCircle, Clock, FileSpreadsheet } from "lucide-react";

interface StaffPayrollTableProps {
  data: StaffPayrollItem[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onOpenSubmitModal: (item: StaffPayrollItem) => void;
}

export const StaffPayrollTable = memo(function StaffPayrollTable({
  data,
  loading,
  currentPage,
  totalPages,
  totalCount,
  onPageChange,
  onOpenSubmitModal,
}: StaffPayrollTableProps) {
  const formatKGS = (val?: number | null) => {
    if (val === null || val === undefined) return "-";
    return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(val) + " сом";
  };

  const getRoleBadge = (role: string) => {
    const norm = role.toLowerCase();
    if (norm.includes("teacher")) {
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    }
    if (norm.includes("cleaner")) {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    if (norm.includes("smm")) {
      return "bg-purple-50 text-purple-700 border-purple-200";
    }
    if (norm.includes("finance")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  const getStatusBadge = (status: "Paid" | "Approved" | "Draft") => {
    if (status === "Paid") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          Paid
        </span>
      );
    }
    if (status === "Approved") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
          Approved
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <Clock className="w-3.5 h-3.5 text-amber-600" />
        Draft
      </span>
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
            <tr>
              <th className="py-3.5 px-4">Staff Member</th>
              <th className="py-3.5 px-4">Role</th>
              <th className="py-3.5 px-4">Branch</th>
              <th className="py-3.5 px-4">Pay Run No</th>
              <th className="py-3.5 px-4">Gross Pay</th>
              <th className="py-3.5 px-4">Method</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-36"></div></td>
                  <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-16"></div></td>
                  <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-20"></div></td>
                  <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-28"></div></td>
                  <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-24"></div></td>
                  <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-20"></div></td>
                  <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-16"></div></td>
                  <td className="py-4 px-4 text-right"><div className="h-8 bg-slate-100 rounded w-24 ml-auto"></div></td>
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  No staff members found matching the selected filters.
                </td>
              </tr>
            ) : (
              data.map((item) => {
                const rec = item.paymentRecord;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{item.fullName}</div>
                      {item.email && <div className="text-xs text-slate-500">{item.email}</div>}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs border font-medium ${getRoleBadge(item.role)}`}>
                        {item.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {item.branchName || "HQ"}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-indigo-600 font-medium">
                      {rec?.payRunNo || "-"}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-600">
                      {rec ? formatKGS(rec.grossPay) : "-"}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      {rec?.paymentMethod || "-"}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="sm"
                        onClick={() => onOpenSubmitModal(item)}
                        className={
                          item.status === "Paid"
                            ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 shadow-2xs font-medium"
                            : "bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-xs"
                        }
                      >
                        <Wallet className="w-3.5 h-3.5 mr-1.5" />
                        {item.status === "Paid" ? "View / Edit" : "Submit Payment"}
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!loading && totalCount > 0 && (
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Showing <span className="font-semibold text-slate-900">{data.length}</span> of{" "}
            <span className="font-semibold text-slate-900">{totalCount}</span> staff members
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="bg-white border-slate-200 text-slate-700 hover:bg-slate-100 h-8 px-2.5 shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs font-semibold text-slate-600 px-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              className="bg-white border-slate-200 text-slate-700 hover:bg-slate-100 h-8 px-2.5 shadow-2xs"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});
