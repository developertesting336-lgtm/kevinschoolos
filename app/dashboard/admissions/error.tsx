"use client";

import { useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function AdmissionsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Admissions Dashboard Route Error]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <Card className="max-w-md w-full border-destructive/30 bg-destructive/5 shadow-lg shadow-destructive/5 select-none">
        <CardHeader className="flex flex-col items-center pb-2">
          <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-2 animate-bounce">
            <AlertCircle className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold text-destructive">
            Something Went Wrong
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-1">
            Application Error Encountered
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            We encountered an unexpected error loading the Admissions dashboard data. Please try refreshing.
          </p>
          {error.message && (
            <p className="text-xs font-mono bg-destructive/10 p-2.5 rounded-lg text-destructive text-left overflow-auto max-h-24">
              {error.message}
            </p>
          )}
          <div className="pt-2">
            <Button
              onClick={() => reset()}
              size="sm"
              className="inline-flex items-center gap-2 cursor-pointer font-semibold"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
