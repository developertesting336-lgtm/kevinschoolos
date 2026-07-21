"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchChannelPerformanceData, selectChannelLoading, selectChannelError, selectChannelBranches, selectChannelUserRole, selectChannelUserName } from "@/store/slices/channelPerformanceSlice";
import { validateSessionThunk } from "@/store/slices/authSlice";
import { ChannelPerformanceClient } from "@/components/dashboard/channel-performance/ChannelPerformanceClient";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ChannelPerformancePage() {
  const dispatch = useAppDispatch();
  const loading = useAppSelector(selectChannelLoading);
  const error = useAppSelector(selectChannelError);
  const branches = useAppSelector(selectChannelBranches);
  const userRole = useAppSelector(selectChannelUserRole);
  const userName = useAppSelector(selectChannelUserName);

  useEffect(() => {
    dispatch(validateSessionThunk()).then((result: any) => {
      if (result.meta.requestStatus === "fulfilled") {
        const { role, userId } = result.payload;
        dispatch(fetchChannelPerformanceData({
          page: 1,
          userRole: role || "",
          userName: userId || "",
        }));
      }
    });
  }, [dispatch]);

  if (loading) {
    return (
      <div className="space-y-8 select-none animate-pulse">
        {/* Freshness banner skeleton */}
        <div className="h-20 bg-muted rounded-2xl" />
        
        {/* Page header skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="h-4 w-48 bg-muted rounded mb-2" />
            <div className="h-8 w-72 bg-muted rounded mb-1" />
            <div className="h-4 w-96 bg-muted rounded" />
          </div>
        </div>

        {/* 6 KPI cards skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-3 w-20 bg-muted rounded" />
                <Skeleton className="h-8 w-16 bg-muted rounded" />
                <Skeleton className="h-3 w-24 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Control panel skeleton */}
        <div className="h-32 bg-muted rounded-2xl" />

        {/* Charts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card border-border p-5">
            <Skeleton className="h-4 w-48 bg-muted rounded mb-4" />
            <Skeleton className="h-64 w-full bg-muted rounded" />
          </Card>
          <Card className="bg-card border-border p-5">
            <Skeleton className="h-4 w-48 bg-muted rounded mb-4" />
            <Skeleton className="h-64 w-full bg-muted rounded" />
          </Card>
        </div>

        {/* Table skeleton */}
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center py-3 border-b border-border/40 last:border-0">
                <Skeleton className="h-4 w-32 bg-muted rounded mr-6" />
                <Skeleton className="h-4 w-12 bg-muted rounded mr-6" />
                <Skeleton className="h-4 w-12 bg-muted rounded mr-6" />
                <Skeleton className="h-4 w-12 bg-muted rounded mr-6" />
                <Skeleton className="h-4 w-12 bg-muted rounded mr-6" />
                <Skeleton className="h-4 w-12 bg-muted rounded" />
              </div>
            ))}
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
    <ChannelPerformanceClient
      initialBranches={branches}
      userRole={userRole}
      userName={userName}
    />
  );
}