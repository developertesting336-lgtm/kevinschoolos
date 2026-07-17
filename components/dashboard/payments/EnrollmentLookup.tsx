"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, UserPlus, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface EnrollmentData {
  id: string;
  enrollmentId: string;
  studentName?: string;
  courseName?: string;
  branchName?: string;
  status: string | null;
}

interface EnrollmentLookupProps {
  enrollments: EnrollmentData[];
  selectedEnrollmentId?: string;
}

export function EnrollmentLookup({ enrollments, selectedEnrollmentId }: EnrollmentLookupProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredEnrollments = enrollments.filter((enr) => {
    const text = `${enr.enrollmentId} ${enr.studentName || ""} ${enr.courseName || ""} ${enr.branchName || ""}`.toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-2 select-none">
      <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
        Enrollment Linkage Lookup (Read-Only)
      </label>
      
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
        <Input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter enrollments by student, course, or branch..."
          className="pl-8 text-xs h-8 bg-muted/20 border-border/40 focus:ring-0 focus:border-border/40"
        />
      </div>

      <ScrollArea className="h-32 border border-border/50 rounded-lg bg-muted/5 overflow-y-auto">
        <div className="p-1 space-y-1">
          {filteredEnrollments.length === 0 ? (
            <p className="text-[11px] text-muted-foreground/80 italic p-3 text-center">No matching enrollments found</p>
          ) : (
            filteredEnrollments.map((enr) => {
              const isSelected = enr.id === selectedEnrollmentId;
              return (
                <div
                  key={enr.id}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-md text-[11px] border transition-colors",
                    isSelected
                      ? "bg-primary/5 border-primary/20 text-primary font-bold"
                      : "bg-transparent border-transparent text-muted-foreground/80"
                  )}
                >
                  <div className="space-y-0.5 truncate max-w-[80%]">
                    <p className="font-semibold text-foreground flex items-center gap-1">
                      <UserPlus className="h-3.5 w-3.5 shrink-0" />
                      Enrollment {enr.enrollmentId}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      Student: {enr.studentName || "—"} • Course: {enr.courseName || "—"}
                    </p>
                    <p className="text-[9px] text-muted-foreground/60">
                      Branch: {enr.branchName || "—"} • Status: {enr.status || "—"}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="shrink-0 flex items-center gap-1">
                      <Check className="h-3 w-3 stroke-3 text-primary" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
