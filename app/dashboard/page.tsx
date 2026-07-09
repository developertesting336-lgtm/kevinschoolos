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
import { SearchInput } from "@/components/dashboard/SearchInput";
import { PaginationControls } from "@/components/dashboard/PaginationControls";
import { normalizeRole } from "@/lib/roles";

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

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    groupsSearch?: string;
    groupsPage?: string;
    staffSearch?: string;
    staffPage?: string;
    branchesSearch?: string;
    branchesPage?: string;
    coursesSearch?: string;
    coursesPage?: string;
  }>;
}) {
  const session = await validateSession();
  const params = await searchParams;

  const groupsSearch = params.groupsSearch || "";
  const groupsPage = params.groupsPage || "1";
  const staffSearch = params.staffSearch || "";
  const staffPage = params.staffPage || "1";
  const branchesSearch = params.branchesSearch || "";
  const branchesPage = params.branchesPage || "1";
  const coursesSearch = params.coursesSearch || "";
  const coursesPage = params.coursesPage || "1";

  const role = normalizeRole(session?.role || "staff");

  // Define capability flags for Overview widgets/cards based on user role
  const showStudentsCard = ["owner", "office_admin", "teacher"].includes(role);
  const showGroupsCard = ["owner", "office_admin", "teacher", "smm"].includes(role);
  const showEnrollmentsCard = ["owner", "office_admin", "teacher"].includes(role);
  const showStaffCard = ["owner", "office_admin"].includes(role);
  const showBranchesCard = ["owner", "office_admin", "teacher", "smm", "finance"].includes(role);
  const showRoomsCard = ["owner", "office_admin"].includes(role);
  const showCoursesCard = ["owner", "office_admin"].includes(role);
  const showParentsCard = ["owner", "office_admin"].includes(role);
  const showPaymentsCard = ["owner", "finance"].includes(role);

  const showGroupsWidget = ["owner", "office_admin", "teacher", "smm"].includes(role);
  const showStaffWidget = ["owner", "office_admin"].includes(role);
  const showBranchesWidget = ["owner", "office_admin", "teacher", "smm"].includes(role);
  const showCoursesWidget = ["owner", "office_admin", "teacher", "smm"].includes(role);

  // Wrap fetches in catch handlers to prevent page crashes on 403 errors
  const [stats, groupsRes, staffRes, branchesRes, coursesRes] = await Promise.all([
    apiFetch("/api/dashboard/stats").catch(() => null),
    showGroupsWidget
      ? apiFetch(`/api/dashboard/groups?search=${encodeURIComponent(groupsSearch)}&page=${groupsPage}&limit=5`).catch(() => null)
      : Promise.resolve(null),
    showStaffWidget
      ? apiFetch(`/api/dashboard/staff?search=${encodeURIComponent(staffSearch)}&page=${staffPage}&limit=5`).catch(() => null)
      : Promise.resolve(null),
    showBranchesWidget
      ? apiFetch(`/api/dashboard/branches?search=${encodeURIComponent(branchesSearch)}&page=${branchesPage}&limit=5`).catch(() => null)
      : Promise.resolve(null),
    showCoursesWidget
      ? apiFetch(`/api/dashboard/courses?search=${encodeURIComponent(coursesSearch)}&page=${coursesPage}&limit=5`).catch(() => null)
      : Promise.resolve(null),
  ]) as [
    StatsData | null,
    PaginatedResponse<GroupData> | null,
    PaginatedResponse<StaffData> | null,
    PaginatedResponse<BranchData> | null,
    PaginatedResponse<CourseData> | null
  ];

  const {
    activeStudents = 0,
    totalStudents = 0,
    activeGroups = 0,
    totalGroups = 0,
    activeEnrollments = 0,
    totalEnrollments = 0,
    totalStaff = 0,
    teachersCount = 0,
    branchesCount = 0,
    roomsCount = 0,
    parentsCount = 0,
    recentPayments = 0,
  } = stats || {};

  const groupData = groupsRes?.data || [];
  const groupsPagination = groupsRes?.pagination || { total: 0, page: 1, limit: 5, totalPages: 1 };

  const staffList = staffRes?.data || [];
  const staffPagination = staffRes?.pagination || { total: 0, page: 1, limit: 5, totalPages: 1 };

  const branchesList = branchesRes?.data || [];
  const branchesPagination = branchesRes?.pagination || { total: 0, page: 1, limit: 5, totalPages: 1 };

  const coursesList = coursesRes?.data || [];
  const coursesPagination = coursesRes?.pagination || { total: 0, page: 1, limit: 5, totalPages: 1 };

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

      {/* Grid of KPI Cards (only render what role is authorized to see) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Active Students */}
        {showStudentsCard && (
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
        )}

        {/* Active Groups */}
        {showGroupsCard && (
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
        )}

        {/* Active Enrollments */}
        {showEnrollmentsCard && (
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
        )}

        {/* Staff */}
        {showStaffCard && (
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
        )}

        {/* Branches */}
        {showBranchesCard && (
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
        )}

        {/* Rooms */}
        {showRoomsCard && (
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
        )}

        {/* Courses */}
        {showCoursesCard && (
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
                Courses
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <span className="text-3xl font-extrabold tracking-tight text-foreground">
                {coursesPagination.total}
              </span>
            </CardContent>
          </Card>
        )}

        {/* Parents */}
        {showParentsCard && (
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
        )}

        {/* Recent Payments */}
        {showPaymentsCard && (
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
        )}
      </div>

      {/* Two Column Widgets */}
      {(showGroupsWidget || showStaffWidget) && (
        <div className={`grid grid-cols-1 ${showGroupsWidget && showStaffWidget ? "lg:grid-cols-2" : ""} gap-6`}>
          {/* Left Widget: Active Groups List */}
          {showGroupsWidget && (
            <Card className="bg-card border-border shadow-md flex flex-col justify-between">
              <div>
                <CardHeader className="border-b border-border py-3 px-5 flex flex-row items-center justify-between space-y-0 gap-4">
                  <CardTitle className="text-sm font-bold text-foreground uppercase whitespace-nowrap">
                    ACTIVE GROUPS ({groupsPagination.total})
                  </CardTitle>
                  <SearchInput placeholder="Search groups..." paramName="groupsSearch" />
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
              </div>
              <div className="px-5 py-2 border-t border-border bg-muted/5 flex justify-end">
                <PaginationControls
                  totalPages={groupsPagination.totalPages}
                  currentPage={parseInt(groupsPage, 10)}
                  paramName="groupsPage"
                />
              </div>
            </Card>
          )}

          {/* Right Widget: Staff Directory */}
          {showStaffWidget && (
            <Card className="bg-card border-border shadow-md flex flex-col justify-between">
              <div>
                <CardHeader className="border-b border-border py-3 px-5 flex flex-row items-center justify-between space-y-0 gap-4">
                  <CardTitle className="text-sm font-bold text-foreground uppercase whitespace-nowrap">
                    STAFF ({staffPagination.total})
                  </CardTitle>
                  <SearchInput placeholder="Search staff..." paramName="staffSearch" />
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
              </div>
              <div className="px-5 py-2 border-t border-border bg-muted/5 flex justify-end">
                <PaginationControls
                  totalPages={staffPagination.totalPages}
                  currentPage={parseInt(staffPage, 10)}
                  paramName="staffPage"
                />
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Row 3: Branches and Courses */}
      {(showBranchesWidget || showCoursesWidget) && (
        <div className={`grid grid-cols-1 ${showBranchesWidget && showCoursesWidget ? "lg:grid-cols-2" : ""} gap-6`}>
          {/* Branches */}
          {showBranchesWidget && (
            <Card className="bg-card border-border shadow-md flex flex-col justify-between">
              <div>
                <CardHeader className="border-b border-border py-3 px-5 flex flex-row items-center justify-between space-y-0 gap-4">
                  <CardTitle className="text-sm font-bold text-foreground uppercase whitespace-nowrap">
                    BRANCHES ({branchesPagination.total})
                  </CardTitle>
                  <SearchInput placeholder="Search branches..." paramName="branchesSearch" />
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {branchesList.length === 0 ? (
                      <div className="p-6 text-center text-xs text-muted-foreground">
                        No branches found.
                      </div>
                    ) : (
                      branchesList.map((branch) => (
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
                      ))
                    )}
                  </div>
                </CardContent>
              </div>
              <div className="px-5 py-2 border-t border-border bg-muted/5 flex justify-end">
                <PaginationControls
                  totalPages={branchesPagination.totalPages}
                  currentPage={parseInt(branchesPage, 10)}
                  paramName="branchesPage"
                />
              </div>
            </Card>
          )}

          {/* Courses */}
          {showCoursesWidget && (
            <Card className="bg-card border-border shadow-md flex flex-col justify-between">
              <div>
                <CardHeader className="border-b border-border py-3 px-5 flex flex-row items-center justify-between space-y-0 gap-4">
                  <CardTitle className="text-sm font-bold text-foreground uppercase whitespace-nowrap">
                    COURSES ({coursesPagination.total})
                  </CardTitle>
                  <SearchInput placeholder="Search courses..." paramName="coursesSearch" />
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-62.5 overflow-y-auto divide-y divide-border">
                    {coursesList.length === 0 ? (
                      <div className="p-6 text-center text-xs text-muted-foreground">
                        No courses found.
                      </div>
                    ) : (
                      coursesList.map((course) => (
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
                      ))
                    )}
                  </div>
                </CardContent>
              </div>
              <div className="px-5 py-2 border-t border-border bg-muted/5 flex justify-end">
                <PaginationControls
                  totalPages={coursesPagination.totalPages}
                  currentPage={parseInt(coursesPage, 10)}
                  paramName="coursesPage"
                />
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
