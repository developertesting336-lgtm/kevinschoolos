"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchScheduleData,
  selectScheduleTab,
  selectScheduleSessions,
  selectScheduleClassGroups,
  selectScheduleBranches,
  selectScheduleTotalCount,
  selectScheduleCurrentPage,
  selectScheduleTotalPages,
  selectScheduleLoading,
  selectScheduleError,
  selectScheduleIsForbidden,
} from "@/store/slices/scheduleSlice";
import { validateSessionThunk } from "@/store/slices/authSlice";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { PaginationControls } from "@/components/dashboard/PaginationControls";
import { SearchInput } from "@/components/dashboard/SearchInput";
import ScheduleActions from "@/components/dashboard/schedule/ScheduleActions";
import ClassGroupRowActions from "@/components/dashboard/schedule/ClassGroupRowActions";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Calendar, ArrowLeft, ShieldAlert, Clock, Layers } from "lucide-react";
import { normalizeRole } from "@/lib/roles";

interface ScheduleClientProps {
  userRole: string;
}

export function ScheduleClient({ userRole }: ScheduleClientProps) {
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const sessionValidated = useRef(false);
  const normRole = normalizeRole(userRole);
  const showCreateBtn = normRole === "owner" || normRole === "office_admin";

  const tab = useAppSelector(selectScheduleTab);
  const sessions = useAppSelector(selectScheduleSessions);
  const classGroups = useAppSelector(selectScheduleClassGroups);
  const branches = useAppSelector(selectScheduleBranches);
  const totalCount = useAppSelector(selectScheduleTotalCount);
  const currentPage = useAppSelector(selectScheduleCurrentPage);
  const totalPages = useAppSelector(selectScheduleTotalPages);
  const loading = useAppSelector(selectScheduleLoading);
  const error = useAppSelector(selectScheduleError);
  const isForbidden = useAppSelector(selectScheduleIsForbidden);

  const buildParamsFromUrl = useCallback(() => ({
    tab: searchParams.get("tab") || "sessions",
    page: searchParams.get("page") || "1",
    search: searchParams.get("search") || "",
  }), [searchParams]);

  useEffect(() => {
    if (!sessionValidated.current) {
      sessionValidated.current = true;
      dispatch(validateSessionThunk()).then((result: any) => {
        if (result.meta.requestStatus === "fulfilled") {
          dispatch(fetchScheduleData(buildParamsFromUrl()));
        }
      });
    }
  }, [dispatch, buildParamsFromUrl]);

  useEffect(() => {
    if (sessionValidated.current) {
      dispatch(fetchScheduleData(buildParamsFromUrl()));
    }
  }, [dispatch, searchParams, buildParamsFromUrl]);

  const branchIdToNameMap = new Map(branches.map((b: any) => [b.id, b.name]));
  const groupIdToNameMap = new Map(classGroups.map((g: any) => [g.id, g.groupName]));

  const activeTab = tab;

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-8 select-none animate-pulse">
        {/* Header skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 bg-muted rounded" />
              <Skeleton className="h-8 w-48 bg-muted rounded" />
            </div>
            <Skeleton className="h-4 w-72 bg-muted rounded" />
          </div>
        </div>

        {/* Tabs skeleton */}
        <div className="flex gap-4 border-b border-border pb-2">
          <Skeleton className="h-8 w-36 bg-muted rounded" />
          <Skeleton className="h-8 w-32 bg-muted rounded" />
        </div>

        {/* Table skeleton */}
        <Card className="bg-card border-border shadow-md overflow-hidden">
          <CardHeader className="border-b border-border py-3 px-6 bg-muted/10">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-48 bg-muted rounded" />
              <Skeleton className="h-8 w-48 bg-muted rounded" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center px-6 py-4 border-b border-border/40">
                <Skeleton className="h-4 w-24 bg-muted rounded mr-6" />
                <Skeleton className="h-4 w-36 bg-muted rounded mr-6" />
                <Skeleton className="h-4 w-20 bg-muted rounded mr-6" />
                <Skeleton className="h-4 w-32 bg-muted rounded mr-6" />
                <Skeleton className="h-4 w-28 bg-muted rounded" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Forbidden state
  if (isForbidden) {
    return (
      <div className="space-y-8 select-none animate-in fade-in duration-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
              <Link href="/dashboard" className="hover:text-foreground transition-colors">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-foreground font-medium">Schedule</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
              <Calendar className="h-8 w-8 text-primary" />
              Schedule
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Academic classes, sessions, and daily schedule
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
        <div className="flex border-b border-border">
          <Link
            href="/dashboard/schedule?tab=sessions"
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "sessions"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="h-4 w-4" />
            Individual Sessions
          </Link>
          <Link
            href="/dashboard/schedule?tab=groups"
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "groups"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-4 w-4" />
            Class Groups
          </Link>
        </div>
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center px-4">
          <Card className="max-w-md w-full border-destructive/30 bg-destructive/5 shadow-lg shadow-destructive/5">
            <CardHeader className="flex flex-col items-center pb-2">
              <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-2">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl font-bold text-destructive">
                Access Restricted
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Insufficient Permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your role <span className="font-semibold text-foreground capitalize">({userRole})</span> does not have access to view {activeTab === "sessions" ? "individual sessions schedule" : "class groups database"}.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="border-destructive/20 bg-destructive/5 text-destructive p-4 text-sm font-medium m-6">
        {error}
      </Card>
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
            <span className="text-foreground font-medium">Schedule</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <Calendar className="h-8 w-8 text-primary" />
            Schedule
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Academic classes, sessions, and daily schedule
          </p>
        </div>
        <div className="flex items-center gap-3">
          {showCreateBtn && <ScheduleActions />}
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg border border-border bg-card text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back Overview
          </Link>
        </div>
      </div>

      {/* Tab Selection Row */}
      <div className="flex border-b border-border">
        <Link
          href="/dashboard/schedule?tab=sessions"
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "sessions"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock className="h-4 w-4" />
          Individual Sessions
        </Link>
        <Link
          href="/dashboard/schedule?tab=groups"
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "groups"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="h-4 w-4" />
          Class Groups
        </Link>
      </div>

      {activeTab === "sessions" ? (
        /* Sessions Table */
        <Card className="bg-card border-border shadow-md overflow-hidden">
          <CardHeader className="border-b border-border py-3 px-6 bg-muted/10 flex flex-row items-center justify-between space-y-0 gap-4">
            <CardTitle className="text-sm font-bold text-foreground">
              ALL SESSIONS ({totalCount})
            </CardTitle>
            <SearchInput placeholder="Search sessions..." />
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-muted/20 border-b border-border">
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Session ID</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Date & Time</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Status</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Class Group</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Branches</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border">
                {sessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-xs text-muted-foreground">
                      No sessions scheduled.
                    </TableCell>
                  </TableRow>
                ) : (
                  sessions.map((sessionItem: any) => {
                    const groupNames = sessionItem.classGroupIds
                      ?.map((id: string) => groupIdToNameMap.get(id) || id)
                      .join(", ") || "—";
                    const branchNames = sessionItem.branchIds
                      ?.map((id: string) => branchIdToNameMap.get(id) || id)
                      .join(", ") || "—";

                    return (
                      <TableRow key={sessionItem.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="px-6 py-4 text-sm font-semibold text-foreground font-mono">
                          {sessionItem.sessionId}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                          {sessionItem.dateTime
                            ? new Date(sessionItem.dateTime).toLocaleString([], {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })
                            : "—"}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm">
                          <Badge
                            variant="outline"
                            className={
                              sessionItem.status?.toLowerCase() === "scheduled" || sessionItem.status?.toLowerCase() === "active"
                                ? "bg-primary/10 border-primary/20 text-primary font-medium capitalize"
                                : sessionItem.status?.toLowerCase() === "completed"
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 font-medium capitalize"
                                : "bg-muted text-muted-foreground border-border font-medium capitalize"
                            }
                          >
                            {sessionItem.status || "Scheduled"}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-muted-foreground font-semibold">
                          {groupNames}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate">
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
                totalPages={totalPages}
                currentPage={currentPage}
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Class Groups Table */
        <Card className="bg-card border-border shadow-md overflow-hidden">
          <CardHeader className="border-b border-border py-3 px-6 bg-muted/10 flex flex-row items-center justify-between space-y-0 gap-4">
            <CardTitle className="text-sm font-bold text-foreground">
              ALL CLASS GROUPS ({totalCount})
            </CardTitle>
            <SearchInput placeholder="Search class groups..." />
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-muted/20 border-b border-border">
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Group Name</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Weekdays</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Start Time</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Capacity</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Status</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Branches</TableHead>
                  {showCreateBtn && (
                    <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border">
                {classGroups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={showCreateBtn ? 7 : 6} className="h-32 text-center text-xs text-muted-foreground">
                      No class groups found.
                    </TableCell>
                  </TableRow>
                ) : (
                  classGroups.map((group: any) => {
                    const branchNames = group.branchIds
                      ?.map((id: string) => branchIdToNameMap.get(id) || id)
                      .join(", ") || "—";
                    const formattedWeekdays = group.weekdays?.join(", ") || "—";

                    return (
                      <TableRow key={group.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="px-6 py-4 font-semibold text-sm text-foreground">
                          {group.groupName}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                          {formattedWeekdays}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-muted-foreground font-mono">
                          {group.startTime || "—"}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-muted-foreground font-medium">
                          {group.capacity || "—"} students
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm">
                          <Badge
                            variant="outline"
                            className={
                              group.status?.toLowerCase() === "active"
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 font-medium capitalize"
                                : "bg-muted text-muted-foreground border-border font-medium capitalize"
                            }
                          >
                            {group.status || "Active"}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate" title={branchNames}>
                          {branchNames}
                        </TableCell>
                        {showCreateBtn && (
                          <TableCell className="px-6 py-4 text-sm text-right">
                            <ClassGroupRowActions classGroupId={group.id} groupName={group.groupName} />
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            <div className="px-6 py-3 border-t border-border bg-muted/5 flex justify-end">
              <PaginationControls
                totalPages={totalPages}
                currentPage={currentPage}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}