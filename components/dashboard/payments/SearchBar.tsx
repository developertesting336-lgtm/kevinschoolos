"use client";

import { SearchInput } from "@/components/dashboard/SearchInput";

export function SearchBar() {
  return (
    <SearchInput
      placeholder="Search student, parent, invoice, reference..."
      paramName="search"
    />
  );
}
