"use client";

import { Badge } from "@/components/ui/badge";
import { AlertCircle, Calendar } from "lucide-react";

interface FollowUpBadgeProps {
  status: string | null;
  nextFollowUpDate: string | Date | null;
}

export function isFollowUpOverdue(status: string | null, nextFollowUpDate: string | Date | null) {
  if (!nextFollowUpDate) return false;
  
  const followUp = new Date(nextFollowUpDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const normalizedStatus = (status || "").toLowerCase().trim();
  if (normalizedStatus === "enrolled" || normalizedStatus === "lost" || normalizedStatus === "won") {
    return false;
  }
  
  return followUp.getTime() < today.getTime();
}

export function FollowUpBadge({ status, nextFollowUpDate }: FollowUpBadgeProps) {
  if (!nextFollowUpDate) return null;
  
  const d = new Date(nextFollowUpDate);
  const formattedDate = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  const isOverdue = isFollowUpOverdue(status, nextFollowUpDate);
  
  if (isOverdue) {
    return (
      <Badge
        variant="destructive"
        className="inline-flex items-center gap-1 bg-amber-500/15 border-amber-500/30 text-amber-700 font-semibold px-2 py-0.5 border animate-pulse"
      >
        <AlertCircle className="h-3 w-3 shrink-0" />
        Overdue: {formattedDate}
      </Badge>
    );
  }
  
  return (
    <Badge
      variant="outline"
      className="inline-flex items-center gap-1 bg-primary/5 border-primary/10 text-primary font-medium px-2 py-0.5"
    >
      <Calendar className="h-3 w-3 shrink-0" />
      Follow-up: {formattedDate}
    </Badge>
  );
}
