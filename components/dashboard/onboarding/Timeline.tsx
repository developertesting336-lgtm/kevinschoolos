"use client";

import { Check, ClipboardList, ShieldAlert, BadgeCheck, FileText, UserCheck, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineProps {
  enrollment: {
    enrollDate: string | Date | null;
    contractSigned: boolean;
    contractDate: string | Date | null;
    hdSystemRegistered: boolean;
    appCredentialsIssued: boolean;
    firstLessonConfirmed: boolean;
    firstLessonDate: string | Date | null;
    trialFeeDeducted: boolean;
  };
}

export function Timeline({ enrollment }: TimelineProps) {
  // Compile list of events based on the database fields
  const events = [];

  if (enrollment.enrollDate) {
    events.push({
      key: "enroll",
      title: "Enrollment Registered",
      date: new Date(enrollment.enrollDate),
      description: "Student enrollment record officially created in the system.",
      icon: ClipboardList,
      colorClass: "bg-blue-500 text-white",
    });
  }

  if (enrollment.contractSigned) {
    events.push({
      key: "contract",
      title: "Contract Finalized",
      date: enrollment.contractDate ? new Date(enrollment.contractDate) : null,
      description: "Onboarding agreement signed by parent.",
      icon: FileText,
      colorClass: "bg-indigo-500 text-white",
    });
  }

  if (enrollment.hdSystemRegistered) {
    events.push({
      key: "hd_sys",
      title: "HD System Registered",
      date: null,
      description: "Student details provisioned in the central Helen Doron Management System.",
      icon: BadgeCheck,
      colorClass: "bg-purple-500 text-white",
    });
  }

  if (enrollment.appCredentialsIssued) {
    events.push({
      key: "credentials",
      title: "App Credentials Issued",
      date: null,
      description: "Learning portal accounts activated and credentials sent to parents.",
      icon: UserCheck,
      colorClass: "bg-amber-500 text-white",
    });
  }

  if (enrollment.trialFeeDeducted) {
    events.push({
      key: "trial_fee",
      title: "Trial Fee Deducted",
      date: null,
      description: "Trial lesson administrative deduction processed.",
      icon: CreditCard,
      colorClass: "bg-emerald-500 text-white",
    });
  }

  if (enrollment.firstLessonConfirmed) {
    events.push({
      key: "first_lesson",
      title: "First Lesson Confirmed",
      date: enrollment.firstLessonDate ? new Date(enrollment.firstLessonDate) : null,
      description: "Schedule slot locked and first attendance confirmed.",
      icon: Check,
      colorClass: "bg-teal-500 text-white",
    });
  }

  // Sort events by date descending if dates exist, otherwise push undated to bottom/top
  const sortedEvents = events.sort((a, b) => {
    if (a.date && b.date) {
      return b.date.getTime() - a.date.getTime();
    }
    if (a.date) return -1;
    if (b.date) return 1;
    return 0;
  });

  if (sortedEvents.length === 0) {
    return (
      <div className="text-center py-6 select-none bg-muted/20 border border-dashed border-border rounded-xl">
        <ShieldAlert className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-xs font-semibold text-muted-foreground">No Onboarding Events Registered</p>
      </div>
    );
  }

  return (
    <div className="relative border-l border-border pl-6 ml-3 space-y-6 select-none py-2">
      {sortedEvents.map((ev) => {
        const Icon = ev.icon;
        const formattedDate = ev.date
          ? ev.date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "Completed (Undated)";

        return (
          <div key={ev.key} className="relative group">
            {/* Circle Marker */}
            <span
              className={cn(
                "absolute left-[-35px] top-1.5 h-6 w-6 rounded-full border border-border flex items-center justify-center shadow-xs transition-transform duration-300 group-hover:scale-110",
                ev.colorClass
              )}
            >
              <Icon className="h-3 w-3 shrink-0" />
            </span>

            {/* Content Details */}
            <div className="space-y-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <h5 className="text-xs font-bold text-foreground">{ev.title}</h5>
                <span className="text-[10px] text-muted-foreground font-semibold">
                  {formattedDate}
                </span>
              </div>
              <p className="text-xs text-muted-foreground/80 leading-normal">
                {ev.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
