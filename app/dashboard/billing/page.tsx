"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchBillingData, selectBillingActiveTab, selectBillingInvoices, selectBillingPayments, selectBillingBranches, selectBillingPagination, selectBillingLoading, selectBillingError } from "@/store/slices/billingSlice";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Receipt, ArrowLeft, FileText, CreditCard, AlertCircle } from "lucide-react";
import { SearchInput } from "@/components/dashboard/SearchInput";
import { PaginationControls } from "@/components/dashboard/PaginationControls";
import { Skeleton } from "@/components/ui/skeleton";

export default function BillingPage() {
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();

  // Redux state
  const activeTab = useAppSelector(selectBillingActiveTab);
  const invoices = useAppSelector(selectBillingInvoices);
  const payments = useAppSelector(selectBillingPayments);
  const branches = useAppSelector(selectBillingBranches);
  const pagination = useAppSelector(selectBillingPagination);
  const loading = useAppSelector(selectBillingLoading);
  const error = useAppSelector(selectBillingError);

  // Get params from URL
  const tabParam = searchParams.get("tab") || "invoices";
  const pageParam = searchParams.get("page") || "1";
  const searchParam = searchParams.get("search") || "";

  // Fetch data when params change
  useEffect(() => {
    dispatch(fetchBillingData({
      tab: tabParam,
      page: pageParam,
      search: searchParam,
    }));
  }, [dispatch, tabParam, pageParam, searchParam]);

  const branchIdToNameMap = new Map<string, string>((branches as any[]).map((b: any) => [b.id, b.name]));

  // Skeleton Loader
  if (loading) {
    return (
      <div className="space-y-8 select-none animate-pulse">
        {/* Header skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="h-4 w-48 bg-muted rounded mb-2" />
            <div className="h-8 w-72 bg-muted rounded mb-1" />
            <div className="h-4 w-96 bg-muted rounded" />
          </div>
        </div>
        {/* Tab skeleton */}
        <div className="flex gap-4 border-b border-border pb-2">
          <Skeleton className="h-8 w-24 bg-muted rounded" />
          <Skeleton className="h-8 w-24 bg-muted rounded" />
        </div>
        {/* Table skeleton */}
        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border py-3 px-6">
            <Skeleton className="h-5 w-48 bg-muted rounded" />
          </CardHeader>
          <CardContent className="p-0">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center px-6 py-4 border-b border-border/40">
                <Skeleton className="h-4 w-32 bg-muted rounded mr-4" />
                <Skeleton className="h-4 w-24 bg-muted rounded mr-4" />
                <Skeleton className="h-4 w-24 bg-muted rounded mr-4" />
                <Skeleton className="h-4 w-20 bg-muted rounded ml-auto" />
                <Skeleton className="h-5 w-16 bg-muted rounded ml-4" />
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
            <span className="text-foreground font-medium">Billing</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <Receipt className="h-8 w-8 text-primary" />
            Billing
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Financial bookkeeping, client invoices, and payment receipts
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

      {/* Tab Selection Row */}
      <div className="flex border-b border-border">
        <Link
          href="/dashboard/billing?tab=invoices"
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "invoices"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-4 w-4" />
          Invoices
        </Link>
        <Link
          href="/dashboard/billing?tab=payments"
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "payments"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <CreditCard className="h-4 w-4" />
          Payments Log
        </Link>
      </div>

      {error ? (
        <Card className="border-destructive/20 bg-destructive/5 text-destructive p-4 text-sm font-medium">
          {error}
        </Card>
      ) : activeTab === "invoices" ? (
        /* Invoices Table */
        <Card className="bg-card border-border shadow-md overflow-hidden">
          <CardHeader className="border-b border-border py-3 px-6 bg-muted/10 flex flex-row items-center justify-between space-y-0 gap-4">
            <CardTitle className="text-sm font-bold text-foreground">
              ALL INVOICES ({pagination.total})
            </CardTitle>
            <SearchInput placeholder="Search invoices..." paramName="search" />
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-muted/20 border-b border-border">
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Invoice No</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Issue Date</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Due Date</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase text-right">Amount</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Status</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Branches</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border">
                {(invoices as any[]).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                      No invoices found.
                    </TableCell>
                  </TableRow>
                ) : (
                  (invoices as any[]).map((invoice: any) => {
                    const branchNames = invoice.branchIds
                      ?.map((id: string) => branchIdToNameMap.get(id) || id)
                      .join(", ") || "—";

                    return (
                      <TableRow key={invoice.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="px-6 py-4 text-sm font-semibold text-foreground font-mono">
                          {invoice.invoiceNo}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                          {invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                          {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-foreground font-semibold text-right font-mono">
                          {invoice.amount !== null ? `$${Number(invoice.amount).toFixed(2)}` : "—"}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm">
                          <Badge
                            variant="outline"
                            className={
                              invoice.status?.toLowerCase() === "paid"
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 font-medium capitalize"
                                : invoice.status?.toLowerCase() === "unpaid" || invoice.status?.toLowerCase() === "overdue"
                                ? "bg-destructive/10 border-destructive/20 text-destructive font-medium capitalize"
                                : "bg-muted text-muted-foreground border-border font-medium capitalize"
                            }
                          >
                            {invoice.status || "Unpaid"}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate" title={branchNames}>
                          {branchNames}
                        </TableCell>
                      </TableRow>
                    );
                  })
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
      ) : (
        /* Payments Table */
        <Card className="bg-card border-border shadow-md overflow-hidden">
          <CardHeader className="border-b border-border py-3 px-6 bg-muted/10 flex flex-row items-center justify-between space-y-0 gap-4">
            <CardTitle className="text-sm font-bold text-foreground">
              ALL TRANSACTIONS ({pagination.total})
            </CardTitle>
            <SearchInput placeholder="Search payments..." paramName="search" />
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-muted/20 border-b border-border">
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Payment Ref</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Date</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase text-right">Amount</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Method</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Type</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Branches</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border">
                {(payments as any[]).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                      No payment transactions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  (payments as any[]).map((payment: any) => {
                    const branchNames = payment.branchIds
                      ?.map((id: string) => branchIdToNameMap.get(id) || id)
                      .join(", ") || "—";

                    return (
                      <TableRow key={payment.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="px-6 py-4 text-sm font-semibold text-foreground font-mono">
                          <div className="flex items-center gap-2">
                            {payment.paymentRef}
                            {payment.possibleDuplicate && (
                              <Badge
                                variant="outline"
                                className="bg-amber-500/10 border-amber-500/20 text-amber-600 flex items-center gap-1 text-[10px] py-0 px-1.5"
                                title="Possible Duplicate Flagged"
                              >
                                <AlertCircle className="h-2.5 w-2.5" />
                                Duplicate?
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                          {payment.date ? new Date(payment.date).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-emerald-600 font-semibold text-right font-mono">
                          {payment.amount !== null ? `$${Number(payment.amount).toFixed(2)}` : "—"}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-muted-foreground capitalize">
                          {payment.method || "—"}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-muted-foreground capitalize">
                          {payment.paymentType || "—"}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate" title={branchNames}>
                          {branchNames}
                        </TableCell>
                      </TableRow>
                    );
                  })
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