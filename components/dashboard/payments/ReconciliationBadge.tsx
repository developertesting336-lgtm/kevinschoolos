"use client";

import { Badge } from "@/components/ui/badge";
import { HelpCircle, CheckCircle2, AlertTriangle, AlertOctagon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReconciliationBadgeProps {
  status: string;
  className?: string;
}

export function ReconciliationBadge({ status, className }: ReconciliationBadgeProps) {
  const norm = status.toLowerCase().trim();

  let text = "Pending";
  let variantClass = "bg-muted/40 border-muted-foreground/30 text-muted-foreground";
  let Icon = HelpCircle;

  if (norm === "reconciled") {
    text = "Reconciled";
    variantClass = "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-500";
    Icon = CheckCircle2;
  } else if (norm === "requires review" || norm === "requires_review") {
    text = "Requires Review";
    variantClass = "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-500";
    Icon = AlertTriangle;
  } else if (norm === "failed") {
    text = "Failed";
    variantClass = "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-500";
    Icon = AlertOctagon;
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
