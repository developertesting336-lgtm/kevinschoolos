"use client";

import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock } from "lucide-react";

interface StaleLeadBadgeProps {
  status: string | null;
  lastActivityDate: string | Date | null;
}

export function getLeadStaleness(status: string | null, lastActivityDate: string | Date | null) {
  if (!lastActivityDate) {
    return { isStale: false, daysSince: null, threshold: 99 };
  }

  const lastActive = new Date(lastActivityDate);
  const now = new Date();
  
  // Calculate difference in days
  const diffTime = now.getTime() - lastActive.getTime();
  const daysSince = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  const normalizedStatus = (status || "").toLowerCase().trim();
  
  if (normalizedStatus === "enrolled" || normalizedStatus === "lost" || normalizedStatus === "won") {
    return { isStale: false, daysSince, threshold: 99 };
  }
  
  let threshold = 99;
  if (normalizedStatus === "new") {
    threshold = 2;
  } else if (normalizedStatus === "contacted") {
    threshold = 5;
  } else if (normalizedStatus === "trial booked" || normalizedStatus === "trial scheduled") {
    threshold = 1;
  } else if (normalizedStatus === "trial done" || normalizedStatus === "trial completed") {
    threshold = 3;
  }
  
  const isStale = daysSince > threshold;
  return { isStale, daysSince, threshold };
}

export function StaleLeadBadge({ status, lastActivityDate }: StaleLeadBadgeProps) {
  const { isStale, daysSince } = getLeadStaleness(status, lastActivityDate);

  if (daysSince === null) return null;

  if (isStale) {
    return (
      <Badge
        variant="destructive"
        className="inline-flex items-center gap-1 bg-rose-500/10 border-rose-500/20 text-rose-600 font-semibold px-2 py-0.5 border"
      >
        <AlertTriangle className="h-3 w-3 shrink-0" />
        Stale Lead ({daysSince}d)
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="inline-flex items-center gap-1 bg-muted/50 border-border text-muted-foreground font-medium px-2 py-0.5"
    >
      <Clock className="h-3 w-3 shrink-0" />
      {daysSince === 0 ? "Active Today" : `${daysSince}d since active`}
    </Badge>
  );
}
