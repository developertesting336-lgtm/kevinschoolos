"use client";

import { SearchInput } from "@/components/dashboard/SearchInput";

export function SearchBar() {
  return (
    <SearchInput 
      placeholder="Search by name, phone, parent..." 
      paramName="search" 
    />
  );
}
