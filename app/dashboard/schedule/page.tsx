import Link from "next/link";
import { validateSession } from "@/lib/auth";
import { apiFetch } from "@/lib/apiFetch";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Calendar, ArrowLeft, ShieldAlert, Clock, Layers } from "lucide-react";

interface SessionData {
  id: string;
  sessionId: string;
  dateTime: string | null;
  status: string | null;
  classGroupIds: string[];
  teacherIds: string[];
  branchIds: string[];
}

interface ClassGroupData {
  id: string;
  groupName: string;
  weekdays: string[];
  startTime: string | null;
  capacity: number | null;
  status: string | null;
  courseIds: string[];
  teacherIds: string[];
  roomIds: string[];
  termIds: string[];
  branchIds: string[];
}

interface BranchData {
  id: string;
  name: string;
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await validateSession();
  const { tab } = await searchParams;
  const activeTab = tab || "sessions";

  let sessionsList: SessionData[] = [];
  let classGroupsList: ClassGroupData[] = [];
  let branchesList: BranchData[] = [];
  let errorMsg = null;
  let isForbidden = false;

  try {
    // We always fetch branches for mapping
    branchesList = await apiFetch("/api/data/branch").catch((e) => {
      console.error("Could not fetch branches", e);
      return [];
    });

    if (activeTab === "sessions") {
      // For Sessions tab, fetch sessions and classGroups (for name resolution) in parallel
      const [sessionsRes, groupsRes] = await Promise.all([
        apiFetch("/api/data/session"),
        apiFetch("/api/data/classgroup").catch(() => []),
      ]);
      sessionsList = sessionsRes;
      classGroupsList = groupsRes;
    } else {
      // For Class Groups tab, only fetch class groups
      classGroupsList = await apiFetch("/api/data/classgroup");
    }
  } catch (error: any) {
    console.error(`[Dashboard Schedule Fetch Error] Tab: ${activeTab}`, error);
    errorMsg = error.message || `Failed to load ${activeTab} data.`;
    if (error.message?.includes("403") || error.message?.includes("Forbidden")) {
      isForbidden = true;
    }
  }

  const branchIdToNameMap = new Map(branchesList.map((b) => [b.id, b.name]));
  const groupIdToNameMap = new Map(classGroupsList.map((g) => [g.id, g.groupName]));

  // Handle unauthorized or RBAC restricted views
  if (isForbidden) {
    return (
      <div className="space-y-8 select-none animate-in fade-in duration-300">
        {/* Header (still show basic header & tab selectors so user can switch tabs) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
              <Link href="/dashboard" className="hover:text-foreground transition-colors">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-foreground font-medium">Schedule</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
              <Calendar className="h-8 w-8 text-primary" />
              Schedule
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Academic classes, sessions, and daily schedule
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

        {/* Tab Selection Row */}
        <div className="flex border-b border-border">
          <Link
            href="/dashboard/schedule?tab=sessions"
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "sessions"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="h-4 w-4" />
            Individual Sessions
          </Link>
          <Link
            href="/dashboard/schedule?tab=groups"
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "groups"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-4 w-4" />
            Class Groups
          </Link>
        </div>

        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center px-4">
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
                Your role <span className="font-semibold text-foreground capitalize">({session?.role || "Staff"})</span> does not have access to view {activeTab === "sessions" ? "individual sessions schedule" : "class groups database"}.
              </p>
            </CardContent>
          </Card>
        </div>
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
            <span className="text-foreground font-medium">Schedule</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <Calendar className="h-8 w-8 text-primary" />
            Schedule
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Academic classes, sessions, and daily schedule
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

      {/* Tab Selection Row */}
      <div className="flex border-b border-border">
        <Link
          href="/dashboard/schedule?tab=sessions"
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "sessions"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock className="h-4 w-4" />
          Individual Sessions
        </Link>
        <Link
          href="/dashboard/schedule?tab=groups"
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "groups"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="h-4 w-4" />
          Class Groups
        </Link>
      </div>

      {errorMsg ? (
        <Card className="border-destructive/20 bg-destructive/5 text-destructive p-4 text-sm font-medium">
          {errorMsg}
        </Card>
      ) : activeTab === "sessions" ? (
        /* Sessions Table */
        <Card className="bg-card border-border shadow-md overflow-hidden">
          <CardHeader className="border-b border-border py-4 px-6 bg-muted/10">
            <CardTitle className="text-sm font-bold text-foreground">
              ALL SESSIONS ({sessionsList.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-muted/20 border-b border-border">
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Session ID</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Date & Time</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Status</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Class Group</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Branches</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border">
                {sessionsList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-xs text-muted-foreground">
                      No sessions scheduled.
                    </TableCell>
                  </TableRow>
                ) : (
                  sessionsList.map((sessionItem) => {
                    const groupNames = sessionItem.classGroupIds
                      ?.map((id) => groupIdToNameMap.get(id) || id)
                      .join(", ") || "—";
                    const branchNames = sessionItem.branchIds
                      ?.map((id) => branchIdToNameMap.get(id) || id)
                      .join(", ") || "—";

                    return (
                      <TableRow key={sessionItem.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="px-6 py-4 text-sm font-semibold text-foreground font-mono">
                          {sessionItem.sessionId}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                          {sessionItem.dateTime
                            ? new Date(sessionItem.dateTime).toLocaleString([], {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })
                            : "—"}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm">
                          <Badge
                            variant="outline"
                            className={
                              sessionItem.status?.toLowerCase() === "scheduled" || sessionItem.status?.toLowerCase() === "active"
                                ? "bg-primary/10 border-primary/20 text-primary font-medium capitalize"
                                : sessionItem.status?.toLowerCase() === "completed"
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 font-medium capitalize"
                                : "bg-muted text-muted-foreground border-border font-medium capitalize"
                            }
                          >
                            {sessionItem.status || "Scheduled"}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-muted-foreground font-semibold">
                          {groupNames}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate">
                          {branchNames}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        /* Class Groups Table */
        <Card className="bg-card border-border shadow-md overflow-hidden">
          <CardHeader className="border-b border-border py-4 px-6 bg-muted/10">
            <CardTitle className="text-sm font-bold text-foreground">
              ALL CLASS GROUPS ({classGroupsList.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-muted/20 border-b border-border">
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Group Name</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Weekdays</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Start Time</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Capacity</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Status</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Branches</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border">
                {classGroupsList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                      No class groups found.
                    </TableCell>
                  </TableRow>
                ) : (
                  classGroupsList.map((group) => {
                    const branchNames = group.branchIds
                      ?.map((id) => branchIdToNameMap.get(id) || id)
                      .join(", ") || "—";
                    const formattedWeekdays = group.weekdays?.join(", ") || "—";

                    return (
                      <TableRow key={group.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="px-6 py-4 font-semibold text-sm text-foreground">
                          {group.groupName}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                          {formattedWeekdays}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-muted-foreground font-mono">
                          {group.startTime || "—"}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-muted-foreground font-medium">
                          {group.capacity || "—"} students
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm">
                          <Badge
                            variant="outline"
                            className={
                              group.status?.toLowerCase() === "active"
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 font-medium capitalize"
                                : "bg-muted text-muted-foreground border-border font-medium capitalize"
                            }
                          >
                            {group.status || "Active"}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate" title={branchNames}>
                          {branchNames}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
