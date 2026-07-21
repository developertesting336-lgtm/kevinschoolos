"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchOwnerTableData, selectOwnerTableData, selectOwnerTablePagination, selectOwnerTableBranches, selectOwnerTableLoading, selectOwnerTableError } from "@/store/slices/ownerTableSlice";
import { OwnerTableClient } from "@/components/dashboard/OwnerTableClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Database } from "lucide-react";
import type { TableConfig } from "@/lib/owner-schema";

interface OwnerTableReduxViewProps {
  table: string;
  config: TableConfig;
  initialQueryParams: {
    page: string;
    limit: string;
    search: string;
    sortBy: string;
    sortOrder: string;
    branchId: string;
    extraFilters: Record<string, string>;
  };
}

export function OwnerTableReduxView({ table, config, initialQueryParams }: OwnerTableReduxViewProps) {
  const dispatch = useAppDispatch();
  const data = useAppSelector(selectOwnerTableData);
  const pagination = useAppSelector(selectOwnerTablePagination);
  const branches = useAppSelector(selectOwnerTableBranches);
  const loading = useAppSelector(selectOwnerTableLoading);
  const error = useAppSelector(selectOwnerTableError);

  // Stable key for query params so the effect fires when search/sort/page changes
  const paramsKey = `${table}|${initialQueryParams.page}|${initialQueryParams.limit}|${initialQueryParams.search}|${initialQueryParams.sortBy}|${initialQueryParams.sortOrder}|${initialQueryParams.branchId}|${JSON.stringify(initialQueryParams.extraFilters)}`;

  useEffect(() => {
    dispatch(fetchOwnerTableData({ table, ...initialQueryParams }));
  }, [dispatch, paramsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Only show full skeleton on the very first load — not during search re-fetches
  const isInitialLoading = loading && data.length === 0;

  if (isInitialLoading) {
    return (
      <div className="space-y-6 select-none animate-pulse">
        {/* Constraints badges skeleton */}
        <div className="flex gap-2">
          <Skeleton className="h-6 w-32 bg-muted rounded" />
          <Skeleton className="h-6 w-36 bg-muted rounded" />
        </div>

        {/* Filters skeleton */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <Skeleton className="h-9 w-64 bg-muted rounded" />
              <Skeleton className="h-9 w-40 bg-muted rounded" />
              <Skeleton className="h-9 w-40 bg-muted rounded" />
              <Skeleton className="h-9 w-20 bg-muted rounded" />
            </div>
          </CardContent>
        </Card>

        {/* Table skeleton */}
        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border py-4 px-6">
            <Skeleton className="h-5 w-48 bg-muted rounded" />
          </CardHeader>
          <CardContent className="p-0">
            {/* Header row */}
            <div className="flex px-5 py-3.5 border-b border-border bg-muted/10">
              {config.columns.slice(0, 8).map((col, i) => (
                <Skeleton key={i} className="h-4 w-24 bg-muted rounded mr-6" />
              ))}
              <Skeleton className="h-4 w-12 bg-muted rounded ml-auto" />
            </div>
            {/* Data rows */}
            {[1, 2, 3, 4, 5].map((row) => (
              <div key={row} className="flex px-5 py-4 border-b border-border/40">
                {config.columns.slice(0, 8).map((col, i) => (
                  <Skeleton key={i} className="h-4 w-20 bg-muted rounded mr-6" />
                ))}
                <Skeleton className="h-4 w-8 bg-muted rounded ml-auto" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Pagination skeleton */}
        <div className="flex justify-end">
          <Skeleton className="h-8 w-40 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/20 bg-destructive/5 text-destructive p-8 text-center text-sm font-semibold rounded-xl">
        Error loading data: {error}
      </Card>
    );
  }

  return (
    <OwnerTableClient
      data={data}
      pagination={pagination}
      config={config}
      branches={branches}
      errorMsg={null}
    />
  );
}