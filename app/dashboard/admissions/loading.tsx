import { Skeleton } from "@/components/ui/skeleton";
import { LayoutDashboard } from "lucide-react";

export default function AdmissionsLoading() {
  return (
    <div className="space-y-8 animate-pulse select-none">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Dashboard</span>
            <span>/</span>
            <span>Admissions</span>
          </div>
          <div className="h-9 w-48 bg-muted rounded-lg flex items-center gap-3">
            <div className="h-7 w-7 rounded bg-muted-foreground/20" />
            <div className="h-6 w-32 bg-muted-foreground/20 rounded" />
          </div>
          <div className="h-4 w-64 bg-muted rounded" />
        </div>
        <div className="h-9 w-32 bg-muted rounded-lg" />
      </div>

      {/* Search & Filters Skeleton */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card border border-border p-4 rounded-xl">
        <div className="h-8 w-64 bg-muted rounded-lg" />
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 w-28 bg-muted rounded-lg" />
          ))}
        </div>
      </div>

      {/* Kanban Board Columns Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 min-h-[50vh]">
        {[1, 2, 3, 4, 5, 6].map((colIndex) => (
          <div key={colIndex} className="bg-muted/10 border border-border rounded-xl p-3 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="h-4 w-20 bg-muted rounded" />
              <div className="h-4 w-6 bg-muted rounded-full" />
            </div>
            <div className="space-y-3">
              {[1, 2].map((cardIndex) => (
                <div key={cardIndex} className="bg-card border border-border rounded-xl p-3.5 space-y-3">
                  <div className="h-4 w-3/4 bg-muted rounded" />
                  <div className="h-3 w-1/2 bg-muted rounded" />
                  <div className="h-3.5 w-full bg-muted rounded" />
                  <div className="flex justify-between items-center pt-2">
                    <div className="h-3 w-1/4 bg-muted rounded" />
                    <div className="h-4 w-12 bg-muted rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
