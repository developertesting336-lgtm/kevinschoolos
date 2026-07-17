import Link from "next/link";
import { validateSession } from "@/lib/auth";
import { apiFetch } from "@/lib/apiFetch";
import prisma from "@/lib/prisma";
import { normalizeRole } from "@/lib/roles";
import { AdmissionsClient } from "@/components/dashboard/admissions/AdmissionsClient";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ShieldAlert, ArrowLeft, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default async function AdmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
    branch?: string;
    status?: string;
    owner?: string;
    source?: string;
    trialDate?: string;
  }>;
}) {
  const session = await validateSession();
  const params = await searchParams;

  const currentPage = params.page || "1";
  const search = params.search || "";
  const branch = params.branch || "";
  const status = params.status || "";
  const owner = params.owner || "";
  const source = params.source || "";
  const trialDate = params.trialDate || "";

  // 1. Resolve User and Role
  let dbUser = null;
  if (session?.userId) {
    try {
      dbUser = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, role: true, fullName: true },
      });
    } catch (e) {
      console.error("[Admissions Page User Fetch Error]", e);
    }
  }

  const userRole = normalizeRole(dbUser?.role || "staff");
  const isAuthorized = ["owner", "office_admin", "smm"].includes(userRole);

  // Handle unauthorized or RBAC restricted views
  if (!isAuthorized) {
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
              Insufficient Permissions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your role <span className="font-semibold text-foreground capitalize">({dbUser?.role || "Staff"})</span> does not have permissions to view the Admissions CRM board.
            </p>
            <div className="pt-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline cursor-pointer"
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

  // 2. Build backend query URLs
  let leadUrl = `/api/data/lead?page=${currentPage}&limit=30`;
  if (search) leadUrl += `&search=${encodeURIComponent(search)}`;
  if (branch) leadUrl += `&branch=${encodeURIComponent(branch)}`;
  if (status) leadUrl += `&status=${encodeURIComponent(status)}`;
  if (owner) leadUrl += `&owner=${encodeURIComponent(owner)}`;
  if (source) leadUrl += `&source=${encodeURIComponent(source)}`;
  if (trialDate) leadUrl += `&trialDate=${encodeURIComponent(trialDate)}`;

  // 3. Parallel fetch of scoped records
  let leadsList = [];
  let pagination = { total: 0, page: 1, limit: 30, totalPages: 1 };
  let branchesList = [];
  let usersList = [];
  let parentsList = [];
  let trialsList = [];
  let activitiesList = [];
  let roomsList = [];
  let classGroupsList = [];
  let errorMsg = null;

  try {
    const [
      leadsResponse,
      branchesResponse,
      usersResponse,
      parentsResponse,
      trialsResponse,
      activitiesResponse,
      roomsResponse,
      classGroupsResponse,
    ] = await Promise.all([
      apiFetch(leadUrl),
      apiFetch("/api/data/branch").catch(() => []),
      apiFetch("/api/data/user").catch(() => []),
      apiFetch("/api/data/parent").catch(() => []),
      apiFetch("/api/data/trial").catch(() => []),
      apiFetch("/api/data/activity").catch(() => []),
      apiFetch("/api/data/room").catch(() => []),
      apiFetch("/api/data/classgroup").catch(() => []),
    ]);

    leadsList = (leadsResponse as PaginatedResponse<any>).data || [];
    pagination = (leadsResponse as PaginatedResponse<any>).pagination || pagination;
    branchesList = Array.isArray(branchesResponse) ? branchesResponse : [];
    usersList = Array.isArray(usersResponse) ? usersResponse : [];
    parentsList = Array.isArray(parentsResponse) ? parentsResponse : [];
    trialsList = Array.isArray(trialsResponse) ? trialsResponse : [];
    activitiesList = Array.isArray(activitiesResponse) ? activitiesResponse : [];
    roomsList = Array.isArray(roomsResponse) ? roomsResponse : [];
    classGroupsList = Array.isArray(classGroupsResponse) ? classGroupsResponse : [];
  } catch (error: any) {
    console.error("[Dashboard Admissions Data Fetch Error]", error);
    errorMsg = error.message || "Failed to load admissions dashboard data.";
  }

  if (errorMsg) {
    return (
      <Card className="border-destructive/20 bg-destructive/5 text-destructive p-4 text-sm font-medium">
        {errorMsg}
      </Card>
    );
  }

  // Get unique sources (channels) from leads to supply dropdown filters
  const sources = Array.from(
    new Set(leadsList.map((l: any) => l.channel).filter(Boolean))
  ) as string[];

  // Fallback defaults if no leads or channels exist in database
  if (sources.length === 0) {
    sources.push("Instagram", "Facebook", "Web", "WhatsApp", "Recommendation", "Other");
  }

  return (
    <div className="space-y-8 select-none animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
            <Link href="/dashboard" className="hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Admissions</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-primary" />
            Admissions
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            CRM Dashboard • Track and manage customer inquiry leads, trials, and conversions
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

      {/* Render the Client Dashboard Manager */}
      <AdmissionsClient
        leads={leadsList}
        parents={parentsList}
        users={usersList}
        branches={branchesList}
        trials={trialsList}
        activities={activitiesList}
        rooms={roomsList}
        classGroups={classGroupsList}
        sources={sources}
        pagination={pagination}
      />
    </div>
  );
}
