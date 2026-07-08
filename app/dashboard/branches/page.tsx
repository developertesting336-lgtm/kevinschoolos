import Link from "next/link";
import { validateSession } from "@/lib/auth";
import { apiFetch } from "@/lib/apiFetch";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Building2, ArrowLeft, ShieldAlert } from "lucide-react";

interface BranchData {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  status: string | null;
  notes: string | null;
  openedDate: string | null;
}

export default async function BranchesPage() {
  const session = await validateSession();

  let branchesList: BranchData[] = [];
  let errorMsg = null;
  let isForbidden = false;

  try {
    branchesList = await apiFetch("/api/data/branch");
  } catch (error: any) {
    console.error("[Dashboard Branches Fetch Error]", error);
    errorMsg = error.message || "Failed to load branches data.";
    if (error.message?.includes("403") || error.message?.includes("Forbidden")) {
      isForbidden = true;
    }
  }

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
              Your role <span className="font-semibold text-foreground capitalize">({session?.role || "Staff"})</span> does not have access to view branch information.
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
            <span className="text-foreground font-medium">Branches</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            Branches
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Overview and directory of active school branches
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
          <CardHeader className="border-b border-border py-4 px-6 bg-muted/10">
            <CardTitle className="text-sm font-bold text-foreground">
              ALL BRANCHES ({branchesList.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-muted/20 border-b border-border">
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Branch Name</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">City</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Address</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Phone</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Status</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Opened Date</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border">
                {branchesList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                      No branches found.
                    </TableCell>
                  </TableRow>
                ) : (
                  branchesList.map((branch) => (
                    <TableRow key={branch.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="px-6 py-4 font-semibold text-sm text-foreground">
                        {branch.name}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                        {branch.city || "—"}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate">
                        {branch.address || "—"}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-muted-foreground font-mono">
                        {branch.phone || "—"}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm">
                        <Badge
                          variant="outline"
                          className={
                            branch.status?.toLowerCase() === "active"
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 font-medium capitalize"
                              : "bg-muted text-muted-foreground border-border font-medium capitalize"
                          }
                        >
                          {branch.status || "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                        {branch.openedDate ? new Date(branch.openedDate).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate">
                        {branch.notes || "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
