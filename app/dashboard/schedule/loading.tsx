import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function ScheduleLoading() {
  return (
    <div className="space-y-8 select-none animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-20" />
            <span className="text-muted-foreground/30">/</span>
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-8 w-64 rounded-lg" />
          <Skeleton className="h-4 w-96 rounded-md" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      {/* Tab Selection Row Skeleton */}
      <div className="flex border-b border-border gap-2">
        <Skeleton className="h-9 w-40 rounded-t-lg" />
        <Skeleton className="h-9 w-36 rounded-t-lg" />
      </div>

      {/* Table Card Skeleton */}
      <Card className="bg-card border-border shadow-md overflow-hidden">
        <CardHeader className="border-b border-border py-4 px-6 bg-muted/10 flex flex-row items-center justify-between space-y-0 gap-4">
          <Skeleton className="h-5 w-48 rounded-md" />
          <Skeleton className="h-9 w-64 rounded-lg" />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-muted/20 border-b border-border">
                {[...Array(6)].map((_, idx) => (
                  <TableHead key={idx} className="px-6 py-3">
                    <Skeleton className="h-3 w-20 rounded" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border">
              {[...Array(5)].map((_, rowIdx) => (
                <TableRow key={rowIdx} className="hover:bg-transparent">
                  {[...Array(6)].map((_, colIdx) => (
                    <TableCell key={colIdx} className="px-6 py-4">
                      <Skeleton className={`h-4 rounded ${
                        colIdx === 0 ? "w-28" : colIdx === 5 ? "w-24" : "w-16"
                      }`} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="px-6 py-4 border-t border-border bg-muted/5 flex justify-end">
            <Skeleton className="h-8 w-48 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
