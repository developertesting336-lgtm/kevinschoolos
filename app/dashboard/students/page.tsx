"use client";

import { useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchStudentFeeStatuses,
  setSelectedMonth,
  selectStudentsError,
  selectStudentsIsForbidden,
  selectSelectedMonth,
  selectFeeRecordsLoading,
  Student,
  StudentFeeRecord,
} from "@/store/slices/studentsSlice";
import { validateSessionThunk, selectAuthRole } from "@/store/slices/authSlice";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { GraduationCap, ArrowLeft, ShieldAlert, Calendar, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StudentTableSection } from "@/components/dashboard/students/StudentTableSection";
import { FeeSubmissionModal } from "@/components/dashboard/students/FeeSubmissionModal";

export default function StudentsPage() {
  const dispatch = useAppDispatch();

  // Auth / RBAC selectors
  const errorMsg = useAppSelector(selectStudentsError);
  const isForbidden = useAppSelector(selectStudentsIsForbidden);
  const userRole = useAppSelector(selectAuthRole);
  const isTeacher = (userRole || "").toLowerCase().trim() === "teacher";

  // Month filter selectors
  const selectedMonth = useAppSelector(selectSelectedMonth);
  const feeRecordsLoading = useAppSelector(selectFeeRecordsLoading);

  // Modal state — lifted here so it survives table re-renders without resetting
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingFeeRecord, setEditingFeeRecord] = useState<StudentFeeRecord | null>(null);

  // Validate session once on mount
  useEffect(() => {
    dispatch(validateSessionThunk());
  }, [dispatch]);

  // Re-fetch fee statuses whenever the selected month changes
  useEffect(() => {
    if (selectedMonth) {
      dispatch(fetchStudentFeeStatuses(selectedMonth));
    }
  }, [dispatch, selectedMonth]);

  // Stable callback passed to the memoized table — won't cause re-renders
  const handleOpenModal = useCallback(
    (student: Student, feeRecord: StudentFeeRecord | null) => {
      setSelectedStudent(student);
      setEditingFeeRecord(feeRecord);
      setIsModalOpen(true);
    },
    []
  );

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedStudent(null);
    setEditingFeeRecord(null);
  }, []);

  // ── Forbidden view ────────────────────────────────────────────────────────
  if (isForbidden) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center select-none animate-in fade-in duration-300 px-4">
        <Card className="max-w-md w-full border-destructive/30 bg-destructive/5 shadow-lg shadow-destructive/5">
          <div className="flex flex-col items-center pb-2 p-6">
            <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-2">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-destructive mt-2">Access Restricted</h2>
            <p className="text-xs text-muted-foreground mt-1">Insufficient Permissions</p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-4">
              Your role{" "}
              <span className="font-semibold text-foreground capitalize">
                ({userRole || "Staff"})
              </span>{" "}
              does not have access to browse the student registry.
            </p>
            <div className="pt-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Dashboard Overview
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 select-none animate-in fade-in duration-300">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
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
            Browse students, track monthly fee payments
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

      {/* ── Error Banner ─────────────────────────────────────────────────── */}
      {errorMsg && (
        <Card className="border-destructive/20 bg-destructive/5 text-destructive p-4 text-sm font-medium">
          {errorMsg}
        </Card>
      )}

      {/* ── Main Card ────────────────────────────────────────────────────── */}
      <Card className="bg-card border-border shadow-md overflow-hidden">
        {/* Month filter — hidden for teachers (no fee access) */}
        {!isTeacher && (
          <div className="border-b border-border py-3.5 px-6 bg-muted/10 flex items-center gap-3">
            <div className="flex items-center gap-2 bg-background border border-border px-3 py-1 rounded-lg text-xs font-medium shadow-xs">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <span className="text-muted-foreground text-[11px] uppercase tracking-wider font-semibold">
                Fee Month:
              </span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  if (e.target.value) dispatch(setSelectedMonth(e.target.value));
                }}
                className="bg-transparent text-foreground text-xs font-semibold focus:outline-none cursor-pointer"
              />
              {feeRecordsLoading && (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-1" />
              )}
            </div>
          </div>
        )}

        {/* ── Memoized table section — search + table + pagination ───────── */}
        <CardContent className="p-0">
          <StudentTableSection
            selectedMonth={selectedMonth}
            onOpenModal={handleOpenModal}
            userRole={userRole ?? undefined}
          />
        </CardContent>
      </Card>

      {/* ── Fee Submission / Edit Modal — hidden for teachers ────────────── */}
      {!isTeacher && (
        <FeeSubmissionModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          student={selectedStudent}
          selectedMonth={selectedMonth}
          existingFeeRecord={editingFeeRecord}
        />
      )}
    </div>
  );
}
