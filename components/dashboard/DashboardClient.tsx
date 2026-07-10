"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TeacherDashboardClient } from "@/components/dashboard/TeacherDashboardClient";
import { OfficeAdminDashboardClient } from "@/components/dashboard/OfficeAdminDashboardClient";
import { SmmDashboardClient } from "@/components/dashboard/SmmDashboardClient";
import { FinanceDashboardClient } from "@/components/dashboard/FinanceDashboardClient";
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
import {
  Building2,
  Users,
  GraduationCap,
  Calendar,
  Receipt,
  Shield,
  DollarSign,
  TrendingUp,
  Activity,
  ArrowUpRight,
  Database,
  Lock,
  Eye,
} from "lucide-react";

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

interface TeacherData {
  statsData: {
    totalClasses: number;
    activeStudents: number;
    todayClasses: number;
    upcomingSessions: number;
    attendanceRate: number;
    pendingAttendance: number;
    upcomingTrials: number;
  };
  branches: { id: string; name: string }[];
  teacherId: string;
  terms?: any[];
  rooms?: any[];
  courses?: any[];
  recentActivities?: any[];
}

interface OfficeAdminData {
  branches: { id: string; name: string }[];
  terms: any[];
  rooms: any[];
  courses: any[];
  recentActivities: any[];
}

interface SmmData {
  branches: { id: string; name: string }[];
  courses: any[];
  recentActivities: any[];
}

interface FinanceData {
  branches: { id: string; name: string }[];
  invoices: any[];
  payments: any[];
  expenses: any[];
  accounts: any[];
}

