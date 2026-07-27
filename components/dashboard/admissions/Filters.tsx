"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { X, Filter, Calendar, Loader2, Building2, User, Share2, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

  const activeFiltersCount = [
    currentBranch,
    currentStatus,
    currentOwner,
    currentSource,
    currentTrialDate,
  ].filter(Boolean).length;

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
    <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-muted/30 border border-border/60 p-2.5 px-3.5 rounded-xl shadow-2xs select-none">
      <div className="flex items-center gap-2 text-xs font-bold text-foreground/80 shrink-0">
        {isPending ? (
          <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
        ) : (
          <Filter className="h-4 w-4 text-primary shrink-0" />
        )}
        <span>Filters</span>
        {activeFiltersCount > 0 && (
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-extrabold bg-primary/10 text-primary border-primary/20">
            {activeFiltersCount}
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
        {/* Branch Filter */}
        <div className="relative flex-1 sm:flex-initial">
          <NativeSelect
            value={currentBranch}
            onChange={(e) => handleFilterChange("branch", e.target.value)}
            className="w-full sm:w-36 h-8 text-xs bg-background/80 hover:bg-background border-border/80 rounded-lg shadow-2xs font-medium focus:ring-1 focus:ring-primary"
          >
            <NativeSelectOption value="">All Branches</NativeSelectOption>
            {branches.map((b) => (
              <NativeSelectOption key={b.id} value={b.id}>
                {b.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        {/* Status Filter */}
        <div className="relative flex-1 sm:flex-initial">
          <NativeSelect
            value={currentStatus}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="w-full sm:w-38 h-8 text-xs bg-background/80 hover:bg-background border-border/80 rounded-lg shadow-2xs font-medium focus:ring-1 focus:ring-primary"
          >
            <NativeSelectOption value="">All Statuses</NativeSelectOption>
            {statusOptions.map((opt) => (
              <NativeSelectOption key={opt.value} value={opt.value}>
                {opt.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        {/* Assigned Owner Filter */}
        <div className="relative flex-1 sm:flex-initial">
          <NativeSelect
            value={currentOwner}
            onChange={(e) => handleFilterChange("owner", e.target.value)}
            className="w-full sm:w-36 h-8 text-xs bg-background/80 hover:bg-background border-border/80 rounded-lg shadow-2xs font-medium focus:ring-1 focus:ring-primary"
          >
            <NativeSelectOption value="">All Owners</NativeSelectOption>
            {staff.map((s) => (
              <NativeSelectOption key={s.id} value={s.id}>
                {s.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        {/* Source / Channel Filter */}
        <div className="relative flex-1 sm:flex-initial">
          <NativeSelect
            value={currentSource}
            onChange={(e) => handleFilterChange("source", e.target.value)}
            className="w-full sm:w-36 h-8 text-xs bg-background/80 hover:bg-background border-border/80 rounded-lg shadow-2xs font-medium focus:ring-1 focus:ring-primary"
          >
            <NativeSelectOption value="">All Sources</NativeSelectOption>
            {sources.map((src) => (
              <NativeSelectOption key={src} value={src}>
                {src}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        {/* Trial Date Filter */}
        <div className="relative flex-1 sm:flex-initial sm:w-36">
          <input
            type="date"
            value={currentTrialDate}
            onChange={(e) => handleFilterChange("trialDate", e.target.value)}
            className="h-8 w-full appearance-none rounded-lg border border-border/80 bg-background/80 hover:bg-background py-1 pr-2.5 pl-8 text-xs font-medium text-foreground outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs cursor-pointer"
          />
          <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
        </div>

        {/* Clear Filters Button */}
        {activeFiltersCount > 0 && (
          <Button
            onClick={handleClearFilters}
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 px-2.5 rounded-lg cursor-pointer font-bold transition-colors shrink-0"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Reset Filters
          </Button>
        )}
      </div>
    </div>
  );
}

