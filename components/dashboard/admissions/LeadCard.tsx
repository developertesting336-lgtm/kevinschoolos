"use client";

import { Card, CardContent } from "@/components/ui/card";
import { StaleLeadBadge } from "./StaleLeadBadge";
import { FollowUpBadge } from "./FollowUpBadge";
import { Phone, User, Building, Compass, Calendar, ArrowRight } from "lucide-react";
import { getLeadStaleness } from "./StaleLeadBadge";
import { isFollowUpOverdue } from "./FollowUpBadge";
import { cn } from "@/lib/utils";

import { type LeadData } from "./AdmissionsClient";

interface LeadCardProps {
  lead: LeadData;
  parentName: string | null;
  branchName: string | null;
  ownerName: string | null;
  trialDate: string | Date | null;
  nextFollowUpDate: string | Date | null;
  onSelect: (lead: LeadData) => void;
}

export function LeadCard({
  lead,
  parentName,
  branchName,
  ownerName,
  trialDate,
  nextFollowUpDate,
  onSelect,
}: LeadCardProps) {
  const { isStale } = getLeadStaleness(lead.status, lead.lastActivityDate);
  const isOverdue = isFollowUpOverdue(lead.status, nextFollowUpDate);

  const formattedTrialDate = trialDate
    ? new Date(trialDate).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <Card
      onClick={() => onSelect(lead)}
      className={cn(
        "group relative cursor-pointer border bg-card hover:bg-muted/5 hover:border-primary/30 hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden select-none",
        isStale && "border-rose-500/20 bg-rose-500/1",
        isOverdue && "border-amber-500/20 bg-amber-500/1"
      )}
    >
      {/* Visual Indicator strip */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1 transition-all duration-300",
          isStale 
            ? "bg-rose-500" 
            : isOverdue 
              ? "bg-amber-500" 
              : "bg-transparent group-hover:bg-primary"
        )}
      />

      <CardContent className="p-4 pl-5 space-y-3">
        {/* Name and Action Icon */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
              {lead.leadName}
            </h4>
            {parentName && (
              <p className="text-[11px] text-muted-foreground font-medium">
                P: {parentName}
              </p>
            )}
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground/30 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-300 shrink-0" />
        </div>

        {/* Metadata Details Grid */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[10px] text-muted-foreground/80 font-semibold border-t border-border/50 pt-2.5">
          {/* Phone */}
          {lead.phone && (
            <div className="flex items-center gap-1.5 truncate">
              <Phone className="h-3 w-3 text-muted-foreground/50 shrink-0" />
              <span className="truncate">{lead.phone}</span>
            </div>
          )}

          {/* Branch */}
          {branchName && (
            <div className="flex items-center gap-1.5 truncate">
              <Building className="h-3 w-3 text-muted-foreground/50 shrink-0" />
              <span className="truncate">{branchName}</span>
            </div>
          )}

          {/* Owner */}
          {ownerName && (
            <div className="flex items-center gap-1.5 truncate">
              <User className="h-3 w-3 text-muted-foreground/50 shrink-0" />
              <span className="truncate">{ownerName}</span>
            </div>
          )}

          {/* Channel / Source */}
          {lead.channel && (
            <div className="flex items-center gap-1.5 truncate">
              <Compass className="h-3 w-3 text-muted-foreground/50 shrink-0" />
              <span className="truncate">{lead.channel}</span>
            </div>
          )}
        </div>

        {/* Trial Date indicator */}
        {formattedTrialDate && (
          <div className="flex items-center gap-1.5 text-[10px] bg-primary/5 text-primary border border-primary/10 rounded-lg p-1.5 px-2 font-bold w-fit">
            <Calendar className="h-3 w-3 shrink-0" />
            <span>Trial: {formattedTrialDate}</span>
          </div>
        )}

        {/* Badges footer */}
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/30">
          <StaleLeadBadge status={lead.status} lastActivityDate={lead.lastActivityDate} />
          <FollowUpBadge status={lead.status} nextFollowUpDate={nextFollowUpDate} />
        </div>
      </CardContent>
    </Card>
  );
}
