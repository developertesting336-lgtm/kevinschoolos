"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchNotificationsData, selectNotificationsLoading, selectNotificationsError, selectNotificationsBranches, selectNotificationsUserRole, selectNotificationsUserName } from "@/store/slices/notificationsSlice";
import { validateSessionThunk } from "@/store/slices/authSlice";
import { NotificationsCenterClient } from "@/components/dashboard/notifications/NotificationsCenterClient";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function NotificationsCenterPage() {
  const dispatch = useAppDispatch();
  const loading = useAppSelector(selectNotificationsLoading);
  const error = useAppSelector(selectNotificationsError);
  const branches = useAppSelector(selectNotificationsBranches);
  const userRole = useAppSelector(selectNotificationsUserRole);
  const userName = useAppSelector(selectNotificationsUserName);

  useEffect(() => {
    dispatch(validateSessionThunk()).then((result: any) => {
      if (result.meta.requestStatus === "fulfilled") {
        const { role, userId } = result.payload;
        dispatch(fetchNotificationsData({
          userRole: role || "",
          userName: userId || "",
        }));
      }
    });
  }, [dispatch]);

  if (loading) {
    return (
      <div className="space-y-8 select-none animate-pulse py-8">
        {/* Header skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="h-4 w-48 bg-muted rounded mb-2" />
            <div className="h-8 w-72 bg-muted rounded mb-1" />
            <div className="h-4 w-96 bg-muted rounded" />
          </div>
        </div>
        {/* Content skeleton */}
        <Card className="bg-card border-border">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-32 w-full bg-muted rounded" />
            <Skeleton className="h-32 w-full bg-muted rounded" />
            <Skeleton className="h-32 w-full bg-muted rounded" />
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
    <NotificationsCenterClient
      initialBranches={branches}
      userRole={userRole}
      userName={userName}
    />
  );
}