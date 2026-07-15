"use client";

import React, { useState, useTransition, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Eye,
  FilterX,
  Lock,
  Database,
  Calculator,
  FileCheck,
} from "lucide-react";
import { TableConfig } from "@/lib/owner-schema";
import { PaginationControls } from "./PaginationControls";

interface OwnerTableClientProps {
  data: any[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  config: TableConfig;
  branches: any[];
  errorMsg: string | null;
}

export function OwnerTableClient({
  data,
  pagination,
  config,
  branches,
  errorMsg,
}: OwnerTableClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isPending, startTransition] = useTransition();

  // Search local state for debouncing
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [selectedRow, setSelectedRow] = useState<any | null>(null);

  // Debounce search input
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      const currentVal = searchParams.get("search") || "";
      if (searchTerm === currentVal) return;

      const params = new URLSearchParams(searchParams.toString());
      if (searchTerm) {
        params.set("search", searchTerm);
        params.set("page", "1"); // reset to page 1 on search
      } else {
        params.delete("search");
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    }, 450);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm, pathname, router, searchParams]);

  // Sync search input with searchParams changes (e.g. on reset)
  useEffect(() => {
    setSearchTerm(searchParams.get("search") || "");
  }, [searchParams]);

  // General helper to update query parameters
  const updateQueryParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
      params.set("page", "1"); // reset to page 1
    } else {
      params.delete(key);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleSort = (columnKey: string) => {
    const currentSortBy = searchParams.get("sortBy") || config.defaultSortBy;
    const currentSortOrder = searchParams.get("sortOrder") || config.defaultSortOrder;

    let nextOrder: "asc" | "desc" = "asc";
    if (currentSortBy === columnKey) {
      nextOrder = currentSortOrder === "asc" ? "desc" : "asc";
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("sortBy", columnKey);
    params.set("sortOrder", nextOrder);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    startTransition(() => {
      router.push(pathname); // push with empty search query
    });
  };

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  // Determine if sorting is applied to column
  const getSortIcon = (columnKey: string) => {
    const currentSortBy = searchParams.get("sortBy") || config.defaultSortBy;
    const currentSortOrder = searchParams.get("sortOrder") || config.defaultSortOrder;

    if (currentSortBy !== columnKey) {
      return <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-40 shrink-0" />;
    }
    return currentSortOrder === "asc" ? (
      <ArrowUp className="ml-1 h-3.5 w-3.5 text-primary shrink-0 animate-in fade-in" />
    ) : (
      <ArrowDown className="ml-1 h-3.5 w-3.5 text-primary shrink-0 animate-in fade-in" />
    );
  };

  // Check if any filters are active
  const hasActiveFilters =
    searchParams.has("search") ||
    searchParams.has("branchId") ||
    searchParams.has("sortBy") ||
    searchParams.has("sortOrder") ||
    searchParams.has("limit") ||
    config.filterableFields.some((f) => searchParams.has(f.key));

  // Helper to format values in the table cells
  const renderCellValue = (row: any, col: any) => {
    const val = row[col.key];

    if (val === undefined || val === null) return <span className="text-muted-foreground/60">—</span>;

    if (col.type === "date") {
      try {
        return <span className="font-mono text-xs">{new Date(val).toLocaleDateString("en-US")}</span>;
      } catch {
        return <span className="text-xs">{String(val)}</span>;
      }
    }

    if (col.type === "boolean") {
      return (
        <Badge
          variant="outline"
          className={
            val
              ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 font-semibold"
              : "bg-muted text-muted-foreground border-border font-medium"
          }
        >
          {val ? "Yes" : "No"}
        </Badge>
      );
    }

    if (col.type === "array") {
      if (!Array.isArray(val) || val.length === 0) {
        return <span className="text-muted-foreground/60">—</span>;
      }
      return (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {val.slice(0, 3).map((item, idx) => (
            <Badge key={idx} variant="secondary" className="text-[10px] py-0 px-1 font-medium bg-muted border border-border">
              {item}
            </Badge>
          ))}
          {val.length > 3 && (
            <Badge variant="outline" className="text-[10px] py-0 px-1 border-dashed">
              +{val.length - 3} more
            </Badge>
          )}
        </div>
      );
    }

    if (col.type === "number") {
      const isMonetary =
        ["amount", "grossPay", "rate", "debit", "credit", "revenueBase"].includes(col.key);
      if (isMonetary) {
        return <span className="font-mono font-semibold text-foreground">${val.toLocaleString("en-US")}</span>;
      }
      return <span className="font-mono text-foreground">{val.toString()}</span>;
    }

    // Default string rendering
    return <span className="text-foreground truncate max-w-xs">{val.toString()}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Constraints Alerts / Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {config.isReadOnlyTable && (
            <Badge className="bg-purple-500/10 border-purple-500/20 text-purple-600 flex items-center gap-1.5 font-bold uppercase tracking-wider py-1 text-[10px]">
              <Lock className="h-3 w-3" />
              Read-Only Administration Schema
            </Badge>
          )}
          {config.isAppendOnlyTable && (
            <Badge className="bg-amber-500/10 border-amber-500/20 text-amber-600 flex items-center gap-1.5 font-bold uppercase tracking-wider py-1 text-[10px]">
              <Database className="h-3 w-3" />
              Append-Only Financial Ledger (Locked)
            </Badge>
          )}
          {config.columns.some((c) => c.isComputed) && (
            <Badge className="bg-blue-500/10 border-blue-500/20 text-blue-600 flex items-center gap-1.5 font-bold uppercase tracking-wider py-1 text-[10px]">
              <Calculator className="h-3 w-3" />
              Includes Computed Values
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
          {isPending && (
            <>
              <Spinner className="text-primary size-4" />
              <span className="text-primary animate-pulse">Syncing...</span>
            </>
          )}
        </div>
      </div>

      {/* Filter and Search Panel */}
      <Card className="bg-card border-border shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: Search input */}
          <div className="relative flex-1 max-w-sm min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search ${config.label.toLowerCase()}...`}
              className="pl-9 h-9 text-sm rounded-lg"
            />
          </div>

          {/* Right: Select filters & reset */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Branch Filter (if applicable) */}
            {(config.columns.some((c) => c.key === "branchIds") ||
              config.modelName === "branch") &&
              branches.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Branch:</span>
                  <NativeSelect
                    value={searchParams.get("branchId") || ""}
                    onChange={(e) => updateQueryParam("branchId", e.target.value)}
                    size="sm"
                  >
                    <NativeSelectOption value="">All Branches</NativeSelectOption>
                    {branches.map((b) => (
                      <NativeSelectOption key={b.id} value={b.id}>
                        {b.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>
              )}

            {/* Dynamic Column Filters */}
            {config.filterableFields.map((filter) => (
              <div key={filter.key} className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {filter.label}:
                </span>
                <NativeSelect
                  value={searchParams.get(filter.key) || ""}
                  onChange={(e) => updateQueryParam(filter.key, e.target.value)}
                  size="sm"
                >
                  <NativeSelectOption value="">All</NativeSelectOption>
                  {filter.type === "boolean" ? (
                    <>
                      <NativeSelectOption value="true">Yes</NativeSelectOption>
                      <NativeSelectOption value="false">No</NativeSelectOption>
                    </>
                  ) : (
                    filter.options?.map((opt) => (
                      <NativeSelectOption key={opt} value={opt}>
                        {opt}
                      </NativeSelectOption>
                    ))
                  )}
                </NativeSelect>
              </div>
            ))}

            {/* Controls */}
            <div className="flex items-center gap-1.5 ml-auto md:ml-0 border-l border-border pl-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                title="Refresh Table"
                className="h-8 w-8 p-0 rounded-lg hover:bg-muted border border-border cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${isPending ? "animate-spin" : ""}`} />
              </Button>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-8 text-xs font-medium text-destructive hover:bg-destructive/10 hover:text-destructive flex items-center gap-1 rounded-lg cursor-pointer"
                >
                  <FilterX className="h-3.5 w-3.5" />
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table Card */}
      {errorMsg ? (
        <Card className="border-destructive/20 bg-destructive/5 text-destructive p-8 text-center text-sm font-semibold rounded-xl flex flex-col items-center gap-3">
          <span>Error loading data: {errorMsg}</span>
          <Button variant="outline" className="border-destructive/30 hover:bg-destructive/10 text-destructive text-xs cursor-pointer" onClick={handleRefresh}>
            Retry
          </Button>
        </Card>
      ) : (
        <Card className="bg-card border-border shadow-md overflow-hidden rounded-xl">
          <CardHeader className="border-b border-border py-4 px-6 bg-muted/10 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              {config.label.toUpperCase()} RECORDS ({pagination.total})
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Page size:</span>
              <NativeSelect
                value={searchParams.get("limit") || "10"}
                onChange={(e) => updateQueryParam("limit", e.target.value)}
                size="sm"
                className="w-16"
              >
                <NativeSelectOption value="10">10</NativeSelectOption>
                <NativeSelectOption value="25">25</NativeSelectOption>
                <NativeSelectOption value="50">50</NativeSelectOption>
                <NativeSelectOption value="100">100</NativeSelectOption>
              </NativeSelect>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto relative">
              <Table className="min-w-full">
                <TableHeader className="sticky top-0 bg-card z-10 border-b border-border shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                  <TableRow className="hover:bg-transparent">
                    {config.columns.map((col) => (
                      <TableHead
                        key={col.key}
                        className={`px-5 py-3.5 font-bold text-xs text-muted-foreground uppercase select-none ${
                          col.sortable ? "cursor-pointer hover:bg-muted/30 hover:text-foreground" : ""
                        }`}
                        onClick={() => col.sortable && handleSort(col.key)}
                      >
                        <div className="flex items-center">
                          <span>{col.label}</span>
                          {col.sortable && getSortIcon(col.key)}
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="px-5 py-3.5 font-bold text-xs text-muted-foreground uppercase text-right w-16">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border">
                  {data.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={config.columns.length + 1}
                        className="h-48 text-center text-sm text-muted-foreground leading-relaxed"
                      >
                        No records found matching filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.map((row) => (
                      <TableRow key={row.id} className="hover:bg-muted/20 transition-colors border-b border-border/40">
                        {config.columns.map((col) => (
                          <TableCell key={col.key} className="px-5 py-4 text-sm font-medium">
                            <div className="flex items-center gap-1.5">
                              {renderCellValue(row, col)}
                              {col.isComputed && (
                                <span title="Computed Column" className="cursor-help shrink-0">
                                  <Calculator className="h-3 w-3 text-blue-500 opacity-80" />
                                </span>
                              )}
                              {col.isReadOnly && (
                                <span title="Read-Only Field" className="cursor-help shrink-0">
                                  <Lock className="h-3 w-3 text-amber-500 opacity-80" />
                                </span>
                              )}
                            </div>
                          </TableCell>
                        ))}
                        <TableCell className="px-5 py-4 text-right">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="hover:bg-primary/10 hover:text-primary rounded-lg cursor-pointer"
                            onClick={() => setSelectedRow(row)}
                            title="Inspect Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {/* Pagination bar */}
            <div className="px-6 py-4 border-t border-border bg-muted/5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">
                Showing {data.length} of {pagination.total} records
              </span>
              <PaginationControls
                totalPages={pagination.totalPages}
                currentPage={pagination.page}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Row Inspect Dialog (radix primitive based Dialog) */}
      <Dialog open={!!selectedRow} onOpenChange={(open) => !open && setSelectedRow(null)}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col justify-between">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" />
              Record Inspector
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Reviewing entry details under System Owner clearance.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 scrollbar-thin">
            <div className="grid grid-cols-2 gap-4">
              {config.columns.map((col) => {
                const isArray = col.type === "array";
                const isObjVal = selectedRow ? selectedRow[col.key] : null;

                return (
                  <div
                    key={col.key}
                    className={`space-y-1.5 p-2.5 rounded-lg border border-border/30 bg-muted/20 ${
                      isArray || col.key === "notes" || col.key === "medicalNotes" || col.key === "address"
                        ? "col-span-2"
                        : "col-span-1"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/90">
                      <span>{col.label}</span>
                      {col.isComputed && <span className="text-blue-500 font-medium text-[8px] bg-blue-500/10 px-1 rounded uppercase">Computed</span>}
                      {col.isReadOnly && <span className="text-amber-500 font-medium text-[8px] bg-amber-500/10 px-1 rounded uppercase">Locked</span>}
                    </div>

                    <div className="text-sm font-semibold text-foreground break-all select-all font-mono leading-relaxed">
                      {selectedRow ? (
                        isArray ? (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Array.isArray(isObjVal) && isObjVal.length > 0 ? (
                              isObjVal.map((item: any, idx: number) => (
                                <Badge key={idx} variant="secondary" className="text-[10px] font-medium py-0.5 px-2 bg-muted text-foreground border border-border">
                                  {String(item)}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground/60">—</span>
                            )}
                          </div>
                        ) : col.type === "date" ? (
                          isObjVal ? (
                            new Date(isObjVal).toLocaleString("en-US")
                          ) : (
                            "—"
                          )
                        ) : col.type === "boolean" ? (
                          <Badge
                            variant="outline"
                            className={
                              isObjVal
                                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 font-semibold"
                                : "bg-muted text-muted-foreground border-border font-medium"
                            }
                          >
                            {isObjVal ? "True" : "False"}
                          </Badge>
                        ) : col.type === "number" && ["amount", "grossPay", "rate", "debit", "credit", "revenueBase"].includes(col.key) ? (
                          `$${Number(isObjVal).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                        ) : isObjVal !== null && isObjVal !== undefined ? (
                          String(isObjVal)
                        ) : (
                          "—"
                        )
                      ) : (
                        "—"
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="border-t border-border pt-3">
            <Button
              variant="outline"
              onClick={() => setSelectedRow(null)}
              className="text-xs cursor-pointer"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
