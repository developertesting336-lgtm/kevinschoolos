"use client";

import { SearchInput } from "@/components/dashboard/SearchInput";

export function SearchBar() {
  return (
    <SearchInput
      placeholder="Search by student, parent, enrollment ID..."
      paramName="search"
    />
  );
}
