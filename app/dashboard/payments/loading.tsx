import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 select-none p-6">
      
      {/* Header and Search Skeleton */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48 rounded-md" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <Skeleton className="h-8 w-64 rounded-md" />
      </div>

      {/* Filters Skeleton */}
      <div className="bg-card border border-border/60 p-4 rounded-xl space-y-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-8 w-32 rounded-md" />
          <Skeleton className="h-8 w-32 rounded-md" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="border border-border/60 rounded-xl bg-card overflow-hidden">
        <div className="p-4 border-b border-border/50 bg-muted/10">
          <Skeleton className="h-5 w-full rounded-md" />
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
}
