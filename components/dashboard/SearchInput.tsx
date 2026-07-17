"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";

interface SearchInputProps {
  placeholder?: string;
  paramName?: string;
}

export function SearchInput({ placeholder = "Search...", paramName = "search" }: SearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get(paramName) || "");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const term = searchParams.get(paramName) || "";
    setQuery(term);
  }, [searchParams, paramName]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      const currentVal = searchParams.get(paramName) || "";
      if (query === currentVal) return; // Skip if no change to avoid extra fetches

      const params = new URLSearchParams(searchParams.toString());
      if (query) {
        params.set(paramName, query);
        params.set("page", "1"); // Reset page to 1 on search
      } else {
        params.delete(paramName);
      }
      
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [query, paramName, pathname, router, searchParams]);

  const isSearching = query !== (searchParams.get(paramName) || "");
  const isLoading = isPending || isSearching;

  return (
    <div className="relative w-full max-w-xs sm:max-w-sm">
      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="pl-8 pr-8 h-8 text-xs placeholder:text-muted-foreground/70"
      />
      {isLoading && (
        <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}
