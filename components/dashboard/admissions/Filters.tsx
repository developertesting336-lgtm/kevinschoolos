"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { X, Filter, Calendar, Loader2 } from "lucide-react";

interface Option {
  id: string;
  name: string;
}

interface FiltersProps {
  branches: Option[];
  staff: Option[];
  sources: string[];
}

export function Filters({ branches, staff, sources }: FiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentBranch = searchParams.get("branch") || "";
  const currentStatus = searchParams.get("status") || "";
  const currentOwner = searchParams.get("owner") || "";
  const currentSource = searchParams.get("source") || "";
  const currentTrialDate = searchParams.get("trialDate") || "";

  const hasActiveFilters = 
    !!currentBranch || 
    !!currentStatus || 
    !!currentOwner || 
    !!currentSource || 
    !!currentTrialDate;

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1"); // Reset page to 1 on filter change
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleClearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("branch");
    params.delete("status");
    params.delete("owner");
    params.delete("source");
    params.delete("trialDate");
    params.delete("search");
    params.set("page", "1");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  // Static list of lead statuses as defined in config description
  const statusOptions = [
    { value: "New", label: "New" },
    { value: "Contacted", label: "Contacted" },
    { value: "Trial Booked", label: "Trial Scheduled" },
    { value: "Trial Done", label: "Trial Completed" },
    { value: "Enrolled", label: "Won (Enrolled)" },
    { value: "Lost", label: "Lost" },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card border border-border p-4 rounded-xl shadow-xs select-none">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        {isPending ? (
          <Loader2 className="h-4 w-4 text-primary animate-spin" />
        ) : (
          <Filter className="h-4 w-4 text-primary" />
        )}
        <span>Filter leads:</span>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
        {/* Branch Filter */}
        <NativeSelect
          value={currentBranch}
          onChange={(e) => handleFilterChange("branch", e.target.value)}
          className="w-full sm:w-32"
        >
          <NativeSelectOption value="">All Branches</NativeSelectOption>
          {branches.map((b) => (
            <NativeSelectOption key={b.id} value={b.id}>
              {b.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>

        {/* Status Filter */}
        <NativeSelect
          value={currentStatus}
          onChange={(e) => handleFilterChange("status", e.target.value)}
          className="w-full sm:w-36"
        >
          <NativeSelectOption value="">All Statuses</NativeSelectOption>
          {statusOptions.map((opt) => (
            <NativeSelectOption key={opt.value} value={opt.value}>
              {opt.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>

        {/* Assigned Owner Filter */}
        <NativeSelect
          value={currentOwner}
          onChange={(e) => handleFilterChange("owner", e.target.value)}
          className="w-full sm:w-36"
        >
          <NativeSelectOption value="">All Owners</NativeSelectOption>
          {staff.map((s) => (
            <NativeSelectOption key={s.id} value={s.id}>
              {s.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>

        {/* Source / Channel Filter */}
        <NativeSelect
          value={currentSource}
          onChange={(e) => handleFilterChange("source", e.target.value)}
          className="w-full sm:w-32"
        >
          <NativeSelectOption value="">All Sources</NativeSelectOption>
          {sources.map((src) => (
            <NativeSelectOption key={src} value={src}>
              {src}
            </NativeSelectOption>
          ))}
        </NativeSelect>

        {/* Trial Date Filter */}
        <div className="relative w-full sm:w-36">
          <input
            type="date"
            value={currentTrialDate}
            onChange={(e) => handleFilterChange("trialDate", e.target.value)}
            className="h-8 w-full appearance-none rounded-lg border border-input bg-transparent py-1 pr-2.5 pl-8 text-xs outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring dark:bg-input/30"
          />
          <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button
            onClick={handleClearFilters}
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 px-2 cursor-pointer font-semibold"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
