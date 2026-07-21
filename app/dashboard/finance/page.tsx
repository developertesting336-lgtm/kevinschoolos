"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchFinanceData, selectFinanceLoading, selectFinanceError, selectFinanceBranches, selectFinanceUserRole, selectFinanceUserName, selectFinanceUserEmail } from "@/store/slices/financeSlice";
import { validateSessionThunk } from "@/store/slices/authSlice";
import { FinanceConsoleClient } from "@/components/dashboard/finance/FinanceConsoleClient";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function FinanceConsolePage() {
  const dispatch = useAppDispatch();
  const loading = useAppSelector(selectFinanceLoading);
  const error = useAppSelector(selectFinanceError);
  const branches = useAppSelector(selectFinanceBranches);
  const userRole = useAppSelector(selectFinanceUserRole);
  const userName = useAppSelector(selectFinanceUserName);
  const userEmail = useAppSelector(selectFinanceUserEmail);

  useEffect(() => {
    dispatch(validateSessionThunk()).then((result: any) => {
      if (result.meta.requestStatus === "fulfilled") {
        const { role, userId } = result.payload;
        // Fetch user info from auth/me endpoint to get fullName and email
        fetch("/api/auth/me").then(r => r.json()).then((me: any) => {
          dispatch(fetchFinanceData({
            branchId: "",
            userRole: role || "",
            userName: me.fullName || userId || "",
            userEmail: me.email || null,
          }));
        }).catch(() => {
          dispatch(fetchFinanceData({
            branchId: "",
            userRole: role || "",
            userName: userId || "",
            userEmail: null,
          }));
        });
      }
    });
  }, [dispatch]);

  const isInitialLoading = loading && branches.length === 0;

  if (isInitialLoading) {
    return (
      <div className="space-y-8 select-none animate-pulse py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="h-4 w-48 bg-muted rounded mb-2" />
            <div className="h-8 w-72 bg-muted rounded mb-1" />
            <div className="h-4 w-96 bg-muted rounded" />
          </div>
        </div>
        {/* 6 KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-3 w-20 bg-muted rounded" />
                <Skeleton className="h-8 w-24 bg-muted rounded" />
                <Skeleton className="h-3 w-24 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Tabs skeleton */}
        <div className="h-12 bg-muted rounded-lg" />
        {/* Tab content skeleton */}
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/20 bg-destructive/5 text-destructive p-4 text-sm font-medium">
        {error}
      </Card>
    );
  }

  return (
    <FinanceConsoleClient
      initialBranches={branches}
      userRole={userRole}
      userName={userName}
      userEmail={userEmail}
    />
  );
}