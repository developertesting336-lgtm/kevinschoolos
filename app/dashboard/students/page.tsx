"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchStudentsData,
  selectStudents,
  selectStudentsBranches,
  selectStudentsTotalCount,
  selectStudentsCurrentPage,
  selectStudentsTotalPages,
  selectStudentsLimit,
  selectStudentsLoading,
  selectStudentsError,
  selectStudentsIsForbidden,
  Student,
} from "@/store/slices/studentsSlice";
import { validateSessionThunk, selectAuthRole } from "@/store/slices/authSlice";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { GraduationCap, ArrowLeft, ShieldAlert } from "lucide-react";
import { SearchInput } from "@/components/dashboard/SearchInput";
import { PaginationControls } from "@/components/dashboard/PaginationControls";
import { Skeleton } from "@/components/ui/skeleton";

export default function StudentsPage() {
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();

  // Redux selectors
  const studentsList = useAppSelector(selectStudents);
  const branchesList = useAppSelector(selectStudentsBranches);
  const totalCount = useAppSelector(selectStudentsTotalCount);
  const currentPage = useAppSelector(selectStudentsCurrentPage);
  const totalPages = useAppSelector(selectStudentsTotalPages);
  const limit = useAppSelector(selectStudentsLimit);
  const loading = useAppSelector(selectStudentsLoading);
  const errorMsg = useAppSelector(selectStudentsError);
  const isForbidden = useAppSelector(selectStudentsIsForbidden);
  const userRole = useAppSelector(selectAuthRole);

  const pageParam = searchParams.get("page") || "1";
  const searchParam = searchParams.get("search") || "";

  useEffect(() => {
    dispatch(validateSessionThunk());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchStudentsData({ page: pageParam, search: searchParam }));
  }, [dispatch, pageParam, searchParam]);

  const branchIdToNameMap = new Map(branchesList.map((b: any) => [b.id, b.name]));

  // Skeleton Loader for Premium Experience
  if (loading) {
    return (
      <div className="space-y-8 select-none animate-pulse">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
              <Skeleton className="h-3 w-16 bg-muted rounded" />
              <span>/</span>
              <Skeleton className="h-3 w-24 bg-muted rounded" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 bg-muted rounded-full" />
              <Skeleton className="h-8 w-48 bg-muted rounded" />
            </div>
            <Skeleton className="h-4 w-72 bg-muted rounded mt-2" />
          </div>
          <Skeleton className="h-9 w-32 bg-muted rounded" />
        </div>

        {/* Table Card Skeleton */}
        <Card className="bg-card border-border shadow-md overflow-hidden">
          <CardHeader className="border-b border-border py-3 px-6 bg-muted/10 flex flex-row items-center justify-between space-y-0 gap-4">
            <Skeleton className="h-5 w-32 bg-muted rounded" />
            <Skeleton className="h-8 w-64 bg-muted rounded" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="border-b border-border">
              <div className="flex px-6 py-3.5 bg-muted/20">
                <Skeleton className="h-4 w-28 bg-muted rounded mr-6" />
                <Skeleton className="h-4 w-16 bg-muted rounded mr-6" />
                <Skeleton className="h-4 w-20 bg-muted rounded mr-6" />
                <Skeleton className="h-4 w-28 bg-muted rounded mr-6" />
                <Skeleton className="h-4 w-32 bg-muted rounded mr-6" />
                <Skeleton className="h-4 w-40 bg-muted rounded mr-6" />
                <Skeleton className="h-4 w-28 bg-muted rounded" />
              </div>
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex px-6 py-4 border-b border-border/40 items-center">
                <Skeleton className="h-4 w-28 bg-muted rounded mr-6" />
                <Skeleton className="h-4 w-16 bg-muted rounded mr-6" />
                <Skeleton className="h-5 w-16 bg-muted rounded mr-6" />
                <Skeleton className="h-4 w-28 bg-muted rounded mr-6" />
                <Skeleton className="h-4 w-32 bg-muted rounded mr-6" />
                <Skeleton className="h-4 w-40 bg-muted rounded mr-6" />
                <Skeleton className="h-4 w-28 bg-muted rounded" />
              </div>
            ))}
            <div className="px-6 py-3 bg-muted/5 flex justify-end border-t border-border">
              <Skeleton className="h-8 w-48 bg-muted rounded" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle unauthorized or RBAC restricted views
  if (isForbidden) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center select-none animate-in fade-in duration-300 px-4">
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
              Your role <span className="font-semibold text-foreground capitalize">({userRole || "Staff"})</span> does not have access to browse the student registry.
            </p>
            <div className="pt-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Dashboard Overview
              </Link>
            </div>
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
            <span className="text-foreground font-medium">Students</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-primary" />
            Students
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Browse and manage students registered across branches
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

      {errorMsg ? (
        <Card className="border-destructive/20 bg-destructive/5 text-destructive p-4 text-sm font-medium">
          {errorMsg}
        </Card>
      ) : (
        <Card className="bg-card border-border shadow-md overflow-hidden">
          <CardHeader className="border-b border-border py-3 px-6 bg-muted/10 flex flex-row items-center justify-between space-y-0 gap-4">
            <CardTitle className="text-sm font-bold text-foreground">
              ALL STUDENTS ({totalCount})
            </CardTitle>
            <SearchInput placeholder="Search students by name..." />
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-muted/20 border-b border-border">
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Student Name</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Gender</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Status</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Date of Birth</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Assigned Branches</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Medical Notes</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border">
                {studentsList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                      No students found.
                    </TableCell>
                  </TableRow>
                ) : (
                  studentsList.map((student: Student) => {
                    const assignedBranches = student.branchIds
                      ?.map((id) => branchIdToNameMap.get(id) || id)
                      .join(", ") || "—";

                    return (
                      <TableRow key={student.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="px-6 py-4 font-semibold text-sm text-foreground">
                          {student.studentName}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-muted-foreground capitalize">
                          {student.gender || "—"}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm">
                          <Badge
                            variant="outline"
                            className={
                              student.status?.toLowerCase() === "active"
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 font-medium capitalize"
                                : "bg-muted text-muted-foreground border-border font-medium capitalize"
                            }
                          >
                            {student.status || "Active"}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                          {student.dateOfBirth
                            ? new Date(student.dateOfBirth).toLocaleDateString()
                            : "— (Redacted)"}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate" title={assignedBranches}>
                          {assignedBranches}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate">
                          {student.medicalNotes !== undefined
                            ? student.medicalNotes || "—"
                            : "— (Redacted)"}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate">
                          {student.notes || "—"}
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
                currentPage={parseInt(pageParam, 10)}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
