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
  onChange?: (field: string, value: boolean) => void;
}

export function DeliveryChecklist({ enrollment, onChange }: DeliveryChecklistProps) {
  const gates = [
    { key: "scheduleDelivered", label: "Schedule Delivered", value: enrollment.scheduleDelivered },
    { key: "calendarDelivered", label: "Calendar Delivered", value: enrollment.calendarDelivered },
    { key: "appInstructionsDelivered", label: "App Instructions", value: enrollment.appInstructionsDelivered },
    { key: "audioRecommendationsDelivered", label: "Audio Recommendations", value: enrollment.audioRecommendationsDelivered },
  ];

  const handleToggle = (key: string, currentValue: boolean) => {
    if (onChange) {
      onChange(key, !currentValue);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
      <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">
        B. Delivery Checklist
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {gates.map((gate) => (
          <button
            key={gate.key}
            type="button"
            onClick={() => handleToggle(gate.key, gate.value)}
            title={gate.label} // 👈 shows full label on hover
            className={cn(
              "flex items-center gap-2.5 p-2.5 rounded-lg border text-xs font-semibold transition-all duration-200 text-left w-full",
              gate.value
                ? "bg-emerald-500/5 border-emerald-500/15 text-emerald-700 dark:text-emerald-500 hover:bg-emerald-500/10"
                : "bg-muted/30 border-border/40 text-muted-foreground/80 hover:bg-muted/50 hover:border-border"
            )}
          >
            <span
              className={cn(
                "h-4 w-4 rounded flex items-center justify-center border shrink-0 transition-colors duration-200",
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
          </button>
        ))}
      </div>
    </div>
  );
}