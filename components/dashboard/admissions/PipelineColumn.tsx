"use client";

import { LeadCard } from "./LeadCard";
import { cn } from "@/lib/utils";
import { Sparkles, PhoneCall, Calendar, CheckCircle2, Trophy, XCircle, Inbox } from "lucide-react";

import { type LeadData } from "./AdmissionsClient";

interface PipelineColumnProps {
  title: string;
  statusKey: string;
  leads: LeadData[];
  parentNameMap: Map<string, string>;
  branchNameMap: Map<string, string>;
  ownerNameMap: Map<string, string>;
  leadToTrialMap: Map<string, any>;
  leadToFollowUpMap: Map<string, any>;
  onSelectLead: (lead: LeadData) => void;
}

export function PipelineColumn({
  title,
  statusKey,
  leads,
  parentNameMap,
  branchNameMap,
  ownerNameMap,
  leadToTrialMap,
  leadToFollowUpMap,
  onSelectLead,
}: PipelineColumnProps) {
  
  // High visual appeal theme per column stage
  const themes: Record<string, { 
    bg: string; 
    border: string; 
    text: string; 
    badge: string;
    dot: string;
    icon: React.ReactNode;
  }> = {
    "New": {
      bg: "bg-slate-500/[0.03] dark:bg-slate-500/[0.05]",
      border: "border-slate-200 dark:border-slate-800",
      text: "text-slate-700 dark:text-slate-200",
      badge: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700",
      dot: "bg-slate-500",
      icon: <Sparkles className="h-3.5 w-3.5 text-slate-500" />,
    },
    "Contacted": {
      bg: "bg-sky-500/[0.03] dark:bg-sky-500/[0.05]",
      border: "border-sky-200/80 dark:border-sky-900/60",
      text: "text-sky-800 dark:text-sky-300",
      badge: "bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800",
      dot: "bg-sky-500",
      icon: <PhoneCall className="h-3.5 w-3.5 text-sky-500" />,
    },
    "Trial Scheduled": {
      bg: "bg-amber-500/[0.03] dark:bg-amber-500/[0.05]",
      border: "border-amber-200/80 dark:border-amber-900/60",
      text: "text-amber-800 dark:text-amber-300",
      badge: "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800",
      dot: "bg-amber-500",
      icon: <Calendar className="h-3.5 w-3.5 text-amber-500" />,
    },
    "Trial Completed": {
      bg: "bg-indigo-500/[0.03] dark:bg-indigo-500/[0.05]",
      border: "border-indigo-200/80 dark:border-indigo-900/60",
      text: "text-indigo-800 dark:text-indigo-300",
      badge: "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800",
      dot: "bg-indigo-500",
      icon: <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500" />,
    },
    "Won": {
      bg: "bg-emerald-500/[0.03] dark:bg-emerald-500/[0.05]",
      border: "border-emerald-200/80 dark:border-emerald-900/60",
      text: "text-emerald-800 dark:text-emerald-300",
      badge: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
      dot: "bg-emerald-500",
      icon: <Trophy className="h-3.5 w-3.5 text-emerald-500" />,
    },
    "Lost": {
      bg: "bg-rose-500/[0.03] dark:bg-rose-500/[0.05]",
      border: "border-rose-200/80 dark:border-rose-900/60",
      text: "text-rose-800 dark:text-rose-300",
      badge: "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800",
      dot: "bg-rose-500",
      icon: <XCircle className="h-3.5 w-3.5 text-rose-500" />,
    },
  };

  const currentTheme = themes[title] || themes["New"];

  return (
    <div className={cn(
      "flex flex-col shrink-0 rounded-2xl border p-3 space-y-3 min-w-70 w-72.5 sm:w-[320px] h-160 max-h-[68vh] overflow-hidden shadow-2xs transition-all",
      currentTheme.bg,
      currentTheme.border
    )}>
      {/* Column Header */}
      <div className="flex items-center justify-between border-b border-border/40 pb-2.5 px-1 shrink-0 select-none">
        <div className="flex items-center gap-2">
          {/* Status icon / dot */}
          <div className="flex items-center justify-center">
            {currentTheme.icon}
          </div>
          <h3 className={cn("text-xs font-bold uppercase tracking-wider", currentTheme.text)}>
            {title}
          </h3>
        </div>

        <span className={cn(
          "text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs",
          currentTheme.badge
        )}>
          {leads.length}
        </span>
      </div>

      {/* Cards List Container */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40">
        {leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 border border-dashed border-border/70 rounded-xl bg-card/40 select-none text-center p-4 space-y-1.5">
            <Inbox className="h-5 w-5 text-muted-foreground/40 stroke-1" />
            <span className="text-[11px] font-semibold text-muted-foreground/60">
              No leads in stage
            </span>
          </div>
        ) : (
          leads.map((lead) => {
            const parentName = lead.parentIds
              .map((id) => parentNameMap.get(id))
              .filter(Boolean)
              .join(", ") || null;
            
            const branchName = lead.branchIds
              .map((id) => branchNameMap.get(id))
              .filter(Boolean)
              .join(", ") || null;

            const ownerName = lead.ownerIds
              .map((id) => ownerNameMap.get(id))
              .filter(Boolean)
              .join(", ") || null;

            const trial = leadToTrialMap.get(lead.id) || null;
            const trialDate = trial?.dateTime || null;
            const followUpDate = leadToFollowUpMap.get(lead.id) || null;

            return (
              <LeadCard
                key={lead.id}
                lead={lead}
                parentName={parentName}
                branchName={branchName}
                ownerName={ownerName}
                trialDate={trialDate}
                nextFollowUpDate={followUpDate}
                onSelect={onSelectLead}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

