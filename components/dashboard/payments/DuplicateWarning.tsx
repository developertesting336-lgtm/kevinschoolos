"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertOctagon } from "lucide-react";

interface DuplicateWarningProps {
  isDuplicate: boolean;
}

export function DuplicateWarning({ isDuplicate }: DuplicateWarningProps) {
  if (!isDuplicate) return null;

  return (
    <Alert variant="destructive" className="bg-rose-500/10 border-rose-500/25 text-rose-700 dark:text-rose-500 rounded-xl p-4 select-none">
      <div className="flex items-start gap-3">
        <AlertOctagon className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
        <div className="space-y-1">
          <AlertTitle className="text-xs font-extrabold uppercase tracking-wide text-rose-800 dark:text-rose-400">
            Possible Duplicate Payment Detected
          </AlertTitle>
          <AlertDescription className="text-xs text-rose-700 dark:text-rose-500/90 leading-normal font-medium">
            This payment reference matches an existing record with the same receipt number, transaction date, and amount. In Phase 3, this record entry lock will prevent double entry.
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}
