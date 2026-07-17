"use client";

import { Calendar, User, Home, CheckCircle2, AlertCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrialScheduleCardProps {
  trial: {
    id: string;
    trialId: string;
    dateTime: string | Date | null;
    outcome: string | null;
    notes: string | null;
  } | null;
  teacherName: string | null;
  roomName: string | null;
}

export function TrialScheduleCard({ trial, teacherName, roomName }: TrialScheduleCardProps) {
  if (!trial) {
    return (
      <div className="bg-card border border-dashed border-border rounded-xl p-6 text-center select-none">
        <Calendar className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2.5" />
        <p className="text-sm font-semibold text-muted-foreground">No Trial Scheduled</p>
        <p className="text-xs text-muted-foreground/80 mt-1">This lead has no registered trial logs in the system.</p>
      </div>
    );
  }

  const hasDateTime = !!trial.dateTime;
  const trialDate = hasDateTime ? new Date(trial.dateTime!).toLocaleDateString("en-US", {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }) : "—";
  
  const trialTime = hasDateTime ? new Date(trial.dateTime!).toLocaleTimeString("en-US", {
    hour: '2-digit',
    minute: '2-digit'
  }) : "—";

  const outcome = trial.outcome || "Scheduled";
  const outcomeLower = outcome.toLowerCase();

  let statusColor = "bg-primary/10 border-primary/20 text-primary";
  let StatusIcon = HelpCircle;

  if (outcomeLower === "attended" || outcomeLower === "converted" || outcomeLower === "пришёл") {
    statusColor = "bg-emerald-500/10 border-emerald-500/20 text-emerald-600";
    StatusIcon = CheckCircle2;
  } else if (outcomeLower === "no-show" || outcomeLower === "declined" || outcomeLower === "не пришёл" || outcomeLower === "отказался") {
    statusColor = "bg-rose-500/10 border-rose-500/20 text-rose-600";
    StatusIcon = AlertCircle;
  } else if (outcomeLower === "scheduled" || outcomeLower === "запланирован") {
    statusColor = "bg-blue-500/10 border-blue-500/20 text-blue-600";
    StatusIcon = Calendar;
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4 select-none">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
          Trial Information
        </h3>
        <span className={cn("inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border", statusColor)}>
          <StatusIcon className="h-3.5 w-3.5 shrink-0" />
          {outcome}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Date / Time Card */}
        <div className="bg-muted/30 border border-border/50 rounded-lg p-3 space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1.5">
            <Calendar className="h-3 w-3 text-primary" />
            Date & Time
          </span>
          <p className="text-xs font-bold text-foreground">{trialDate}</p>
          <p className="text-[11px] text-muted-foreground font-medium">{trialTime}</p>
        </div>

        {/* Staff & Room Card */}
        <div className="bg-muted/30 border border-border/50 rounded-lg p-3 space-y-2">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1.5">
              <User className="h-3 w-3 text-primary" />
              Teacher
            </span>
            <p className="text-xs font-bold text-foreground truncate">{teacherName || "—"}</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1.5">
              <Home className="h-3 w-3 text-primary" />
              Room
            </span>
            <p className="text-xs font-bold text-foreground truncate">{roomName || "—"}</p>
          </div>
        </div>
      </div>

      {trial.notes && (
        <div className="bg-muted/40 border border-border/50 rounded-lg p-3">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">
            Trial Notes
          </span>
          <p className="text-xs text-muted-foreground leading-relaxed italic">
            "{trial.notes}"
          </p>
        </div>
      )}
    </div>
  );
}