export default function DashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Session state
  const [session, setSession] = useState<{ userId: string; role: string } | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const role = normalizeRole(session?.role || "staff");

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [groupData, setGroupData] = useState<GroupData[]>([]);
  const [groupsPagination, setGroupsPagination] = useState({ total: 0, page: 1, limit: 5, totalPages: 1 });
  const [staffList, setStaffList] = useState<StaffData[]>([]);
  const [staffPagination, setStaffPagination] = useState({ total: 0, page: 1, limit: 5, totalPages: 1 });
  const [branchesList, setBranchesList] = useState<BranchData[]>([]);
  const [branchesPagination, setBranchesPagination] = useState({ total: 0, page: 1, limit: 5, totalPages: 1 });
  const [coursesList, setCoursesList] = useState<CourseData[]>([]);
  const [coursesPagination, setCoursesPagination] = useState({ total: 0, page: 1, limit: 5, totalPages: 1 });
  const [teacherData, setTeacherData] = useState<TeacherData | null>(null);
  const [officeAdminData, setOfficeAdminData] = useState<OfficeAdminData | null>(null);
  const [smmData, setSmmData] = useState<SmmData | null>(null);
  const [financeData, setFinanceData] = useState<FinanceData | null>(null);

  const groupsSearch = searchParams.get("groupsSearch") || "";
  const groupsPage = searchParams.get("groupsPage") || "1";
  const staffSearch = searchParams.get("staffSearch") || "";
  const staffPage = searchParams.get("staffPage") || "1";
  const branchesSearch = searchParams.get("branchesSearch") || "";
  const branchesPage = searchParams.get("branchesPage") || "1";
  const coursesSearch = searchParams.get("coursesSearch") || "";
  const coursesPage = searchParams.get("coursesPage") || "1";

  // Define capability flags
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

  // Fetch session on mount
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
          // Session invalid, redirect to login
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

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      // Don't load dashboard data until session is ready
      if (!session || sessionLoading) return;

      try {
        if (role === "teacher" && session?.userId) {
          const teacherRes = await fetch("/api/dashboard/teacher");
          if (teacherRes.ok) {
            const data = await teacherRes.json();
            if (!cancelled) setTeacherData(data);
            setIsLoading(false);
            return;
          }
        }

        if (role === "office_admin" && session?.userId) {
          const [statsRes, officeAdminRes] = await Promise.all([
            fetchStats(),
            fetch("/api/dashboard/office-admin"),
          ]);
          if (statsRes) setStats(statsRes);
          if (officeAdminRes.ok) {
            const data = await officeAdminRes.json();
            if (!cancelled) setOfficeAdminData(data);
          }
          setIsLoading(false);
          return;
        }

        if (role === "smm" && session?.userId) {
          const [statsRes, smmRes] = await Promise.all([
            fetchStats(),
            fetch("/api/dashboard/smm"),
          ]);
          if (statsRes) setStats(statsRes);
          if (smmRes.ok) {
            const data = await smmRes.json();
            if (!cancelled) setSmmData(data);
          }
          setIsLoading(false);
          return;
        }

        if (role === "finance" && session?.userId) {
          const [statsRes, financeRes] = await Promise.all([
            fetchStats(),
            fetch("/api/dashboard/finance"),
          ]);
          if (statsRes) setStats(statsRes);
          if (financeRes.ok) {
            const data = await financeRes.json();
            if (!cancelled) setFinanceData(data);
          }
          setIsLoading(false);
          return;
        }

        // Fetch stats, groups, staff, branches, courses in parallel
        const [statsRes, groupsRes, staffRes, branchesRes, coursesRes] = await Promise.all([
          fetchStats(),
          showGroupsWidget ? fetchGroups(groupsSearch, groupsPage) : Promise.resolve(null),
          showStaffWidget ? fetchStaff(staffSearch, staffPage) : Promise.resolve(null),
          showBranchesWidget ? fetchBranches(branchesSearch, branchesPage) : Promise.resolve(null),
          showCoursesWidget ? fetchCourses(coursesSearch, coursesPage) : Promise.resolve(null),
        ]);

        if (!cancelled) {
          if (statsRes) setStats(statsRes);
          if (groupsRes) {
            setGroupData(groupsRes.data || []);
            setGroupsPagination(groupsRes.pagination || { total: 0, page: 1, limit: 5, totalPages: 1 });
          }
          if (staffRes) {
            setStaffList(staffRes.data || []);
            setStaffPagination(staffRes.pagination || { total: 0, page: 1, limit: 5, totalPages: 1 });
          }
          if (branchesRes) {
            setBranchesList(branchesRes.data || []);
            setBranchesPagination(branchesRes.pagination || { total: 0, page: 1, limit: 5, totalPages: 1 });
          }
          if (coursesRes) {
            setCoursesList(coursesRes.data || []);
            setCoursesPagination(coursesRes.pagination || { total: 0, page: 1, limit: 5, totalPages: 1 });
          }
        }
      } catch (err) {
        console.error("[Dashboard Load Error]", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [role, session, sessionLoading, groupsSearch, groupsPage, staffSearch, staffPage, branchesSearch, branchesPage, coursesSearch, coursesPage, showGroupsWidget, showStaffWidget, showBranchesWidget, showCoursesWidget]);

  if (isLoading) {
    return <LoadingSkeleton role={role} />;
  }

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

  // ----------------------------------------------------
  // OWNER ROLE: Render Premium Enterprise Administration overview
  // ----------------------------------------------------
  if (role === "owner") {
    return (
      <div className="space-y-8 select-none animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary mb-1">
              <Shield className="h-3.5 w-3.5" />
              Central Control Panel
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              Owner Administration Dashboard
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Global system monitoring, database tiers, and compliance management.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-3 py-1 text-xs font-semibold">
              Role: System Owner
            </Badge>
          </div>
        </div>

        {/* Global KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Branches */}
          <Link href="/dashboard/owner/branch" className="block group">
            <Card className="bg-card border-border hover:border-primary/40 hover:shadow-md transition-all duration-300 group-hover:-translate-y-1 h-full cursor-pointer">
              <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
                <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground group-hover:text-primary transition-colors">Branches</span>
                <Building2 className="h-3.5 w-3.5 text-primary/75 group-hover:scale-110 transition-transform" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-extrabold text-foreground">{branchesCount}</div>
                <p className="text-[9px] text-muted-foreground font-medium mt-0.5">Active networks</p>
              </CardContent>
            </Card>
          </Link>

          {/* Students */}
          <Link href="/dashboard/owner/student" className="block group">
            <Card className="bg-card border-border hover:border-primary/40 hover:shadow-md transition-all duration-300 group-hover:-translate-y-1 h-full cursor-pointer">
              <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
                <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground group-hover:text-primary transition-colors">Students</span>
                <GraduationCap className="h-3.5 w-3.5 text-primary/75 group-hover:scale-110 transition-transform" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-extrabold text-foreground">{activeStudents}</div>
                <p className="text-[9px] text-muted-foreground font-medium mt-0.5">{totalStudents} total registered</p>
              </CardContent>
            </Card>
          </Link>

          {/* Staff */}
          <Link href="/dashboard/owner/user" className="block group">
            <Card className="bg-card border-border hover:border-primary/40 hover:shadow-md transition-all duration-300 group-hover:-translate-y-1 h-full cursor-pointer">
              <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
                <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground group-hover:text-primary transition-colors">Staff & Users</span>
                <Users className="h-3.5 w-3.5 text-primary/75 group-hover:scale-110 transition-transform" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-extrabold text-foreground">{totalStaff}</div>
                <p className="text-[9px] text-muted-foreground font-medium mt-0.5">{teachersCount} teachers assigned</p>
              </CardContent>
            </Card>
          </Link>

          {/* Classes */}
          <Link href="/dashboard/owner/classgroup" className="block group">
            <Card className="bg-card border-border hover:border-primary/40 hover:shadow-md transition-all duration-300 group-hover:-translate-y-1 h-full cursor-pointer">
              <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
                <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground group-hover:text-primary transition-colors">Classes</span>
                <Activity className="h-3.5 w-3.5 text-primary/75 group-hover:scale-110 transition-transform" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-extrabold text-foreground">{activeGroups}</div>
                <p className="text-[9px] text-muted-foreground font-medium mt-0.5">{totalGroups} active blocks</p>
              </CardContent>
            </Card>
          </Link>

          {/* Enrollments */}
          <Link href="/dashboard/owner/enrollment" className="block group">
            <Card className="bg-card border-border hover:border-primary/40 hover:shadow-md transition-all duration-300 group-hover:-translate-y-1 h-full cursor-pointer">
              <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
                <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground group-hover:text-primary transition-colors">Enrollments</span>
                <Database className="h-3.5 w-3.5 text-primary/75 group-hover:scale-110 transition-transform" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-extrabold text-foreground">{activeEnrollments}</div>
                <p className="text-[9px] text-muted-foreground font-medium mt-0.5">{totalEnrollments} total processed</p>
              </CardContent>
            </Card>
          </Link>

          {/* Payments */}
          <Link href="/dashboard/owner/payment" className="block group">
            <Card className="bg-card border-border hover:border-primary/40 hover:shadow-md transition-all duration-300 group-hover:-translate-y-1 h-full cursor-pointer">
              <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
                <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground group-hover:text-primary transition-colors">Transactions</span>
                <DollarSign className="h-3.5 w-3.5 text-primary/75 group-hover:scale-110 transition-transform" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-extrabold text-foreground">{recentPayments}</div>
                <p className="text-[9px] text-muted-foreground font-medium mt-0.5">Payments records</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Database Security Tiers Navigation Panel */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Lock className="h-4.5 w-4.5 text-primary" />
            Security Matrix & Database Tiers (26 Tables)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* T1 Financials */}
            <Card className="border-l-4 border-l-amber-500 bg-card border-border shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <Badge className="bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 border-amber-500/20 text-[10px] font-bold">
                    HQ & Financials
                  </Badge>
                  <span className="text-xs font-semibold text-muted-foreground">8 Tables</span>
                </div>
                <CardTitle className="text-base font-bold mt-2 text-foreground">Financial Ledgers & Payroll</CardTitle>
                <CardDescription className="text-xs">
                  Sensitive accounting, transactions ledger lines, royalties calculations, HQ vendors agreements, and teacher payments run records.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {[
                    { label: "Chart of Accounts", path: "account" },
                    { label: "Journal Entries", path: "journalentry", isAppend: true },
                    { label: "Ledger Lines", path: "ledgerline", isAppend: true },
                    { label: "Vendors", path: "vendor" },
                    { label: "Expenses", path: "expense" },
                    { label: "Franchise Royalties", path: "franchiseroyalty" },
                    { label: "Teacher Pay", path: "teacherpay", isComp: true },
                    { label: "Teacher Hours", path: "teacherhours" },
                  ].map((t) => (
                    <Link
                      key={t.path}
                      href={`/dashboard/owner/${t.path}`}
                      className="group flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/40 hover:bg-muted/70 transition-colors"
                    >
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-medium text-foreground truncate">{t.label}</span>
                        {t.isAppend && <span className="text-[8px] text-amber-600 font-bold uppercase tracking-wider">Append-only</span>}
                        {t.isComp && <span className="text-[8px] text-blue-600 font-bold uppercase tracking-wider">Computed fields</span>}
                      </div>
                      <ArrowUpRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* T2 PII Data */}
            <Card className="border-l-4 border-l-blue-500 bg-card border-border shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <Badge className="bg-blue-500/10 text-blue-700 hover:bg-blue-500/15 border-blue-500/20 text-[10px] font-bold">
                    PII Records
                  </Badge>
                  <span className="text-xs font-semibold text-muted-foreground">6 Tables</span>
                </div>
                <CardTitle className="text-base font-bold mt-2 text-foreground">Customer Accounts & PII</CardTitle>
                <CardDescription className="text-xs">
                  User accounts and login details, parent and student profiles containing contact details and medical/academic sensitive remarks.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {[
                    { label: "Users & Staff", path: "user" },
                    { label: "Parents Directory", path: "parent" },
                    { label: "Students Catalog", path: "student" },
                    { label: "Enrollments Registry", path: "enrollment" },
                    { label: "Invoices Ledger", path: "invoice" },
                    { label: "Payments Registry", path: "payment" },
                  ].map((t) => (
                    <Link
                      key={t.path}
                      href={`/dashboard/owner/${t.path}`}
                      className="group flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/40 hover:bg-muted/70 transition-colors"
                    >
                      <span className="text-xs font-medium text-foreground truncate">{t.label}</span>
                      <ArrowUpRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* T3 Operations */}
            <Card className="border-l-4 border-l-emerald-500 bg-card border-border shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 border-emerald-500/20 text-[10px] font-bold">
                    Operations CRM
                  </Badge>
                  <span className="text-xs font-semibold text-muted-foreground">8 Tables</span>
                </div>
                <CardTitle className="text-base font-bold mt-2 text-foreground">Academic Scheduling & CRM</CardTitle>
                <CardDescription className="text-xs">
                  Operational CRM records, term structures, classroom assets, leads pipelines, trials booking, classes assignments, and session attendance metrics.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {[
                    { label: "Terms Calendar", path: "term" },
                    { label: "Rooms & Facilities", path: "room" },
                    { label: "Leads Pipeline", path: "lead" },
                    { label: "Trial Sessions", path: "trial" },
                    { label: "Classes & Groups", path: "classgroup" },
                    { label: "Scheduled Sessions", path: "session" },
                    { label: "Attendance Logs", path: "attendance" },
                    { label: "CRM Activities", path: "activity" },
                  ].map((t) => (
                    <Link
                      key={t.path}
                      href={`/dashboard/owner/${t.path}`}
                      className="group flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/40 hover:bg-muted/70 transition-colors"
                    >
                      <span className="text-xs font-medium text-foreground truncate">{t.label}</span>
                      <ArrowUpRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* T4 Reference */}
            <Card className="border-l-4 border-l-purple-500 bg-card border-border shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <Badge className="bg-purple-500/10 text-purple-700 hover:bg-purple-500/15 border-purple-500/20 text-[10px] font-bold">
                    References & Performance
                  </Badge>
                  <span className="text-xs font-semibold text-muted-foreground">4 Tables</span>
                </div>
                <CardTitle className="text-base font-bold mt-2 text-foreground">Global Catalogs & Analytics</CardTitle>
                <CardDescription className="text-xs">
                  Global branch configuration, courses syllabus directories, pricing/tuition plan tables, and marketing funnel performance analytics.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {[
                    { label: "Branches Config", path: "branch" },
                    { label: "Courses Directory", path: "course" },
                    { label: "Tuition Matrices", path: "tuitionplan" },
                    { label: "Channel Performance", path: "channelperformance", isRO: true },
                  ].map((t) => (
                    <Link
                      key={t.path}
                      href={`/dashboard/owner/${t.path}`}
                      className="group flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/40 hover:bg-muted/70 transition-colors"
                    >
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-medium text-foreground truncate">{t.label}</span>
                        {t.isRO && <span className="text-[8px] text-purple-600 font-bold uppercase tracking-wider">Read-only table</span>}
                      </div>
                      <ArrowUpRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    );
  }

  // ----------------------------------------------------
  // TEACHER ROLE: Render Specialized Teacher Workspace
  // ----------------------------------------------------
  if (role === "teacher") {
    if (!teacherData) {
      return <LoadingSkeleton role={role} />;
    }

    return (
      <div className="space-y-6 select-none animate-in fade-in duration-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1">
              <span>Dashboard</span>
              <span>/</span>
              <span className="text-foreground font-semibold">Teacher Workspace</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Teacher Workspace Console
            </h1>
            <p className="text-muted-foreground text-xs mt-0.5">
              Access your classes, mark student attendance, and coordinate trial sessions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-3 py-1 text-xs font-semibold">
              Role: Teacher
            </Badge>
          </div>
        </div>

        <TeacherDashboardClient
          initialStats={teacherData.statsData}
          branches={teacherData.branches}
          teacherId={teacherData.teacherId}
          terms={teacherData.terms || []}
          rooms={teacherData.rooms || []}
          courses={teacherData.courses || []}
          recentActivities={teacherData.recentActivities || []}
        />
      </div>
    );
  }

  // ----------------------------------------------------
  // OFFICE ADMIN ROLE: Render Scoped Workspace
  // ----------------------------------------------------
  if (role === "office_admin") {
    if (!officeAdminData || !stats) {
      return <LoadingSkeleton role={role} />;
    }

    return (
      <div className="space-y-6 select-none animate-in fade-in duration-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1">
              <span>Dashboard</span>
              <span>/</span>
              <span className="text-foreground font-semibold">Office Admin Workspace</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Office Admin Workspace Console
            </h1>
            <p className="text-muted-foreground text-xs mt-0.5">
              Coordinate branch directories, CRM leads, student records, and class groups.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-3 py-1 text-xs font-semibold">
              Role: Office Admin
            </Badge>
          </div>
        </div>

        <OfficeAdminDashboardClient
          stats={stats as any}
          branches={officeAdminData.branches}
          terms={officeAdminData.terms || []}
          rooms={officeAdminData.rooms || []}
          courses={officeAdminData.courses || []}
          recentActivities={officeAdminData.recentActivities || []}
        />
      </div>
    );
  }

  // ----------------------------------------------------
  // SMM ROLE: Render Scoped Workspace
  // ----------------------------------------------------
  if (role === "smm") {
    if (!smmData || !stats) {
      return <LoadingSkeleton role={role} />;
    }

    return (
      <div className="space-y-6 select-none animate-in fade-in duration-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1">
              <span>Dashboard</span>
              <span>/</span>
              <span className="text-foreground font-semibold">SMM Workspace</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              SMM Workspace Console
            </h1>
            <p className="text-muted-foreground text-xs mt-0.5">
              Manage leads list, scheduled trials, and branch marketing operations.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-3 py-1 text-xs font-semibold">
              Role: Media Manager (SMM)
            </Badge>
          </div>
        </div>

        <SmmDashboardClient
          stats={stats as any}
          courses={smmData.courses || []}
          recentActivities={smmData.recentActivities || []}
        />
      </div>
    );
  }

  // ----------------------------------------------------
  // FINANCE ROLE: Render Scoped Workspace
  // ----------------------------------------------------
  if (role === "finance") {
    if (!financeData || !stats) {
      return <LoadingSkeleton role={role} />;
    }

    return (
      <div className="space-y-6 select-none animate-in fade-in duration-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1">
              <span>Dashboard</span>
              <span>/</span>
              <span className="text-foreground font-semibold">Finance Workspace</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Finance Workspace Console
            </h1>
            <p className="text-muted-foreground text-xs mt-0.5">
              Manage accounting ledgers, invoices, payments, expenses, and branch royalty reports.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-3 py-1 text-xs font-semibold">
              Role: Financial Manager
            </Badge>
          </div>
        </div>

        <FinanceDashboardClient
          stats={stats as any}
          invoices={financeData.invoices || []}
          payments={financeData.payments || []}
          expenses={financeData.expenses || []}
          accounts={financeData.accounts || []}
        />
      </div>
    );
  }

  // ----------------------------------------------------
  // NON-OWNER ROLES: Render Standard Dashboard
  // ----------------------------------------------------
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
        {showStudentsCard && (
          <Link href="/dashboard/students" className="block group">
            <Card className="bg-card border-border hover:border-primary/40 hover:shadow-md transition-all duration-300 group-hover:-translate-y-1 h-full cursor-pointer">
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground group-hover:text-primary transition-colors">
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
          </Link>
        )}

        {showGroupsCard && (
          <Link href="/dashboard/schedule" className="block group">
            <Card className="bg-card border-border hover:border-primary/40 hover:shadow-md transition-all duration-300 group-hover:-translate-y-1 h-full cursor-pointer">
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground group-hover:text-primary transition-colors">
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
          </Link>
        )}

        {showEnrollmentsCard && (
          <Link href="/dashboard/students" className="block group">
            <Card className="bg-card border-border hover:border-primary/40 hover:shadow-md transition-all duration-300 group-hover:-translate-y-1 h-full cursor-pointer">
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground group-hover:text-primary transition-colors">
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
          </Link>
        )}

        {showStaffCard && (
          <Link href="/dashboard/staff" className="block group">
            <Card className="bg-card border-border hover:border-primary/40 hover:shadow-md transition-all duration-300 group-hover:-translate-y-1 h-full cursor-pointer">
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground group-hover:text-primary transition-colors">
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
          </Link>
        )}

        {showBranchesCard && (
          <Link href="/dashboard/branches" className="block group">
            <Card className="bg-card border-border hover:border-primary/40 hover:shadow-md transition-all duration-300 group-hover:-translate-y-1 h-full cursor-pointer">
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground group-hover:text-primary transition-colors">
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
          </Link>
        )}

        {showRoomsCard && (
          <Link href="/dashboard/schedule" className="block group">
            <Card className="bg-card border-border hover:border-primary/40 hover:shadow-md transition-all duration-300 group-hover:-translate-y-1 h-full cursor-pointer">
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground group-hover:text-primary transition-colors">
                  Rooms
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <span className="text-3xl font-extrabold tracking-tight text-foreground">
                  {roomsCount}
                </span>
              </CardContent>
            </Card>
          </Link>
        )}

        {showCoursesCard && (
          <Link href="/dashboard/schedule" className="block group">
            <Card className="bg-card border-border hover:border-primary/40 hover:shadow-md transition-all duration-300 group-hover:-translate-y-1 h-full cursor-pointer">
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground group-hover:text-primary transition-colors">
                  Courses
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <span className="text-3xl font-extrabold tracking-tight text-foreground">
                  {coursesPagination.total}
                </span>
              </CardContent>
            </Card>
          </Link>
        )}

        {showParentsCard && (
          <Link href="/dashboard/students" className="block group">
            <Card className="bg-card border-border hover:border-primary/40 hover:shadow-md transition-all duration-300 group-hover:-translate-y-1 h-full cursor-pointer">
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground group-hover:text-primary transition-colors">
                  Parents
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <span className="text-3xl font-extrabold tracking-tight text-foreground">
                  {parentsCount}
                </span>
              </CardContent>
            </Card>
          </Link>
        )}

        {showPaymentsCard && (
          <Link href="/dashboard/billing" className="block group col-span-2 md:col-span-1 lg:col-span-2">
            <Card className="bg-card border-border hover:border-primary/40 hover:shadow-md transition-all duration-300 group-hover:-translate-y-1 h-full cursor-pointer">
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground group-hover:text-primary transition-colors">
                  Recent Payments
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <span className="text-3xl font-extrabold tracking-tight text-foreground">
                  {recentPayments}
                </span>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      {/* Two Column Widgets */}
      {(showGroupsWidget || showStaffWidget) && (
        <div className={`grid grid-cols-1 ${showGroupsWidget && showStaffWidget ? "lg:grid-cols-2" : ""} gap-6`}>
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

function LoadingSkeleton({ role }: { role: string }) {
  return (
    <div className="space-y-8 select-none animate-pulse">
      <div>
        <div className="h-4 w-48 bg-muted rounded mb-2" />
        <div className="h-8 w-72 bg-muted rounded mb-1" />
        <div className="h-4 w-96 bg-muted rounded" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="bg-card border-border">
            <CardContent className="p-6">
              <div className="h-3 w-20 bg-muted rounded mb-3" />
              <div className="h-8 w-16 bg-muted rounded mb-2" />
              <div className="h-3 w-24 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <Card key={i} className="bg-card border-border">
            <CardHeader className="border-b border-border py-3 px-5">
              <div className="h-4 w-32 bg-muted rounded" />
            </CardHeader>
            <CardContent className="p-5">
              {[1, 2, 3].map((j) => (
                <div key={j} className="flex items-center justify-between py-3 border-b border-border/40 last:border-0">
                  <div className="h-4 w-36 bg-muted rounded" />
                  <div className="h-4 w-16 bg-muted rounded" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

async function fetchStats(): Promise<StatsData | null> {
  try {
    const res = await fetch("/api/dashboard/stats");
    if (res.ok) return res.json();
  } catch {}
  return null;
}

async function fetchGroups(search: string, page: string): Promise<PaginatedResponse<GroupData> | null> {
  try {
    const res = await fetch(`/api/dashboard/groups?search=${encodeURIComponent(search)}&page=${page}&limit=5`);
    if (res.ok) return res.json();
  } catch {}
  return null;
}

async function fetchStaff(search: string, page: string): Promise<PaginatedResponse<StaffData> | null> {
  try {
    const res = await fetch(`/api/dashboard/staff?search=${encodeURIComponent(search)}&page=${page}&limit=5`);
    if (res.ok) return res.json();
  } catch {}
  return null;
}

async function fetchBranches(search: string, page: string): Promise<PaginatedResponse<BranchData> | null> {
  try {
    const res = await fetch(`/api/dashboard/branches?search=${encodeURIComponent(search)}&page=${page}&limit=5`);
    if (res.ok) return res.json();
  } catch {}
  return null;
}

async function fetchCourses(search: string, page: string): Promise<PaginatedResponse<CourseData> | null> {
  try {
    const res = await fetch(`/api/dashboard/courses?search=${encodeURIComponent(search)}&page=${page}&limit=5`);
    if (res.ok) return res.json();
  } catch {}
  return null;
}