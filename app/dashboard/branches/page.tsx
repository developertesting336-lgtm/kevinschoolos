"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchBranches, selectBranches, selectBranchesLoading, selectBranchesError, selectBranchesPagination } from "@/store/slices/branchesSlice";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Building2, ArrowLeft } from "lucide-react";
import { SearchInput } from "@/components/dashboard/SearchInput";
import { PaginationControls } from "@/components/dashboard/PaginationControls";
import { Skeleton } from "@/components/ui/skeleton";

export default function BranchesPage() {
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();

  // Redux state
  const branches = useAppSelector(selectBranches);
  const pagination = useAppSelector(selectBranchesPagination);
  const loading = useAppSelector(selectBranchesLoading);
  const error = useAppSelector(selectBranchesError);

  // Get params from URL
  const pageParam = searchParams.get("page") || "1";
  const searchParam = searchParams.get("search") || "";

  // Fetch data when params change
  useEffect(() => {
    dispatch(fetchBranches({
      page: pageParam,
      search: searchParam,
    }));
  }, [dispatch, pageParam, searchParam]);

  // Skeleton Loader
  if (loading) {
    return (
      <div className="space-y-8 select-none animate-pulse">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="h-4 w-48 bg-muted rounded mb-2" />
            <div className="h-8 w-72 bg-muted rounded mb-1" />
            <div className="h-4 w-96 bg-muted rounded" />
          </div>
        </div>
        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border py-3 px-6">
            <Skeleton className="h-5 w-48 bg-muted rounded" />
          </CardHeader>
          <CardContent className="p-0">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center px-6 py-4 border-b border-border/40">
                <Skeleton className="h-4 w-32 bg-muted rounded mr-4" />
                <Skeleton className="h-4 w-20 bg-muted rounded mr-4" />
                <Skeleton className="h-4 w-40 bg-muted rounded mr-4" />
                <Skeleton className="h-4 w-28 bg-muted rounded mr-4" />
                <Skeleton className="h-5 w-16 bg-muted rounded mr-4" />
                <Skeleton className="h-4 w-24 bg-muted rounded" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 select-none animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
            <Link href="/dashboard" className="hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Branches</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            Branches
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Overview and directory of active school branches
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg border border-border bg-card text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back Overview
        </Link>
      </div>

      {error ? (
        <Card className="border-destructive/20 bg-destructive/5 text-destructive p-4 text-sm font-medium">
          {error}
        </Card>
      ) : (
        <Card className="bg-card border-border shadow-md overflow-hidden">
          <CardHeader className="border-b border-border py-3 px-6 bg-muted/10 flex flex-row items-center justify-between space-y-0 gap-4">
            <CardTitle className="text-sm font-bold text-foreground">
              ALL BRANCHES ({pagination.total})
            </CardTitle>
            <SearchInput placeholder="Search branches..." paramName="search" />
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-muted/20 border-b border-border">
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Branch Name</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">City</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Address</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Phone</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Status</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Opened Date</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border">
                {(branches as any[]).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                      No branches found.
                    </TableCell>
                  </TableRow>
                ) : (
                  (branches as any[]).map((branch: any) => (
                    <TableRow key={branch.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="px-6 py-4 font-semibold text-sm text-foreground">
                        {branch.name}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                        {branch.city || "—"}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate">
                        {branch.address || "—"}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-muted-foreground font-mono">
                        {branch.phone || "—"}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm">
                        <Badge
                          variant="outline"
                          className={
                            branch.status?.toLowerCase() === "active"
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 font-medium capitalize"
                              : "bg-muted text-muted-foreground border-border font-medium capitalize"
                          }
                        >
                          {branch.status || "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                        {branch.openedDate ? new Date(branch.openedDate).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate">
                        {branch.notes || "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <div className="px-6 py-3 border-t border-border bg-muted/5 flex justify-end">
              <PaginationControls
                totalPages={pagination.totalPages}
                currentPage={pagination.page}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}