import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export default function OnboardingLoading() {
  return (
    <div className="space-y-8 select-none">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* Control filters skeleton */}
      <Card className="border-border bg-card">
        <CardHeader className="border-b border-border py-4 px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-8 w-full sm:max-w-sm rounded-md" />
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <Skeleton className="h-8 w-28 rounded-lg" />
            <Skeleton className="h-8 w-32 rounded-lg" />
            <Skeleton className="h-8 w-32 rounded-lg" />
            <Skeleton className="h-8 w-36 rounded-lg" />
            <Skeleton className="h-8 w-36 rounded-lg" />
          </div>
        </CardContent>
      </Card>

      {/* Grid or Table lines skeleton */}
      <div className="border border-border bg-card rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-20" />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex items-center justify-between py-2 border-b border-border/40 last:border-b-0">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
