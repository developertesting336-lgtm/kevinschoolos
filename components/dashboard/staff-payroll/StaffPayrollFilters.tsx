"use client";

import { memo } from "react";
import { Search, Calendar, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";

interface StaffPayrollFiltersProps {
  searchInput: string;
  onSearchChange: (value: string) => void;
  period: string;
  onPeriodChange: (value: string) => void;
  role: string;
  onRoleChange: (value: string) => void;
}

export const StaffPayrollFilters = memo(function StaffPayrollFilters({
  searchInput,
  onSearchChange,
  period,
  onPeriodChange,
  role,
  onRoleChange,
}: StaffPayrollFiltersProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
      {/* Search Input */}
      <div className="relative w-full md:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          type="text"
          placeholder="Search by staff name..."
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white text-sm h-10 transition-colors"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
        {/* Period Filter */}
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
          <Calendar className="w-4 h-4 text-indigo-600" />
          <span className="text-xs text-slate-600 font-semibold uppercase tracking-wider">Period:</span>
          <input
            type="month"
            value={period}
            onChange={(e) => onPeriodChange(e.target.value)}
            className="bg-transparent text-slate-900 text-sm font-medium focus:outline-none cursor-pointer"
          />
        </div>

        {/* Role Filter */}
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
          <Filter className="w-4 h-4 text-indigo-600" />
          <span className="text-xs text-slate-600 font-semibold uppercase tracking-wider">Role:</span>
          <select
            value={role}
            onChange={(e) => onRoleChange(e.target.value)}
            className="bg-transparent text-slate-900 text-sm font-medium focus:outline-none cursor-pointer"
          >
            <option value="all" className="bg-white text-slate-900">All Roles</option>
            <option value="teacher" className="bg-white text-slate-900">Teacher</option>
            <option value="cleaner" className="bg-white text-slate-900">Cleaner</option>
            <option value="smm" className="bg-white text-slate-900">SMM</option>
          </select>
        </div>
      </div>
    </div>
  );
});
