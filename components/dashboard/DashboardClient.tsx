"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TeacherPortal } from "@/components/dashboard/teacher/TeacherPortal";
import { BranchCommandCenter } from "@/components/dashboard/branch/BranchCommandCenter";
import { SmmDashboardClient } from "@/components/dashboard/SmmDashboardClient";
import { FinanceDashboardClient } from "@/components/dashboard/FinanceDashboardClient";
import { OwnerDashboardClient } from "@/components/dashboard/OwnerDashboardClient";
import { normalizeRole } from "@/lib/roles";

export default function DashboardClient() {
  const router = useRouter();

  // Session state
  const [session, setSession] = useState<{ userId: string; role: string } | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [ownerView, setOwnerView] = useState<"hq" | "branch">("hq");
  const role = normalizeRole(session?.role || "staff");

  // Fetch session on mount — this is the ONLY initial data fetch
  useEffect(() => {
    let cancelled = false;

    async function fetchSession() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setSession(data);
          }
        } else {
          if (!cancelled) {
            router.push("/login");
          }
        }
      } catch (err) {
        console.error("[Dashboard Session Error]", err);
        if (!cancelled) {
          router.push("/login");
        }
      } finally {
        if (!cancelled) setSessionLoading(false);
      }
    }

    fetchSession();
    return () => { cancelled = true; };
  }, [router]);

  // Show loading skeleton while session is being validated
  if (sessionLoading) {
    return (
      <div className="space-y-8 select-none animate-pulse">
        <div>
          <div className="h-4 w-48 bg-muted rounded mb-2" />
          <div className="h-8 w-72 bg-muted rounded mb-1" />
          <div className="h-4 w-96 bg-muted rounded" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-card border-border rounded-lg p-6">
              <div className="h-3 w-20 bg-muted rounded mb-3" />
              <div className="h-8 w-16 bg-muted rounded mb-2" />
              <div className="h-3 w-24 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── TEACHER: Mobile-First Teacher Portal (§9.3) ───
  if (role === "teacher") {
    return <TeacherPortal />;
  }

  // ─── OFFICE ADMIN: Branch Command Center (§9.2) ───
  if (role === "office_admin") {
    return <BranchCommandCenter />;
  }

  // ─── OWNER: Owner / HQ Dashboard (§9.1) ───
  if (role === "owner") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground select-none">
              Owner Dashboard
            </h1>
            <p className="text-muted-foreground text-xs mt-1 select-none">
              {ownerView === "hq"
                ? "Global KPIs, enrollment trends, and financial reports"
                : "Branch operations, room schedules, upcoming trials, and class activities"}
            </p>
          </div>
          <div className="flex bg-muted/60 p-1 rounded-lg border border-border/40 select-none">
            <button
              onClick={() => setOwnerView("hq")}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all duration-200 cursor-pointer ${
                ownerView === "hq"
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              HQ Overview
            </button>
            <button
              onClick={() => setOwnerView("branch")}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all duration-200 cursor-pointer ${
                ownerView === "branch"
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Branch Center
            </button>
          </div>
        </div>
        <div className="transition-all duration-300">
          {ownerView === "hq" ? <OwnerDashboardClient /> : <BranchCommandCenter />}
        </div>
      </div>
    );
  }

  // ─── SMM ───
  if (role === "smm") {
    return <SmmDashboardClient />;
  }

  // ─── FINANCE ───
  if (role === "finance") {
    return <FinanceDashboardClient />;
  }

  // ─── FALLBACK: Minimal dashboard shell ───
  return (
    <div className="space-y-8 select-none">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground capitalize">
          {session?.role || "Staff"} Dashboard
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Full system overview and management
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-card border-border rounded-lg p-6 animate-pulse">
            <div className="h-3 w-20 bg-muted rounded mb-3" />
            <div className="h-8 w-16 bg-muted rounded mb-2" />
            <div className="h-3 w-24 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}