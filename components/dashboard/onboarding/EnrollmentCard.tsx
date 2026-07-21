"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, MapPin, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EnrollmentData } from "@/store/slices/onboardingSlice";

interface EnrollmentCardProps {
  enrollment: EnrollmentData;
  studentName: string;
  parentName?: string | null;
  branchName?: string | null;
  courseName?: string | null;
  staffName?: string | null;
  onSelect: (enrollment: EnrollmentData) => void;
}

export function EnrollmentCard({
  enrollment,
  studentName,
  parentName,
  branchName,
  courseName,
  staffName,
  onSelect,
}: EnrollmentCardProps) {
  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
      case "pending":
        return "bg-amber-500/10 text-amber-700 border-amber-500/20";
      case "completed":
        return "bg-blue-500/10 text-blue-700 border-blue-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Card 
      className="bg-card border-border hover:border-primary/45 hover:shadow-md transition-all duration-300 cursor-pointer"
      onClick={() => onSelect(enrollment)}
    >
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-xs font-extrabold text-foreground tracking-tight">
              {enrollment.enrollmentId}
            </CardTitle>
            <p className="text-[10px] text-muted-foreground font-semibold">
              {studentName}
            </p>
          </div>
          <Badge 
            variant="outline" 
            className={cn("text-[9px] font-bold uppercase tracking-wider", getStatusColor(enrollment.onboardingStatus))}
          >
            {enrollment.onboardingStatus || "pending"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          {branchName && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="font-medium truncate">{branchName}</span>
            </div>
          )}
          {courseName && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <GraduationCap className="h-3 w-3 shrink-0" />
              <span className="font-medium truncate">{courseName}</span>
            </div>
          )}
          {parentName && (
            <div className="flex items-center gap-1 text-muted-foreground col-span-2">
              <User className="h-3 w-3 shrink-0" />
              <span className="font-medium truncate">Parent: {parentName}</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-muted-foreground col-span-2">
            <Calendar className="h-3 w-3 shrink-0" />
            <span className="font-medium">{formatDate(enrollment.enrollDate)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}