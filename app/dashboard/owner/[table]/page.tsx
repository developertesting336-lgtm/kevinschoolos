import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { ownerTablesConfig } from "@/lib/owner-schema";
import { normalizeRole } from "@/lib/roles";
import { OwnerTableReduxView } from "@/components/dashboard/OwnerTableReduxView";

// Force dynamic fetch
export const dynamic = "force-dynamic";

interface OwnerTablePageProps {
  params: Promise<{ table: string }>;
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    branchId?: string;
    [key: string]: string | undefined;
  }>;
}

export default async function OwnerTablePage({
  params,
  searchParams,
}: OwnerTablePageProps) {
  // 1. Authenticate user session
  const session = await validateSession();
  if (!session) {
    redirect("/login");
  }

  // 2. Fetch full user details and check role access
  const dbUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true, branchIds: true },
  });

  const userRole = dbUser?.role || "staff";
  const normUserRole = normalizeRole(userRole);

  // 3. Resolve target table configuration
  const { table } = await params;
  const normalizedTable = table.toLowerCase();
  const config = ownerTablesConfig[normalizedTable];

  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center select-none animate-in fade-in duration-300 px-4">
        <Card className="max-w-md w-full border-border bg-card shadow-lg">
          <CardHeader className="flex flex-col items-center pb-2">
            <CardTitle className="text-xl font-bold text-foreground">
              Table Not Found
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              Invalid Module Requested
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              The table name <span className="font-semibold text-foreground">"{table}"</span> does not match any known security tier modules.
            </p>
            <div className="pt-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Dashboard Overview
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Task 1: Hard owner-only gate (before any RBAC logic) ----
  const sParams = await searchParams;
  const isBreakGlass = sParams?.breakglass === "1";

  if (normUserRole === "tech_admin" && !isBreakGlass) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center select-none animate-in fade-in duration-300 px-4">
        <Card className="max-w-md w-full border-destructive/30 bg-destructive/5 shadow-lg shadow-destructive/5">
          <CardHeader className="flex flex-col items-center pb-2">
            <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-2">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-bold text-destructive">
              Access Restricted
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              Generic table renderer is owner-only.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your role <span className="font-semibold text-foreground capitalize">({userRole})</span> does not have access to view this administration panel.
            </p>
            <div className="pt-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Dashboard Overview
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check RBAC permission for this role and table
  const { checkRBAC } = await import("@/lib/rbac");
  let rbacCheck = checkRBAC(userRole, config.modelName, "read", false);

  if (config.modelName === "tuitionPlan") {
    const isAllowedTuitionPage = ["owner", "office_admin", "smm"].includes(normUserRole) || (normUserRole === "tech_admin" && isBreakGlass);
    if (!isAllowedTuitionPage) {
      rbacCheck = { allowed: false, reason: "Finance, Teacher, and Tech Admin roles are not permitted to access the Tuition Plans management screen." };
    }
  }

  // If not allowed, show the access restricted page
  if (!rbacCheck.allowed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center select-none animate-in fade-in duration-300 px-4">
        <Card className="max-w-md w-full border-destructive/30 bg-destructive/5 shadow-lg shadow-destructive/5">
          <CardHeader className="flex flex-col items-center pb-2">
            <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-2">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-bold text-destructive">
              Access Restricted
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              {rbacCheck.reason}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your role <span className="font-semibold text-foreground capitalize">({userRole})</span> does not have access to view this administration panel.
            </p>
            <div className="pt-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Dashboard Overview
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Extract filterable params for extraFilters
  const extraFilters: Record<string, string> = {};
  config.filterableFields.forEach((f) => {
    const val = sParams[f.key];
    if (val !== undefined && val !== "") {
      extraFilters[f.key] = val;
    }
  });

  // Pass serializable props to client component
  const initialQueryParams = {
    page: sParams.page || "1",
    limit: sParams.limit || "10",
    search: sParams.search || "",
    sortBy: sParams.sortBy || config.defaultSortBy,
    sortOrder: sParams.sortOrder || config.defaultSortOrder,
    branchId: sParams.branchId || "",
    extraFilters,
  };

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-300">
      {/* Breadcrumb & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1">
            <Link href="/dashboard" className="hover:text-primary transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-foreground">Owner Portal</span>
            <span>/</span>
            <span className="text-foreground font-semibold">{config.label}</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            {config.label} Registry
          </h1>
          <p className="text-muted-foreground text-xs mt-0.5">
            System admin access to the {config.label.toLowerCase()} datastore.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 h-8 px-3 rounded-lg border border-border bg-card text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Overview Console
        </Link>
      </div>

      {/* Redux-powered Owner Table with Skeleton */}
      <OwnerTableReduxView
        table={normalizedTable}
        config={config}
        initialQueryParams={initialQueryParams}
      />
    </div>
  );
}