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
}

export function Filters({ branches }: FiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentBranch = searchParams.get("branch") || "";
  const currentType = searchParams.get("paymentType") || "";
  const currentMethod = searchParams.get("paymentMethod") || "";
  const currentDate = searchParams.get("date") || "";

  const hasActiveFilters = 
    !!currentBranch || 
    !!currentType || 
    !!currentMethod || 
    !!currentDate;

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1"); // Reset page to 1 on filter changes
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleClearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("branch");
    params.delete("paymentType");
    params.delete("paymentMethod");
    params.delete("date");
    params.delete("search");
    params.set("page", "1");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const paymentTypes = ["Tuition", "Play Room", "Masterclass", "Merchandise", "Other", "Trial Fee", "Book Fee", "Deposit"];
  const paymentMethods = ["Cash", "Card", "Bank Transfer", "Online"];

  return (
    <div className="flex flex-col xl:flex-row gap-4 items-center justify-between bg-card border border-border p-4 rounded-xl shadow-xs select-none">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground shrink-0">
        {isPending ? (
          <Loader2 className="h-4 w-4 text-primary animate-spin" />
        ) : (
          <Filter className="h-4 w-4 text-primary" />
        )}
        <span>Filter transactions:</span>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto">
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

        {/* Type Filter */}
        <NativeSelect
          value={currentType}
          onChange={(e) => handleFilterChange("paymentType", e.target.value)}
          className="w-full sm:w-32"
        >
          <NativeSelectOption value="">All Types</NativeSelectOption>
          {paymentTypes.map((type) => (
            <NativeSelectOption key={type} value={type}>
              {type}
            </NativeSelectOption>
          ))}
        </NativeSelect>

        {/* Method Filter */}
        <NativeSelect
          value={currentMethod}
          onChange={(e) => handleFilterChange("paymentMethod", e.target.value)}
          className="w-full sm:w-32"
        >
          <NativeSelectOption value="">All Methods</NativeSelectOption>
          {paymentMethods.map((m) => (
            <NativeSelectOption key={m} value={m}>
              {m}
            </NativeSelectOption>
          ))}
        </NativeSelect>

        {/* Date Filter */}
        <div className="relative w-full sm:w-36">
          <input
            type="date"
            value={currentDate}
            onChange={(e) => handleFilterChange("date", e.target.value)}
            className="h-8 w-full appearance-none rounded-lg border border-input bg-transparent py-1 pr-2.5 pl-8 text-[11px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring dark:bg-input/30"
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
