"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function OnboardingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Onboarding Route Error]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 select-none">
      <Card className="max-w-md w-full border-destructive/20 bg-destructive/5 shadow-md">
        <CardHeader className="flex flex-col items-center pb-2 text-center">
          <div className="h-10 w-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-2">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <CardTitle className="text-lg font-bold text-destructive">
            Something went wrong!
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-1">
            Failed to load onboarding tracking screen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-xs text-muted-foreground leading-normal bg-card p-3 rounded-lg border border-border/40">
            {error.message || "An unexpected error occurred while fetching the onboarding data. Please check network logs."}
          </p>
          <Button
            onClick={() => reset()}
            variant="outline"
            className="w-full inline-flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer border-destructive/20 hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Try Re-fetching Data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
