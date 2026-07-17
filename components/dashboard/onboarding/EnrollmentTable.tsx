"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "./StatusBadge";
import { Calendar, User, UserCheck, Compass, FileCheck } from "lucide-react";
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

interface EnrollmentTableProps {
  enrollments: EnrollmentData[];
  studentNameMap: Map<string, string>;
  parentNameMap: Map<string, string>;
  branchNameMap: Map<string, string>;
  courseNameMap: Map<string, string>;
  staffNameMap: Map<string, string>;
  onSelect: (enrollment: EnrollmentData) => void;
}

export function EnrollmentTable({
  enrollments,
  studentNameMap,
  parentNameMap,
  branchNameMap,
  courseNameMap,
  staffNameMap,
  onSelect,
}: EnrollmentTableProps) {
  
  const getProgressStats = (enrollment: EnrollmentData) => {
    const items = [
      enrollment.scheduleDelivered,
      enrollment.calendarDelivered,
      enrollment.appInstructionsDelivered,
      enrollment.audioRecommendationsDelivered,
      enrollment.contractSigned,
      enrollment.hdSystemRegistered,
      enrollment.appCredentialsIssued,
      enrollment.firstLessonConfirmed,
      enrollment.trialFeeDeducted,
    ];
    const total = items.length;
    const completed = items.filter(Boolean).length;
    return { completed, total, pct: Math.round((completed / total) * 100) };
  };

  if (enrollments.length === 0) {
    return (
      <div className="text-center py-12 bg-card border border-border rounded-xl select-none">
        <p className="text-sm font-semibold text-muted-foreground">No onboarding records found</p>
        <p className="text-xs text-muted-foreground/80 mt-1">Try broadening your search term or adjusting filter values.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden select-none">
      <Table>
        <TableHeader className="bg-muted/10">
          <TableRow>
            <TableHead className="w-[110px] text-[10px] uppercase font-bold tracking-wider">Enrollment ID</TableHead>
            <TableHead className="text-[10px] uppercase font-bold tracking-wider">Student & Parent</TableHead>
            <TableHead className="text-[10px] uppercase font-bold tracking-wider">Branch & Course</TableHead>
            <TableHead className="w-[120px] text-[10px] uppercase font-bold tracking-wider">Enroll Date</TableHead>
            <TableHead className="text-[10px] uppercase font-bold tracking-wider">Assigned Staff</TableHead>
            <TableHead className="w-[130px] text-[10px] uppercase font-bold tracking-wider">Completion</TableHead>
            <TableHead className="w-[135px] text-[10px] uppercase font-bold tracking-wider text-right">Onboarding Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {enrollments.map((enroll) => {
            const studentId = enroll.studentIds[0] || "";
            const studentName = studentNameMap.get(studentId) || "Unknown Student";
            const parentName = parentNameMap.get(enroll.id) || "—";
            const branchName = branchNameMap.get(enroll.branchIds[0] || "") || "—";
            const courseName = courseNameMap.get(enroll.id) || "—";
            const staffName = staffNameMap.get(enroll.id) || "Unassigned";
            const progress = getProgressStats(enroll);

            const formattedDate = enroll.enrollDate
              ? new Date(enroll.enrollDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "—";

            // Progress bar color matches
            let barColor = "bg-rose-500";
            if (progress.pct >= 100) {
              barColor = "bg-emerald-500";
            } else if (progress.pct >= 50) {
              barColor = "bg-amber-500";
            } else if (progress.pct > 0) {
              barColor = "bg-blue-500";
            }

            return (
              <TableRow
                key={enroll.id}
                onClick={() => onSelect(enroll)}
                className="cursor-pointer hover:bg-muted/30 transition-colors group"
              >
                {/* Enrollment ID */}
                <TableCell className="font-extrabold text-xs text-foreground tracking-tight py-3.5">
                  {enroll.enrollmentId}
                </TableCell>

                {/* Student & Parent */}
                <TableCell className="py-3.5">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                      {studentName}
                    </p>
                    <p className="text-[10px] text-muted-foreground/80 flex items-center gap-1 font-semibold">
                      <User className="h-3 w-3 shrink-0" />
                      Parent: {parentName}
                    </p>
                  </div>
                </TableCell>

                {/* Branch & Course */}
                <TableCell className="py-3.5">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-foreground truncate max-w-[150px]">
                      {courseName}
                    </p>
                    <p className="text-[10px] text-muted-foreground/80 font-medium">
                      {branchName}
                    </p>
                  </div>
                </TableCell>

                {/* Enroll Date */}
                <TableCell className="py-3.5 text-xs text-muted-foreground/80 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                    <span>{formattedDate}</span>
                  </div>
                </TableCell>

                {/* Assigned Staff */}
                <TableCell className="py-3.5 text-xs font-semibold text-muted-foreground/80">
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                    <span className="truncate max-w-[120px]">{staffName}</span>
                  </div>
                </TableCell>

                {/* Completion progress bar */}
                <TableCell className="py-3.5">
                  <div className="space-y-1 w-[110px]">
                    <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <FileCheck className="h-3 w-3 shrink-0" />
                        {progress.completed}/{progress.total}
                      </span>
                      <span>{progress.pct}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden border border-border/10">
                      <div className={cn("h-full transition-all duration-300", barColor)} style={{ width: `${progress.pct}%` }} />
                    </div>
                  </div>
                </TableCell>

                {/* Status Badge */}
                <TableCell className="py-3.5 text-right">
                  <StatusBadge status={enroll.onboardingStatus} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
