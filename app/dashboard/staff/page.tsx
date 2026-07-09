import Link from "next/link";
import { validateSession } from "@/lib/auth";
import { apiFetch } from "@/lib/apiFetch";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Users, ArrowLeft, ShieldAlert } from "lucide-react";
import { SearchInput } from "@/components/dashboard/SearchInput";
import { PaginationControls } from "@/components/dashboard/PaginationControls";

interface UserData {
  id: string;
  fullName: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  workingLanguage: string | null;
  status: string | null;
  branchIds: string[];
}

interface BranchData {
  id: string;
  name: string;
}

interface PaginatedResponse {
  data: UserData[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const session = await validateSession();
  const params = await searchParams;
  const currentPage = params.page || "1";
  const search = params.search || "";

  let staffList: UserData[] = [];
  let branchesList: BranchData[] = [];
  let pagination = { total: 0, page: 1, limit: 10, totalPages: 1 };
  let errorMsg = null;
  let isForbidden = false;

  try {
    // Fetch users and branches in parallel (branches for mapping - unpaginated)
    const [usersResponse, branchesResponse] = await Promise.all([
      apiFetch(`/api/data/user?page=${currentPage}&search=${encodeURIComponent(search)}`),
      apiFetch("/api/data/branch").catch((e) => {
        console.error("Could not fetch branches, returning empty list", e);
        return [];
      }),
    ]);
    staffList = (usersResponse as PaginatedResponse).data;
    pagination = (usersResponse as PaginatedResponse).pagination;
    branchesList = branchesResponse;
  } catch (error: any) {
    console.error("[Dashboard Staff Fetch Error]", error);
    errorMsg = error.message || "Failed to load staff list.";
    if (error.message?.includes("403") || error.message?.includes("Forbidden")) {
      isForbidden = true;
    }
  }

  // Map branchIds to Branch names
  const branchIdToNameMap = new Map(branchesList.map((b) => [b.id, b.name]));

  // Handle unauthorized or RBAC restricted views
  if (isForbidden) {
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
              Your role <span className="font-semibold text-foreground capitalize">({session?.role || "Staff"})</span> does not have access to view staff and user directories.
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
            <span className="text-foreground font-medium">Staff & Users</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            Staff & Users
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Directory of staff, instructors, and system operators
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg border border-border bg-card text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back Overview
        </Link>
      </div>

      {errorMsg ? (
        <Card className="border-destructive/20 bg-destructive/5 text-destructive p-4 text-sm font-medium">
          {errorMsg}
        </Card>
      ) : (
        <Card className="bg-card border-border shadow-md overflow-hidden">
          <CardHeader className="border-b border-border py-3 px-6 bg-muted/10 flex flex-row items-center justify-between space-y-0 gap-4">
            <CardTitle className="text-sm font-bold text-foreground">
              ALL STAFF ({pagination.total})
            </CardTitle>
            <SearchInput placeholder="Search staff..." />
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-muted/20 border-b border-border">
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Full Name</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Role</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Email</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Phone</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Language</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Status</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Assigned Branches</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border">
                {staffList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                      No staff members found.
                    </TableCell>
                  </TableRow>
                ) : (
                  staffList.map((staff) => {
                    const assignedBranches = staff.branchIds
                      ?.map((id) => branchIdToNameMap.get(id) || id)
                      .join(", ") || "—";

                    return (
                      <TableRow key={staff.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="px-6 py-4 font-semibold text-sm text-foreground">
                          {staff.fullName}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm">
                          <Badge
                            variant={
                              staff.role?.toLowerCase() === "owner" || staff.role?.toLowerCase() === "tech_admin"
                                ? "default"
                                : staff.role?.toLowerCase() === "teacher"
                                ? "secondary"
                                : "outline"
                            }
                            className="capitalize"
                          >
                            {staff.role || "Staff"}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                          {staff.email || "—"}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-muted-foreground font-mono">
                          {staff.phone || "—"}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-muted-foreground capitalize">
                          {staff.workingLanguage || "—"}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm">
                          <Badge
                            variant="outline"
                            className={
                              staff.status?.toLowerCase() === "active"
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 font-medium capitalize"
                                : "bg-muted text-muted-foreground border-border font-medium capitalize"
                            }
                          >
                            {staff.status || "Active"}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate" title={assignedBranches}>
                          {assignedBranches}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            <div className="px-6 py-3 border-t border-border bg-muted/5 flex justify-end">
              <PaginationControls
                totalPages={pagination.totalPages}
                currentPage={parseInt(currentPage, 10)}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
