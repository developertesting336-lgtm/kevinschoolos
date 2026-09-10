"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { X, Calendar, Loader2 } from "lucide-react";

interface Option {
  id: string;
  name: string;
}

interface FiltersProps {
  branches?: Option[];
  staff?: Option[];
  sources?: string[];
}

export function Filters({}: FiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentTrialDate = searchParams.get("trialDate") || "";

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleClear = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("trialDate");
    params.set("page", "1");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative w-40 sm:w-44">
        <input
          type="date"
          value={currentTrialDate}
          onChange={(e) => handleFilterChange("trialDate", e.target.value)}
          className="h-9 w-full appearance-none rounded-xl border border-border/80 bg-background/80 hover:bg-background py-1 pr-2.5 pl-8 text-xs font-medium text-foreground outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs cursor-pointer"
        />
        {isPending ? (
          <Loader2 className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-primary animate-spin" />
        ) : (
          <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
        )}
      </div>
      {currentTrialDate && (
        <Button
          onClick={handleClear}
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 rounded-xl cursor-pointer shrink-0"
          title="Clear date filter"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}


