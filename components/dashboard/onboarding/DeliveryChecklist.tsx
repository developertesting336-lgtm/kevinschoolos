"use client";

import { Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeliveryChecklistProps {
  enrollment: {
    scheduleDelivered: boolean;
    calendarDelivered: boolean;
    appInstructionsDelivered: boolean;
    audioRecommendationsDelivered: boolean;
  };
}

export function DeliveryChecklist({ enrollment }: DeliveryChecklistProps) {
  const gates = [
    { label: "Schedule Delivered", value: enrollment.scheduleDelivered },
    { label: "Calendar Delivered", value: enrollment.calendarDelivered },
    { label: "App Instructions", value: enrollment.appInstructionsDelivered },
    { label: "Audio Recommendations", value: enrollment.audioRecommendationsDelivered },
  ];

  return (
    <div className="bg-muted/15 border border-border/50 rounded-xl p-4 space-y-3 select-none">
      <h4 className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider border-b border-border/40 pb-1.5 flex items-center justify-between">
        <span>Delivery Gates (Required)</span>
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {gates.map((gate) => (
          <div
            key={gate.label}
            className={cn(
              "flex items-center gap-2.5 p-2 rounded-lg border text-xs font-semibold transition-colors duration-200",
              gate.value
                ? "bg-emerald-500/5 border-emerald-500/15 text-emerald-700 dark:text-emerald-500"
                : "bg-muted/30 border-border/40 text-muted-foreground/80"
            )}
          >
            <span
              className={cn(
                "h-4 w-4 rounded flex items-center justify-center border shrink-0",
                gate.value
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : "bg-card border-border text-transparent"
              )}
            >
              {gate.value ? (
                <Check className="h-3 w-3 stroke-3" />
              ) : (
                <AlertCircle className="h-3 w-3 text-muted-foreground/40" />
              )}
            </span>
            <span className="truncate">{gate.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
