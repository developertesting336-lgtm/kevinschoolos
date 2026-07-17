"use client";

import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "./StatusBadge";
import { ProgressTracker } from "./ProgressTracker";
import { Calendar, User, Building, Compass, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface EnrollmentData {
  id: string;
  enrollmentId: string;
  enrollDate: string | Date | null;
  status: string | null;
  studentIds: string[];
  classGroupIds: string[];
  tuitionPlanIds: string[];
  branchIds: string[];
  trialFeeDeducted: boolean;
  contractSigned: boolean;
  contractDate: string | Date | null;
  hdSystemRegistered: boolean;
  appCredentialsIssued: boolean;
  scheduleDelivered: boolean;
  calendarDelivered: boolean;
  appInstructionsDelivered: boolean;
  audioRecommendationsDelivered: boolean;
  firstLessonConfirmed: boolean;
  firstLessonDate: string | Date | null;
  onboardingStatus: string | null;
}

interface EnrollmentCardProps {
  enrollment: EnrollmentData;
  studentName: string | null;
  parentName: string | null;
  branchName: string | null;
  courseName: string | null;
  staffName: string | null;
  onSelect: (enrollment: EnrollmentData) => void;
}

export function EnrollmentCard({
  enrollment,
  studentName,
  parentName,
  branchName,
  courseName,
  staffName,
  onSelect,
}: EnrollmentCardProps) {
  const formattedEnrollDate = enrollment.enrollDate
    ? new Date(enrollment.enrollDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  return (
    <Card
      onClick={() => onSelect(enrollment)}
      className="group relative cursor-pointer border bg-card hover:bg-muted/5 hover:border-primary/30 hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden select-none"
    >
      {/* Dynamic left visual highlight depending on status */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1 transition-all duration-300",
          enrollment.onboardingStatus?.toLowerCase() === "complete"
            ? "bg-emerald-500"
            : enrollment.onboardingStatus?.toLowerCase() === "in progress"
              ? "bg-amber-500"
              : "bg-muted-foreground/30 group-hover:bg-primary"
        )}
      />

      <CardContent className="p-4 pl-5 space-y-4">
        {/* Row 1: ID, status, select arrow */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              Enrollment ID
            </span>
            <span className="text-xs font-extrabold text-foreground tracking-tight">
              {enrollment.enrollmentId}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <StatusBadge status={enrollment.onboardingStatus} />
            <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200" />
          </div>
        </div>

        {/* Row 2: Student & Parent */}
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-foreground truncate">
            {studentName || "Unknown Student"}
          </h4>
          {parentName && (
            <p className="text-xs text-muted-foreground font-medium truncate flex items-center gap-1">
              <User className="h-3 w-3 text-muted-foreground/60" /> Parent: {parentName}
            </p>
          )}
        </div>

        {/* Row 3: Course & Branch */}
        <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground font-medium">
          <span className="truncate flex items-center gap-1">
            <Compass className="h-3 w-3 text-primary shrink-0" />
            {courseName || "No Course"}
          </span>
          <span className="truncate flex items-center gap-1 justify-end">
            <Building className="h-3 w-3 text-muted-foreground/60 shrink-0" />
            {branchName || "No Branch"}
          </span>
        </div>

        {/* Row 4: Date & Staff */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground/80 border-t border-border/40 pt-2.5">
          <span className="flex items-center gap-1 font-semibold">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
            {formattedEnrollDate}
          </span>
          <span className="font-semibold truncate max-w-[120px]" title={staffName || "Unassigned"}>
            Staff: {staffName || "Unassigned"}
          </span>
        </div>

        {/* Row 5: Progress Bar */}
        <div className="border-t border-border/40 pt-2.5">
          <ProgressTracker enrollment={enrollment} />
        </div>
      </CardContent>
    </Card>
  );
}
