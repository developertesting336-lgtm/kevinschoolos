"use client";

import { Card, CardContent } from "@/components/ui/card";
import { StaleLeadBadge, getLeadStaleness } from "./StaleLeadBadge";
import { FollowUpBadge, isFollowUpOverdue } from "./FollowUpBadge";
import { Phone, User, Building, Compass, Calendar, ArrowUpRight, MessageSquare, Globe, Share2 } from "lucide-react";
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

  // Lead initials for avatar
  const initials = (lead.leadName || "L")
    .trim()
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Channel icon helper
  const getChannelIcon = (channel: string | null) => {
    const c = (channel || "").toLowerCase();
    if (c.includes("whatsapp")) return <MessageSquare className="h-3 w-3 text-emerald-500 shrink-0" />;
    if (c.includes("web") || c.includes("site")) return <Globe className="h-3 w-3 text-blue-500 shrink-0" />;
    return <Compass className="h-3 w-3 text-muted-foreground/60 shrink-0" />;
  };

  return (
    <Card
      onClick={() => onSelect(lead)}
      className={cn(
        "group relative cursor-pointer border border-border/70 bg-card/90 hover:bg-card hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 rounded-xl overflow-hidden select-none",
        isStale && "border-rose-500/30 bg-rose-500/5",
        isOverdue && "border-amber-500/30 bg-amber-500/5"
      )}
    >
      {/* Visual Accent Bar */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1 transition-all duration-200",
          isStale
            ? "bg-rose-500"
            : isOverdue
              ? "bg-amber-500"
              : "bg-primary/20 group-hover:bg-primary"
        )}
      />

      <CardContent className="p-3.5 pl-4.5 space-y-3">
        {/* Header: Avatar, Name, Parent, & Action Icon */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Avatar Pill */}
            <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-xs text-primary shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              {initials}
            </div>

            <div className="min-w-0 space-y-0.5">
              <h4 className="text-xs font-bold text-foreground truncate tracking-tight group-hover:text-primary transition-colors">
                {lead.leadName}
              </h4>
              {parentName && (
                <p className="text-[11px] text-muted-foreground/80 truncate font-medium">
                  <span className="text-muted-foreground/50">Parent:</span> {parentName}
                </p>
              )}
            </div>
          </div>

          <div className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground/40 group-hover:text-primary group-hover:bg-primary/10 transition-all shrink-0">
            <ArrowUpRight className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Metadata Details Grid */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px] text-muted-foreground/90 font-medium pt-2 border-t border-border/40">
          {/* Phone */}
          {lead.phone ? (
            <div className="flex items-center gap-1.5 truncate">
              <Phone className="h-3 w-3 text-muted-foreground/50 shrink-0" />
              <span className="truncate">{lead.phone}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 truncate text-muted-foreground/40 italic">
              <Phone className="h-3 w-3 shrink-0" />
              <span>No phone</span>
            </div>
          )}

          {/* Branch */}
          {branchName ? (
            <div className="flex items-center gap-1.5 truncate">
              <Building className="h-3 w-3 text-muted-foreground/50 shrink-0" />
              <span className="truncate">{branchName}</span>
            </div>
          ) : (
            <div />
          )}

          {/* Owner */}
          {ownerName && (
            <div className="flex items-center gap-1.5 truncate col-span-1">
              <User className="h-3 w-3 text-muted-foreground/50 shrink-0" />
              <span className="truncate">{ownerName}</span>
            </div>
          )}

          {/* Channel / Source Badge */}
          {lead.channel && (
            <div className="flex items-center gap-1.5 truncate col-span-1">
              {getChannelIcon(lead.channel)}
              <span className="truncate font-semibold text-foreground/80">{lead.channel}</span>
            </div>
          )}
        </div>

        {/* Trial Date Indicator Pill (Hide if lead is enrolled/won) */}
        {formattedTrialDate && !["enrolled", "won"].includes((lead.status || "").toLowerCase().trim()) && (
          <div className="flex items-center gap-1.5 text-[11px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 rounded-md py-1 px-2.5 font-bold w-full justify-between">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>Trial Scheduled:</span>
            </div>
            <span className="bg-amber-500/20 px-1.5 py-0.5 rounded text-[10px]">{formattedTrialDate}</span>
          </div>
        )}

        {/* Badges Footer */}
        {(isStale || isOverdue || nextFollowUpDate || lead.lastActivityDate) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-border/40">
            <StaleLeadBadge status={lead.status} lastActivityDate={lead.lastActivityDate} />
            <FollowUpBadge status={lead.status} nextFollowUpDate={nextFollowUpDate} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

