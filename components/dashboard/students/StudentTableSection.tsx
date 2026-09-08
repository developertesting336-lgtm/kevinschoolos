"use client";

import React, { useState, useEffect, useCallback, memo } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchStudentsData,
  selectStudents,
  selectStudentsBranches,
  selectStudentsTotalCount,
  selectStudentsTotalPages,
  selectStudentsLoading,
  selectMonthlyFeeRecords,
  Student,
  StudentFeeRecord,
} from "@/store/slices/studentsSlice";
import { useDebounce } from "@/hooks/useDebounce";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  PlusCircle,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface StudentTableSectionProps {
  selectedMonth: string;
  onOpenModal: (student: Student, feeRecord: StudentFeeRecord | null) => void;
  userRole?: string;
}

/**
 * Isolated, memoized table section.
 * - Owns its own search state + debounce (400ms) — no URL mutation.
 * - Owns its own pagination state.
 * - Re-fetches ONLY when debounced query or page changes.
 * - The parent page (header, month filter, modal) never re-renders from search.
 * - Teachers see no fee columns (no submit, no status, no month filter).
 */
export const StudentTableSection = memo(function StudentTableSection({
  selectedMonth,
  onOpenModal,
  userRole,
}: StudentTableSectionProps) {
  const dispatch = useAppDispatch();

  // Redux selectors for table data
  const studentsList = useAppSelector(selectStudents);
  const branchesList = useAppSelector(selectStudentsBranches);
  const totalCount = useAppSelector(selectStudentsTotalCount);
  const totalPages = useAppSelector(selectStudentsTotalPages);
  const loading = useAppSelector(selectStudentsLoading);
  const monthlyFeeRecords = useAppSelector(selectMonthlyFeeRecords);

  // Role-based fee visibility
  const isTeacher = (userRole || "").toLowerCase().trim() === "teacher";

  // Local search & pagination state — isolated to this component
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce: only fire fetch 400ms after user stops typing
  const debouncedQuery = useDebounce(searchQuery, 400);

  // Reset to page 1 whenever the search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedQuery]);

  // Fetch students on debounced query or page change
  useEffect(() => {
    dispatch(
      fetchStudentsData({
        page: String(currentPage),
        search: debouncedQuery,
      })
    );
  }, [dispatch, debouncedQuery, currentPage]);

  const branchIdToNameMap = new Map(
    branchesList.map((b: any) => [b.id, b.name])
  );

  const isSearching = searchQuery !== debouncedQuery;

  // ── Pagination helpers ──────────────────────────────────────────────────────
  const goToPage = useCallback((p: number) => {
    if (p < 1 || p > totalPages) return;
    setCurrentPage(p);
  }, [totalPages]);

  const pageRange = 1;
  const pages: (number | string)[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - pageRange && i <= currentPage + pageRange)
    ) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  // ── Skeleton row ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        {/* Search bar skeleton */}
        <div className="px-6 py-3.5 border-b border-border bg-muted/10 flex items-center justify-between gap-4">
          <Skeleton className="h-5 w-36 bg-muted rounded" />
          <Skeleton className="h-8 w-64 bg-muted rounded" />
        </div>
        <div className="divide-y divide-border/40">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex px-6 py-4 items-center gap-6">
              <Skeleton className="h-4 w-28 bg-muted rounded" />
              {!isTeacher && (
                <>
                  <Skeleton className="h-5 w-16 bg-muted rounded" />
                  <Skeleton className="h-5 w-20 bg-muted rounded" />
                </>
              )}
              <Skeleton className="h-4 w-16 bg-muted rounded" />
              <Skeleton className="h-4 w-24 bg-muted rounded" />
              <Skeleton className="h-4 w-28 bg-muted rounded" />
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      {/* ── Card Header: count + search ────────────────────────────────────── */}
      <div className="border-b border-border py-3.5 px-6 bg-muted/10 flex flex-col md:flex-row md:items-center justify-between space-y-3 md:space-y-0 gap-4">
        <span className="text-sm font-bold text-foreground">
          ALL STUDENTS ({totalCount})
        </span>

        {/* Debounced search — does NOT touch the URL */}
        <div className="relative w-full max-w-xs sm:max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search students by name..."
            className="pl-8 pr-8 h-8 text-xs placeholder:text-muted-foreground/70"
          />
          {isSearching && (
            <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent bg-muted/20 border-b border-border">
            <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">
              Student Name
            </TableHead>
            {!isTeacher && (
              <>
                <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">
                  Fee Status ({selectedMonth})
                </TableHead>
                <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">
                  Action
                </TableHead>
              </>
            )}
            <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">
              Gender
            </TableHead>
            <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">
              Status
            </TableHead>
            <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">
              Date of Birth
            </TableHead>
            <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">
              Assigned Branches
            </TableHead>
            <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">
              Notes
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody className="divide-y divide-border">
          {studentsList.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={isTeacher ? 6 : 8}
                className="h-32 text-center text-xs text-muted-foreground"
              >
                {debouncedQuery
                  ? `No students found for "${debouncedQuery}".`
                  : "No students found."}
              </TableCell>
            </TableRow>
          ) : (
            studentsList.map((student: Student) => {
              const assignedBranches =
                student.branchIds
                  ?.map((id) => branchIdToNameMap.get(id) || id)
                  .join(", ") || "—";

              const feeRecord = monthlyFeeRecords[student.id];
              const isPaid = feeRecord && feeRecord.status === "Paid";

              return (
                <TableRow
                  key={student.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <TableCell className="px-6 py-4 font-semibold text-sm text-foreground">
                    {student.studentName}
                  </TableCell>

                  {/* Fee Status Badge — hidden for teachers */}
                  {!isTeacher && (
                    <TableCell className="px-6 py-4 text-sm">
                      {isPaid ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-500/10 border-emerald-500/20 text-emerald-600 font-semibold capitalize flex items-center gap-1.5 py-1 px-2.5 w-fit"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          Paid{" "}
                          {feeRecord.amount
                            ? `(${feeRecord.amount.toLocaleString()} KGS)`
                            : ""}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          style={{
                            color: "#e85d04",
                            borderColor: "#e85d0440",
                            backgroundColor: "#e85d0410",
                          }}
                          className="font-semibold capitalize py-1 px-2.5 w-fit"
                        >
                          Unpaid
                        </Badge>
                      )}
                    </TableCell>
                  )}

                  {/* Submit / Edit Fee Button — hidden for teachers */}
                  {!isTeacher && (
                    <TableCell className="px-6 py-4 text-sm">
                      <Button
                        size="sm"
                        variant={isPaid ? "outline" : "default"}
                        onClick={() =>
                          onOpenModal(student, isPaid ? feeRecord : null)
                        }
                        className={
                          isPaid
                            ? "h-8 text-xs font-medium border-border hover:bg-muted"
                            : "h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs flex items-center gap-1.5"
                        }
                      >
                        {isPaid ? (
                          "Edit Fee"
                        ) : (
                          <>
                            <PlusCircle className="h-3.5 w-3.5" />
                            Submit Fee
                          </>
                        )}
                      </Button>
                    </TableCell>
                  )}

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

                  <TableCell
                    className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate"
                    title={assignedBranches}
                  >
                    {assignedBranches}
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

      {/* ── Pagination ─────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="px-6 py-3 border-t border-border bg-muted/5 flex items-center justify-end gap-1">
          <Pagination className="justify-end text-xs m-0">
            <PaginationContent>
              <PaginationItem>
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </button>
              </PaginationItem>

              {pages.map((page, idx) => (
                <PaginationItem key={idx}>
                  {page === "..." ? (
                    <PaginationEllipsis />
                  ) : (
                    <button
                      onClick={() => goToPage(Number(page))}
                      className={`inline-flex items-center justify-center h-8 w-8 text-xs font-semibold rounded-md border transition-colors ${
                        page === currentPage
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border bg-background hover:bg-muted text-foreground"
                      }`}
                    >
                      {page}
                    </button>
                  )}
                </PaginationItem>
              ))}

              <PaginationItem>
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </>
  );
});
