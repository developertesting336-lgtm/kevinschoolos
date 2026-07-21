"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchOnboardingData, selectOnboardingLoading, selectOnboardingError } from "@/store/slices/onboardingSlice";
import { validateSessionThunk } from "@/store/slices/authSlice";
import { OnboardingClient } from "@/components/dashboard/onboarding/OnboardingClient";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ShieldAlert, ArrowLeft, ClipboardCheck } from "lucide-react";

export default function OnboardingPage() {
  const dispatch = useAppDispatch();
  const loading = useAppSelector(selectOnboardingLoading);
  const error = useAppSelector(selectOnboardingError);

  useEffect(() => {
    dispatch(validateSessionThunk()).then((result) => {
      if (result.meta.requestStatus === "fulfilled") {
        dispatch(fetchOnboardingData({}));
      }
    });
  }, [dispatch]);

  if (error) {
    return (
      <Card className="border-destructive/20 bg-destructive/5 text-destructive p-4 text-sm font-medium">
        {error}
      </Card>
    );
  }

  return (
    <div className="space-y-8 select-none animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
            <Link href="/dashboard" className="hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Onboarding</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <ClipboardCheck className="h-8 w-8 text-primary" />
            Onboarding Tracker
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track student onboarding progress, contract signings, credentials, and lessons
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg border border-border bg-card text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back Overview
        </Link>
      </div>

      {/* Onboarding client registry */}
      <OnboardingClient />
    </div>
  );
}
