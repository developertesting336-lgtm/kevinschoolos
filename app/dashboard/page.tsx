import { validateSession } from "@/lib/auth";
import { apiFetch } from "@/lib/apiFetch";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface GroupData {
  id: string;
  name: string;
  studentCount: number;
  capacity: number;
}

interface StaffData {
  id: string;
  fullName: string;
  workingLanguage: string | null;
  role: string | null;
}

interface BranchData {
  id: string;
  name: string;
  city: string | null;
}

interface CourseData {
  id: string;
  courseName: string;
  nameRussian: string | null;
  defaultCapacity: number | null;
}

interface StatsData {
  activeStudents: number;
  totalStudents: number;
  activeGroups: number;
  totalGroups: number;
  activeEnrollments: number;
  totalEnrollments: number;
  totalStaff: number;
  teachersCount: number;
  branchesCount: number;
  roomsCount: number;
  parentsCount: number;
  recentPayments: number;
}

interface CoursesResponse {
  count: number;
  courses: CourseData[];
}

export default async function DashboardPage() {
  const session = await validateSession();

  // Fetch all dashboard data from API endpoints in parallel
  const [stats, groupData, staffList, branchesList, coursesData] = await Promise.all([
    apiFetch("/api/dashboard/stats"),
    apiFetch("/api/dashboard/groups"),
    apiFetch("/api/dashboard/staff"),
    apiFetch("/api/dashboard/branches"),
    apiFetch("/api/dashboard/courses"),
  ]) as [StatsData, GroupData[], StaffData[], BranchData[], CoursesResponse];

  const {
    activeStudents,
    totalStudents,
    activeGroups,
    totalGroups,
    activeEnrollments,
    totalEnrollments,
    totalStaff,
    teachersCount,
    branchesCount,
    roomsCount,
    parentsCount,
    recentPayments,
  } = stats;

  const { count: coursesCount, courses: coursesList } = coursesData;

  return (
    <div className="space-y-8 select-none animate-in fade-in duration-300">
      {/* Dashboard Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground capitalize">
          {session?.role || "Staff"} Dashboard
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Full system overview and management
        </p>
      </div>

      {/* Grid of KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Active Students */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
              Active Students
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-3xl font-extrabold tracking-tight text-foreground">
              {activeStudents}
            </span>
            <div className="text-[10px] text-muted-foreground font-medium mt-1">
              {totalStudents} total
            </div>
          </CardContent>
        </Card>

        {/* Active Groups */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
              Active Groups
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-3xl font-extrabold tracking-tight text-foreground">
              {activeGroups}
            </span>
            <div className="text-[10px] text-muted-foreground font-medium mt-1">
              {totalGroups - activeGroups} finished
            </div>
          </CardContent>
        </Card>

        {/* Active Enrollments */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
              Active Enrollments
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-3xl font-extrabold tracking-tight text-foreground">
              {activeEnrollments}
            </span>
            <div className="text-[10px] text-muted-foreground font-medium mt-1">
              {totalEnrollments - activeEnrollments} completed
            </div>
          </CardContent>
        </Card>

        {/* Staff */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
              Staff
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-3xl font-extrabold tracking-tight text-foreground">
              {totalStaff}
            </span>
            <div className="text-[10px] text-muted-foreground font-medium mt-1">
              {teachersCount} teachers
            </div>
          </CardContent>
        </Card>

        {/* Branches */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
              Branches
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-3xl font-extrabold tracking-tight text-foreground">
              {branchesCount}
            </span>
            <div className="text-[10px] text-muted-foreground font-medium mt-1">
              Active branches
            </div>
          </CardContent>
        </Card>

        {/* Rooms */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
              Rooms
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-3xl font-extrabold tracking-tight text-foreground">
              {roomsCount}
            </span>
          </CardContent>
        </Card>

        {/* Courses */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
              Courses
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-3xl font-extrabold tracking-tight text-foreground">
              {coursesCount}
            </span>
          </CardContent>
        </Card>

        {/* Parents */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
              Parents
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-3xl font-extrabold tracking-tight text-foreground">
              {parentsCount}
            </span>
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card className="bg-card border-border shadow-sm col-span-2 md:col-span-1 lg:col-span-2">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
              Recent Payments
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-3xl font-extrabold tracking-tight text-foreground">
              {recentPayments}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Widget: Active Groups List */}
        <Card className="bg-card border-border shadow-md">
          <CardHeader className="border-b border-border py-4 px-5">
            <CardTitle className="text-sm font-bold text-foreground">
              ACTIVE GROUPS ({groupData.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-87.5 overflow-y-auto divide-y divide-border">
              {groupData.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No active groups loaded.
                </div>
              ) : (
                groupData.map((group) => (
                  <div
                    key={group.id}
                    className="px-5 py-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors"
                  >
                    <span className="text-sm font-semibold text-foreground">
                      {group.name}
                    </span>
                    <span className="text-xs text-muted-foreground font-semibold">
                      {group.studentCount}/{group.capacity} students
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Widget: Staff Directory */}
        <Card className="bg-card border-border shadow-md">
          <CardHeader className="border-b border-border py-4 px-5">
            <CardTitle className="text-sm font-bold text-foreground">
              STAFF ({staffList.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-87.5 overflow-y-auto divide-y divide-border">
              {staffList.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No staff directory found.
                </div>
              ) : (
                staffList.map((staff) => (
                  <div
                    key={staff.id}
                    className="px-5 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-semibold text-foreground">
                        {staff.fullName}
                      </span>
                      <span className="text-[10px] text-muted-foreground capitalize mt-0.5">
                        {staff.workingLanguage || "No Language Assigned"}
                      </span>
                    </div>
                    <Badge
                      variant={
                        staff.role?.toLowerCase() === "teacher"
                          ? "default"
                          : "secondary"
                      }
                      className="capitalize"
                    >
                      {staff.role}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Branches and Courses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Branches */}
        <Card className="bg-card border-border shadow-md">
          <CardHeader className="border-b border-border py-4 px-5">
            <CardTitle className="text-sm font-bold text-foreground">
              BRANCHES ({branchesList.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {branchesList.map((branch) => (
                <div
                  key={branch.id}
                  className="px-5 py-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors"
                >
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-semibold text-foreground">
                      {branch.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      {branch.city || "No City"}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                  >
                    Active
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Courses */}
        <Card className="bg-card border-border shadow-md">
          <CardHeader className="border-b border-border py-4 px-5">
            <CardTitle className="text-sm font-bold text-foreground">
              COURSES ({coursesCount})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-62.5 overflow-y-auto divide-y divide-border">
              {coursesList.map((course) => (
                <div
                  key={course.id}
                  className="px-5 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
                >
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-semibold text-foreground">
                      {course.courseName}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      {course.nameRussian || "No Translation"}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">
                    Capacity: {course.defaultCapacity || 8}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
