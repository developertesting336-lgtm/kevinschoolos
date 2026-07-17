"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { StatusBadge } from "./StatusBadge";
import { ProgressTracker } from "./ProgressTracker";
import { DeliveryChecklist } from "./DeliveryChecklist";
import { Timeline } from "./Timeline";
import { Phone, Mail, MessageSquare, User, UserCheck, Check, ShieldAlert, Award, FileText, Landmark } from "lucide-react";
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

interface StudentData {
  id: string;
  studentName: string;
  dateOfBirth?: string | Date | null;
  gender?: string | null;
  notes?: string | null;
  parentIds?: string[];
}

interface ParentData {
  id: string;
  parentName: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
}

interface OnboardingDrawerProps {
  enrollment: EnrollmentData | null;
  isOpen: boolean;
  onClose: () => void;
  student: StudentData | null;
  parent: ParentData | null;
  branchName: string | null;
  courseName: string | null;
  staffName: string | null;
}

export function OnboardingDrawer({
  enrollment,
  isOpen,
  onClose,
  student,
  parent,
  branchName,
  courseName,
  staffName,
}: OnboardingDrawerProps) {
  if (!enrollment) return null;

  const formattedEnrollDate = enrollment.enrollDate
    ? new Date(enrollment.enrollDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  const formattedContractDate = enrollment.contractDate
    ? new Date(enrollment.contractDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  const formattedFirstLessonDate = enrollment.firstLessonDate
    ? new Date(enrollment.firstLessonDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  // Resolve parent contact details safely to handle RBAC redactions
  const displayPhone = parent?.phone !== undefined ? (parent.phone || "—") : "— (Redacted)";
  const displayEmail = parent?.email !== undefined ? (parent.email || "—") : "— (Redacted)";
  const displayWhatsapp = parent?.whatsapp !== undefined ? (parent.whatsapp || "—") : "— (Redacted)";

  // Additional checklist status rows helper
  const checklistItems = [
    { label: "Contract Signed", value: enrollment.contractSigned },
    { label: "HD System Registered", value: enrollment.hdSystemRegistered },
    { label: "App Credentials Issued", value: enrollment.appCredentialsIssued, note: enrollment.appCredentialsIssued ? "Issued (Yes)" : "Pending (No)" },
    { label: "First Lesson Confirmed", value: enrollment.firstLessonConfirmed },
    { label: "Trial Fee Deducted", value: enrollment.trialFeeDeducted },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg lg:max-w-xl p-0 flex flex-col h-full bg-background border-l border-border shadow-2xl transition duration-300 select-none"
      >
        {/* Header */}
        <SheetHeader className="p-6 pb-4 border-b border-border/60 shrink-0 bg-card/50">
          <div className="flex flex-wrap gap-2 items-center mb-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              Onboarding Tracker
            </span>
            <StatusBadge status={enrollment.onboardingStatus} />
          </div>
          <SheetTitle className="text-xl font-extrabold text-foreground tracking-tight leading-none">
            {student?.studentName || "Onboarding Record"}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground mt-1">
            Enrollment ID: {enrollment.enrollmentId} • Course: {courseName || "—"}
          </SheetDescription>
        </SheetHeader>

        {/* Scrollable details view */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6 pb-8">
            
            {/* Completion Progress Bar */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <ProgressTracker enrollment={enrollment} />
            </div>

            {/* Delivery Gates checklist */}
            <DeliveryChecklist enrollment={enrollment} />

            {/* Additional Checklist Items list */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">
                Onboarding Checklist Items
              </h3>

              <div className="space-y-3">
                {checklistItems.map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-xs py-1">
                    <span className="font-semibold text-muted-foreground">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground font-semibold">
                        {item.note || (item.value ? "Yes" : "No")}
                      </span>
                      <span
                        className={cn(
                          "h-5 w-5 rounded-full flex items-center justify-center border shrink-0",
                          item.value
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
                            : "bg-muted border-border text-muted-foreground/30"
                        )}
                      >
                        {item.value ? (
                          <Check className="h-3 w-3 stroke-3" />
                        ) : (
                          <ShieldAlert className="h-3 w-3" />
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Student & Parent summaries */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">
                Profile Summaries
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Student summary */}
                <div className="space-y-2">
                  <h4 className="font-bold flex items-center gap-1.5 uppercase text-[10px] tracking-wider text-muted-foreground">
                    <User className="h-3.5 w-3.5 text-primary" />
                    Student Info
                  </h4>
                  <div className="space-y-1">
                    <p className="font-bold text-foreground">{student?.studentName || "—"}</p>
                    {student?.dateOfBirth && (
                      <p className="text-muted-foreground">
                        DOB: {new Date(student.dateOfBirth).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    )}
                    {student?.gender && <p className="text-muted-foreground capitalize">Gender: {student.gender}</p>}
                  </div>
                </div>

                {/* Parent summary */}
                <div className="space-y-2">
                  <h4 className="font-bold flex items-center gap-1.5 uppercase text-[10px] tracking-wider text-muted-foreground">
                    <UserCheck className="h-3.5 w-3.5 text-primary" />
                    Parent Contact
                  </h4>
                  <div className="space-y-1 text-muted-foreground">
                    <p className="font-bold text-foreground">{parent?.parentName || "—"}</p>
                    <p className="truncate flex items-center gap-1"><Phone className="h-3 w-3" /> {displayPhone}</p>
                    <p className="truncate flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {displayWhatsapp}</p>
                    <p className="truncate flex items-center gap-1"><Mail className="h-3 w-3" /> {displayEmail}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contract & Lesson Dates metadata */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">
                Milestone Specifications
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Contract Spec */}
                <div className="space-y-2">
                  <h4 className="font-bold flex items-center gap-1.5 uppercase text-[10px] tracking-wider text-muted-foreground">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    Contract Details
                  </h4>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Signed: <span className="font-semibold text-foreground">{enrollment.contractSigned ? "Yes" : "No"}</span></p>
                    <p className="text-muted-foreground">Signed Date: <span className="font-semibold text-foreground">{formattedContractDate}</span></p>
                    <p className="text-muted-foreground">Contract File: <span className="font-semibold text-rose-500 italic">Not Uploaded</span></p>
                  </div>
                </div>

                {/* First Lesson Spec */}
                <div className="space-y-2">
                  <h4 className="font-bold flex items-center gap-1.5 uppercase text-[10px] tracking-wider text-muted-foreground">
                    <Award className="h-3.5 w-3.5 text-primary" />
                    First Lesson Info
                  </h4>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Confirmed: <span className="font-semibold text-foreground">{enrollment.firstLessonConfirmed ? "Yes" : "No"}</span></p>
                    <p className="text-muted-foreground">Lesson Date: <span className="font-semibold text-foreground">{formattedFirstLessonDate}</span></p>
                    <p className="text-muted-foreground">Assigned Staff: <span className="font-semibold text-foreground truncate max-w-[120px] inline-block">{staffName || "Unassigned"}</span></p>
                  </div>
                </div>

                {/* Trial Fee SPEC */}
                <div className="space-y-2 sm:col-span-2 border-t border-border/40 pt-3">
                  <h4 className="font-bold flex items-center gap-1.5 uppercase text-[10px] tracking-wider text-muted-foreground">
                    <Landmark className="h-3.5 w-3.5 text-primary" />
                    Tuition & Fee Specifications
                  </h4>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Enrollment Registered: <span className="font-semibold text-foreground">{formattedEnrollDate}</span></p>
                    <p className="text-muted-foreground">Trial Fee Deducted: <span className="font-semibold text-foreground">{enrollment.trialFeeDeducted ? "Completed (Yes)" : "Pending (No)"}</span></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Onboarding Milestones Timeline */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">
                Onboarding Event Milestones
              </h3>
              <Timeline enrollment={enrollment} />
            </div>

          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
