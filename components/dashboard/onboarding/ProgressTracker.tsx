"use client";

interface ProgressTrackerProps {
  enrollment: {
    scheduleDelivered: boolean;
    calendarDelivered: boolean;
    appInstructionsDelivered: boolean;
    audioRecommendationsDelivered: boolean;
    contractSigned: boolean;
    hdSystemRegistered: boolean;
    appCredentialsIssued: boolean;
    firstLessonConfirmed: boolean;
    trialFeeDeducted: boolean;
  };
}

export function ProgressTracker({ enrollment }: ProgressTrackerProps) {
  const gates = [
    enrollment.scheduleDelivered,
    enrollment.calendarDelivered,
    enrollment.appInstructionsDelivered,
    enrollment.audioRecommendationsDelivered,
  ];

  const checklist = [
    enrollment.contractSigned,
    enrollment.hdSystemRegistered,
    enrollment.appCredentialsIssued,
    enrollment.firstLessonConfirmed,
    enrollment.trialFeeDeducted,
  ];

  const totalItems = gates.length + checklist.length;
  const completedItems = [...gates, ...checklist].filter(Boolean).length;
  const percentage = Math.round((completedItems / totalItems) * 100);

  // Set colors based on percentage
  let progressColor = "bg-rose-500";
  if (percentage >= 100) {
    progressColor = "bg-emerald-500";
  } else if (percentage >= 50) {
    progressColor = "bg-amber-500";
  } else if (percentage > 0) {
    progressColor = "bg-blue-500";
  }

  return (
    <div className="space-y-1.5 select-none w-full">
      <div className="flex items-center justify-between text-[11px] font-bold">
        <span className="text-muted-foreground uppercase tracking-wider">
          Onboarding Progress
        </span>
        <span className="text-foreground">{percentage}% ({completedItems}/{totalItems})</span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border/10">
        <div
          className={`h-full transition-all duration-500 ${progressColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
