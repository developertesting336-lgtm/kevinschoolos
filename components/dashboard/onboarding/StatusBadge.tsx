"use client";

import { Badge } from "@/components/ui/badge";
import { HelpCircle, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string | null;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = (status || "Pending").toLowerCase().trim();

  let text = "Pending";
  let variantClass = "bg-muted/40 border-muted-foreground/30 text-muted-foreground";
  let Icon = HelpCircle;

  if (normalized === "in progress" || normalized === "in_progress") {
    text = "In Progress";
    variantClass = "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-500";
    Icon = Clock;
  } else if (normalized === "complete" || normalized === "completed") {
    text = "Complete";
    variantClass = "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-500";
    Icon = CheckCircle2;
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 border select-none rounded-md",
        variantClass,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {text}
    </Badge>
  );
}
