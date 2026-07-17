import Link from "next/link";
import { validateSession } from "@/lib/auth";
import { apiFetch } from "@/lib/apiFetch";
import prisma from "@/lib/prisma";
import { normalizeRole } from "@/lib/roles";
import { OnboardingClient } from "@/components/dashboard/onboarding/OnboardingClient";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ShieldAlert, ArrowLeft, ClipboardCheck } from "lucide-react";

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

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
    branch?: string;
    onboardingStatus?: string;
    owner?: string;
    enrollDate?: string;
  }>;
}) {
  const session = await validateSession();
  const params = await searchParams;

  const currentPage = params.page || "1";
  const search = params.search || "";
  const branch = params.branch || "";
  const onboardingStatus = params.onboardingStatus || "";
  const owner = params.owner || "";
  const enrollDate = params.enrollDate || "";

  // 1. Resolve User details and Role
  let dbUser = null;
  if (session?.userId) {
    try {
      dbUser = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, role: true, fullName: true },
      });
    } catch (e) {
      console.error("[Onboarding Page User Fetch Error]", e);
    }
  }

  const userRole = normalizeRole(dbUser?.role || "staff");
  const isAuthorized = ["owner", "office_admin"].includes(userRole);

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
              Your role <span className="font-semibold text-foreground capitalize">({dbUser?.role || "Staff"})</span> does not have permission to view the Onboarding Tracker.
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

  // 2. Build API URL with server-side filters
  let enrollmentUrl = `/api/data/enrollment?page=${currentPage}&limit=30`;
  if (search) enrollmentUrl += `&search=${encodeURIComponent(search)}`;
  if (branch) enrollmentUrl += `&branch=${encodeURIComponent(branch)}`;
  if (onboardingStatus) enrollmentUrl += `&onboardingStatus=${encodeURIComponent(onboardingStatus)}`;
  if (owner) enrollmentUrl += `&owner=${encodeURIComponent(owner)}`;
  if (enrollDate) enrollmentUrl += `&enrollDate=${encodeURIComponent(enrollDate)}`;

  // 3. Parallel fetch of scoped records
  let enrollmentsList = [];
  let pagination = { total: 0, page: 1, limit: 30, totalPages: 1 };
  let studentsList = [];
  let parentsList = [];
  let usersList = [];
  let branchesList = [];
  let coursesList = [];
  let classGroupsList = [];
  let errorMsg = null;

  try {
    const [
      enrollmentsResponse,
      studentsResponse,
      parentsResponse,
      usersResponse,
      branchesResponse,
      coursesResponse,
      classGroupsResponse,
    ] = await Promise.all([
      apiFetch(enrollmentUrl),
      apiFetch("/api/data/student").catch(() => []),
      apiFetch("/api/data/parent").catch(() => []),
      apiFetch("/api/data/user").catch(() => []),
      apiFetch("/api/data/branch").catch(() => []),
      apiFetch("/api/data/course").catch(() => []),
      apiFetch("/api/data/classgroup").catch(() => []),
    ]);

    enrollmentsList = (enrollmentsResponse as PaginatedResponse<any>).data || [];
    pagination = (enrollmentsResponse as PaginatedResponse<any>).pagination || pagination;
    studentsList = Array.isArray(studentsResponse) ? studentsResponse : [];
    parentsList = Array.isArray(parentsResponse) ? parentsResponse : [];
    usersList = Array.isArray(usersResponse) ? usersResponse : [];
    branchesList = Array.isArray(branchesResponse) ? branchesResponse : [];
    coursesList = Array.isArray(coursesResponse) ? coursesResponse : [];
    classGroupsList = Array.isArray(classGroupsResponse) ? classGroupsResponse : [];
  } catch (error: any) {
    console.error("[Dashboard Onboarding Data Fetch Error]", error);
    errorMsg = error.message || "Failed to load onboarding tracker data.";
  }

  if (errorMsg) {
    return (
      <Card className="border-destructive/20 bg-destructive/5 text-destructive p-4 text-sm font-medium">
        {errorMsg}
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
      <OnboardingClient
        enrollments={enrollmentsList}
        students={studentsList}
        parents={parentsList}
        users={usersList}
        branches={branchesList}
        courses={coursesList}
        classGroups={classGroupsList}
        pagination={pagination}
      />
    </div>
  );
}
