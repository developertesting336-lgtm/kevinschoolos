"use client";

import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectPaymentsLoading,
  selectPaymentsError,
  selectPaymentsPayments,
  selectPaymentsInvoices,
  selectPaymentsEnrollments,
  selectPaymentsStudents,
  selectPaymentsParents,
  selectPaymentsBranches,
  selectPaymentsUsers,
  selectPaymentsTotalCount,
  selectPaymentsCurrentPage,
  selectPaymentsLimit,
} from "@/store/slices/paymentsSlice";
import { validateSessionThunk, selectAuthRole } from "@/store/slices/authSlice";
import { PaymentsClient } from "@/components/dashboard/payments/PaymentsClient";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function PaymentsPage() {
  const dispatch = useAppDispatch();
  const sessionValidated = useRef(false);

  const loading = useAppSelector(selectPaymentsLoading);
  const error = useAppSelector(selectPaymentsError);
  const payments = useAppSelector(selectPaymentsPayments);
  const invoices = useAppSelector(selectPaymentsInvoices);
  const enrollments = useAppSelector(selectPaymentsEnrollments);
  const students = useAppSelector(selectPaymentsStudents);
  const parents = useAppSelector(selectPaymentsParents);
  const branches = useAppSelector(selectPaymentsBranches);
  const users = useAppSelector(selectPaymentsUsers);
  const totalCount = useAppSelector(selectPaymentsTotalCount);
  const currentPage = useAppSelector(selectPaymentsCurrentPage);
  const limit = useAppSelector(selectPaymentsLimit);

  const userRole = useAppSelector(selectAuthRole);
  const normRole = (userRole || "").toLowerCase().trim();
  const isAllowed = ["owner", "office_admin", "office/admin", "office admin", "finance"].includes(normRole);

  // Validate session once on mount
  useEffect(() => {
    if (!sessionValidated.current) {
      sessionValidated.current = true;
      dispatch(validateSessionThunk());
    }
  }, [dispatch]);

  if (loading && !userRole) {
    return (
      <div className="p-6 space-y-6 select-none animate-pulse">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 bg-muted rounded" />
              <Skeleton className="h-5 w-48 bg-muted rounded" />
            </div>
            <Skeleton className="h-3 w-72 bg-muted rounded" />
          </div>
          <Skeleton className="h-9 w-64 bg-muted rounded" />
        </div>

        {/* Filters skeleton */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3">
              <Skeleton className="h-9 w-44 bg-muted rounded" />
              <Skeleton className="h-9 w-40 bg-muted rounded" />
              <Skeleton className="h-9 w-40 bg-muted rounded" />
              <Skeleton className="h-9 w-36 bg-muted rounded" />
            </div>
          </CardContent>
        </Card>

        {/* Table skeleton */}
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center px-6 py-4 border-b border-border/40">
                <Skeleton className="h-4 w-32 bg-muted rounded mr-6" />
                <Skeleton className="h-4 w-24 bg-muted rounded mr-6" />
                <Skeleton className="h-4 w-20 bg-muted rounded mr-6" />
                <Skeleton className="h-4 w-24 bg-muted rounded mr-6" />
                <Skeleton className="h-4 w-20 bg-muted rounded mr-6" />
                <Skeleton className="h-4 w-24 bg-muted rounded" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (sessionValidated.current && !isAllowed) {
    return (
      <div className="p-6">
        <Card className="border-destructive/20 bg-destructive/5 text-destructive p-6 text-center text-sm font-bold rounded-xl max-w-xl mx-auto mt-12 shadow-sm">
          Access Denied: You do not have permissions to access the Payments & Receipts module.
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/20 bg-destructive/5 text-destructive p-4 text-sm font-medium m-6">
        {error}
      </Card>
    );
  }

  return (
    <div className="p-6">
      <PaymentsClient
        initialPayments={payments}
        invoices={invoices}
        enrollments={enrollments}
        students={students}
        parents={parents}
        branches={branches}
        users={users}
        totalCount={totalCount}
        currentPage={currentPage}
        limit={limit}
      />
    </div>
  );
}