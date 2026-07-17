"use client";

import { MessageSquare, Phone, Mail, Award, Calendar, User, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityData {
  id: string;
  activityId: string;
  dateTime: string | Date | null;
  type: string | null;
  direction: string | null;
  outcome: string | null;
  notes: string | null;
  nextFollowUpDate: string | Date | null;
  ownerIds: string[];
}

interface ActivityTimelineProps {
  activities: ActivityData[];
  staffIdToNameMap: Map<string, string>;
}

export function ActivityTimeline({ activities, staffIdToNameMap }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="bg-card border border-dashed border-border rounded-xl p-6 text-center select-none">
        <Info className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2.5" />
        <p className="text-sm font-semibold text-muted-foreground">No Activities Recorded</p>
        <p className="text-xs text-muted-foreground/80 mt-1">There are no documented CRM activities for this lead.</p>
      </div>
    );
  }

  const getActivityIcon = (type: string | null) => {
    const t = (type || "").toLowerCase();
    if (t.includes("call") || t.includes("звонок")) return Phone;
    if (t.includes("whatsapp") || t.includes("messenger") || t.includes("чат")) return MessageSquare;
    if (t.includes("email") || t.includes("письмо")) return Mail;
    if (t.includes("trial") || t.includes("пробный")) return Calendar;
    return Info;
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4 select-none">
      <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">
        Activity History ({activities.length})
      </h3>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
        {activities.map((act) => {
          const IconComponent = getActivityIcon(act.type);
          const staffName = act.ownerIds
            .map((id) => staffIdToNameMap.get(id) || "Staff")
            .join(", ") || "System";
          
          const hasDateTime = !!act.dateTime;
          const formattedDate = hasDateTime
            ? new Date(act.dateTime!).toLocaleString("en-US", {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
            : "—";

          return (
            <div key={act.id} className="relative group">
              {/* Timeline marker icon */}
              <span className="absolute left-[-27px] top-1 h-5 w-5 rounded-full border border-border bg-card flex items-center justify-center shadow-xs">
                <IconComponent className="h-2.5 w-2.5 text-primary shrink-0" />
              </span>

              {/* Activity details card */}
              <div className="bg-muted/20 hover:bg-muted/40 border border-border/40 rounded-lg p-3 transition-colors space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">
                      {act.type || "CRM Touchpoint"}
                    </span>
                    {act.direction && (
                      <span className="text-[10px] font-semibold bg-muted px-1.5 py-0.5 rounded border border-border/50 text-muted-foreground uppercase">
                        {act.direction}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formattedDate}
                  </span>
                </div>

                {act.notes && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {act.notes}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-1.5 mt-1.5 text-[10px] text-muted-foreground font-semibold">
                  <span className="flex items-center gap-1.5">
                    <User className="h-3 w-3" />
                    By: {staffName}
                  </span>
                  
                  {act.outcome && (
                    <span>
                      Outcome: <span className="text-foreground">{act.outcome}</span>
                    </span>
                  )}

                  {act.nextFollowUpDate && (
                    <span className="text-primary font-bold">
                      Next Follow-up: {new Date(act.nextFollowUpDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
