"use client";

import { LeadCard } from "./LeadCard";
import { cn } from "@/lib/utils";

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
  
  // Theme definitions per status for high visual appeal
  const themes: Record<string, { bg: string; border: string; text: string; badge: string }> = {
    "New": {
      bg: "bg-slate-500/[0.02]",
      border: "border-slate-200/60 dark:border-slate-800/60",
      text: "text-slate-700 dark:text-slate-300",
      badge: "bg-slate-500/10 border-slate-500/20 text-slate-600 dark:text-slate-400",
    },
    "Contacted": {
      bg: "bg-sky-500/[0.02]",
      border: "border-sky-200/50 dark:border-sky-800/50",
      text: "text-sky-700 dark:text-sky-300",
      badge: "bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400",
    },
    "Trial Scheduled": {
      bg: "bg-amber-500/[0.02]",
      border: "border-amber-200/50 dark:border-amber-800/50",
      text: "text-amber-700 dark:text-amber-300",
      badge: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
    },
    "Trial Completed": {
      bg: "bg-indigo-500/[0.02]",
      border: "border-indigo-200/50 dark:border-indigo-800/50",
      text: "text-indigo-700 dark:text-indigo-300",
      badge: "bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400",
    },
    "Won": {
      bg: "bg-emerald-500/[0.02]",
      border: "border-emerald-200/50 dark:border-emerald-800/50",
      text: "text-emerald-700 dark:text-emerald-300",
      badge: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    },
    "Lost": {
      bg: "bg-rose-500/[0.02]",
      border: "border-rose-200/50 dark:border-rose-800/50",
      text: "text-rose-700 dark:text-rose-300",
      badge: "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
    },
  };

  const currentTheme = themes[title] || themes["New"];

  return (
    <div className={cn(
      "flex flex-col flex-1 shrink-0 rounded-2xl border p-3.5 space-y-3 min-w-67.5 sm:min-w-72.5 h-full max-h-[75vh] overflow-hidden",
      currentTheme.bg,
      currentTheme.border
    )}>
      {/* Column Header */}
      <div className="flex items-center justify-between border-b border-border/40 pb-2.5 shrink-0 select-none">
        <h3 className={cn("text-xs font-bold uppercase tracking-wider", currentTheme.text)}>
          {title}
        </h3>
        <span className={cn(
          "text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs",
          currentTheme.badge
        )}>
          {leads.length}
        </span>
      </div>

      {/* Cards List Container */}
      <div className="flex-1 overflow-y-auto pr-0.5 space-y-3 scrollbar-thin">
        {leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-28 border border-dashed border-border/60 rounded-xl bg-card/20 select-none">
            <span className="text-[10px] font-medium text-muted-foreground/60">
              No leads in this stage
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
