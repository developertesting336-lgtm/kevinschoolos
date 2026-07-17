"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { normalizeRole } from "@/lib/roles";
import {
  LayoutDashboard,
  Building2,
  Users,
  GraduationCap,
  Calendar,
  Receipt,
  LogOut,
  Landmark,
  BookOpen,
  ListTodo,
  Truck,
  CreditCard,
  Percent,
  DollarSign,
  Clock,
  UserCheck,
  UserPlus,
  FileText,
  Wallet,
  CalendarRange,
  DoorOpen,
  PhoneCall,
  Play,
  FileCheck,
  Activity,
  TrendingUp,
  Award,
  ClipboardCheck,
  Bell,
  Shield,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";

const navItems = [
  {
    title: "Overview",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Branches",
    url: "/dashboard/branches",
    icon: Building2,
  },
  {
    title: "Staff & Users",
    url: "/dashboard/staff",
    icon: Users,
  },
  {
    title: "Students",
    url: "/dashboard/students",
    icon: GraduationCap,
  },
  {
    title: "Schedule",
    url: "/dashboard/schedule",
    icon: Calendar,
  },
  {
    title: "Billing",
    url: "/dashboard/billing",
    icon: Receipt,
  },
  {
    title: "Schema Diagnostics",
    url: "/dashboard/admin/schema-diagnostics",
    icon: Shield,
  },
];

const ownerGroups = [
  {
    label: "PII Data (T2)",
    items: [
      { title: "Users", url: "/dashboard/owner/user", icon: Users },
      { title: "Parents", url: "/dashboard/owner/parent", icon: UserCheck },
      { title: "Students", url: "/dashboard/owner/student", icon: GraduationCap },
      { title: "Enrollments", url: "/dashboard/owner/enrollment", icon: UserPlus },
      { title: "Invoices", url: "/dashboard/owner/invoice", icon: FileText },
      { title: "Payments", url: "/dashboard/owner/payment", icon: Wallet },
      { title: "Notifications Center", url: "/dashboard/notifications", icon: Bell },
    ],
  },
  {
    label: "Operations (T3)",
    items: [
      { title: "Admissions", url: "/dashboard/admissions", icon: LayoutDashboard },
      { title: "Onboarding", url: "/dashboard/onboarding", icon: ClipboardCheck },
      { title: "Payments & Receipts", url: "/dashboard/payments", icon: Wallet },
      { title: "Terms", url: "/dashboard/owner/term", icon: CalendarRange },
      { title: "Rooms", url: "/dashboard/owner/room", icon: DoorOpen },
      { title: "Leads", url: "/dashboard/owner/lead", icon: PhoneCall },
      { title: "Trials", url: "/dashboard/owner/trial", icon: Play },
      { title: "Classes", url: "/dashboard/owner/classgroup", icon: Users },
      { title: "Sessions", url: "/dashboard/owner/session", icon: Calendar },
      { title: "Attendance", url: "/dashboard/owner/attendance", icon: FileCheck },
      { title: "Activities", url: "/dashboard/owner/activity", icon: Activity },
    ],
  },
  {
    label: "Financial Data (T1)",
    items: [
      { title: "Finance Console", url: "/dashboard/finance", icon: Landmark },
    ],
  },
  {
    label: "Reference & Analytics (T4)",
    items: [
      { title: "Branches", url: "/dashboard/owner/branch", icon: Building2 },
      { title: "Courses", url: "/dashboard/owner/course", icon: Award },
      { title: "Tuition Plans", url: "/dashboard/owner/tuitionplan", icon: Receipt },
      { title: "Channel Performance", url: "/dashboard/channel-performance", icon: TrendingUp },
      { title: "Schema Diagnostics", url: "/dashboard/admin/schema-diagnostics", icon: Shield },
    ],
  },
];

const teacherGroups = [
  {
    label: "My Students & CRM",
    items: [
      { title: "Students", url: "/dashboard/owner/student", icon: GraduationCap },
      { title: "Enrollments", url: "/dashboard/owner/enrollment", icon: UserPlus },
      { title: "Assigned Leads", url: "/dashboard/owner/lead", icon: PhoneCall },
    ],
  },
  {
    label: "Academic & Scheduling",
    items: [
      { title: "Classes", url: "/dashboard/owner/classgroup", icon: Users },
      { title: "Sessions", url: "/dashboard/owner/session", icon: Calendar },
      { title: "Attendance", url: "/dashboard/owner/attendance", icon: FileCheck },
      { title: "Trials", url: "/dashboard/owner/trial", icon: Play },
      { title: "Activities", url: "/dashboard/owner/activity", icon: Activity },
    ],
  },
  {
    label: "School & Directory",
    items: [
      { title: "Branches", url: "/dashboard/owner/branch", icon: Building2 },
      { title: "Courses", url: "/dashboard/owner/course", icon: Award },
      { title: "Terms", url: "/dashboard/owner/term", icon: CalendarRange },
      { title: "Rooms", url: "/dashboard/owner/room", icon: DoorOpen },
    ],
  },
];

const officeAdminGroups = [
  {
    label: "PII Data (T2)",
    items: [
      { title: "Users", url: "/dashboard/owner/user", icon: Users },
      { title: "Parents", url: "/dashboard/owner/parent", icon: UserCheck },
      { title: "Students", url: "/dashboard/owner/student", icon: GraduationCap },
      { title: "Enrollments", url: "/dashboard/owner/enrollment", icon: UserPlus },
      { title: "Invoices", url: "/dashboard/owner/invoice", icon: FileText },
      { title: "Payments", url: "/dashboard/owner/payment", icon: Wallet },
      { title: "Notifications Center", url: "/dashboard/notifications", icon: Bell },
    ],
  },
  {
    label: "Operations (T3)",
    items: [
      { title: "Admissions", url: "/dashboard/admissions", icon: LayoutDashboard },
      { title: "Onboarding", url: "/dashboard/onboarding", icon: ClipboardCheck },
      { title: "Payments & Receipts", url: "/dashboard/payments", icon: Wallet },
      { title: "Terms", url: "/dashboard/owner/term", icon: CalendarRange },
      { title: "Rooms", url: "/dashboard/owner/room", icon: DoorOpen },
      { title: "Leads", url: "/dashboard/owner/lead", icon: PhoneCall },
      { title: "Trials", url: "/dashboard/owner/trial", icon: Play },
      { title: "Classes", url: "/dashboard/owner/classgroup", icon: Users },
      { title: "Sessions", url: "/dashboard/owner/session", icon: Calendar },
      { title: "Attendance", url: "/dashboard/owner/attendance", icon: FileCheck },
      { title: "Activities", url: "/dashboard/owner/activity", icon: Activity },
    ],
  },
  {
    label: "Reference & Analytics (T4)",
    items: [
      { title: "Branches", url: "/dashboard/owner/branch", icon: Building2 },
      { title: "Courses", url: "/dashboard/owner/course", icon: Award },
      { title: "Tuition Plans", url: "/dashboard/owner/tuitionplan", icon: Receipt },
      { title: "Channel Performance", url: "/dashboard/channel-performance", icon: TrendingUp },
    ],
  },
];

const smmGroups = [
  {
    label: "CRM & Operations",
    items: [
      { title: "Admissions", url: "/dashboard/admissions", icon: LayoutDashboard },
      { title: "Leads", url: "/dashboard/owner/lead", icon: PhoneCall },
      { title: "Trials", url: "/dashboard/owner/trial", icon: Play },
      { title: "Activities", url: "/dashboard/owner/activity", icon: Activity },
    ],
  },
  {
    label: "Reference & Analytics",
    items: [
      { title: "Branches", url: "/dashboard/owner/branch", icon: Building2 },
      { title: "Courses", url: "/dashboard/owner/course", icon: Award },
      { title: "Tuition Plans", url: "/dashboard/owner/tuitionplan", icon: Receipt },
      { title: "Channel Performance", url: "/dashboard/channel-performance", icon: TrendingUp },
    ],
  },
];

const financeGroups = [
  {
    label: "Financial Registry (T1)",
    items: [
      { title: "Finance Console", url: "/dashboard/finance", icon: Landmark },
    ],
  },
  {
    label: "Student & Billing (T2)",
    items: [
      { title: "Students", url: "/dashboard/owner/student", icon: GraduationCap },
      { title: "Enrollments", url: "/dashboard/owner/enrollment", icon: UserPlus },
      { title: "Invoices", url: "/dashboard/owner/invoice", icon: FileText },
      { title: "Payments", url: "/dashboard/owner/payment", icon: Wallet },
      { title: "Payments Module", url: "/dashboard/payments", icon: Wallet },
    ],
  },
  {
    label: "Academic & Reference (T4)",
    items: [
      { title: "Branches", url: "/dashboard/owner/branch", icon: Building2 },
      { title: "Courses", url: "/dashboard/owner/course", icon: Award },
      { title: "Tuition Plans", url: "/dashboard/owner/tuitionplan", icon: Receipt },
    ],
  },
];

interface AppSidebarProps {
  user: {
    name: string;
    email: string;
    role?: string | null;
  };
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const initial = user.name ? user.name.charAt(0).toUpperCase() : "U";
  const userRole = normalizeRole(user.role || "staff");

  // Define allowed nav items per role
  const rolePermissions: Record<string, string[]> = {
    owner: ["Overview", "Branches", "Staff & Users", "Students", "Schedule", "Billing", "Schema Diagnostics"],
    finance: ["Overview", "Billing"],
    office_admin: ["Overview", "Branches", "Staff & Users", "Students", "Schedule", "Billing"],
    teacher: ["Overview", "Branches", "Students", "Schedule"],
    smm: ["Overview", "Branches", "Students", "Schedule"],
    tech_admin: ["Overview", "Schema Diagnostics"],
  };

  const allowedTitles = rolePermissions[userRole] || ["Overview"];
  const filteredNavItems = navItems.filter((item) => allowedTitles.includes(item.title));

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-card">
      <SidebarHeader className="h-14 border-b border-border px-4 group-data-[collapsible=icon]:px-0 flex flex-row items-center justify-start group-data-[collapsible=icon]:justify-center gap-3 shrink-0">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center font-extrabold text-white text-sm shadow-md shadow-primary/20 select-none shrink-0">
          HD
        </div>
        <div className="flex flex-col group-data-[collapsible=icon]:hidden overflow-hidden">
          <span className="font-bold text-sm tracking-tight text-foreground truncate">
            Helen Doron
          </span>
          <span className="text-[10px] text-muted-foreground font-medium truncate">
            School OS
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2">
        {userRole === "owner" || userRole === "teacher" || userRole === "office_admin" || userRole === "smm" || userRole === "finance" ? (
          <>
            {/* Overview Item */}
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={pathname === "/dashboard"}
                      tooltip="Overview"
                      render={
                        <Link href="/dashboard">
                          <LayoutDashboard className="h-4 w-4 shrink-0" />
                          <span className="group-data-[collapsible=icon]:hidden truncate">
                            Overview
                          </span>
                        </Link>
                      }
                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${pathname === "/dashboard"
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                    />
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Loop through Groups */}
            {(userRole === "owner" ? ownerGroups : userRole === "office_admin" ? officeAdminGroups : userRole === "smm" ? smmGroups : userRole === "finance" ? financeGroups : teacherGroups).map((group) => (
              <SidebarGroup key={group.label} className="py-1">
                <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75 mb-1.5 mt-1">
                  {group.label}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => {
                      const isActive = pathname === item.url;
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            isActive={isActive}
                            tooltip={item.title}
                            render={
                              <Link href={item.url}>
                                <item.icon className="h-4 w-4 shrink-0" />
                                <span className="group-data-[collapsible=icon]:hidden truncate">
                                  {item.title}
                                </span>
                              </Link>
                            }
                            className={`w-full flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${isActive
                                ? "bg-primary/10 text-primary font-semibold"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              }`}
                          />
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </>
        ) : (
          <SidebarGroup>
            <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75 mb-2">
              Platform
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredNavItems.map((item) => {
                  const isActive = pathname === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.title}
                        render={
                          <Link href={item.url}>
                            <item.icon className="h-4 w-4 shrink-0" />
                            <span className="group-data-[collapsible=icon]:hidden truncate">
                              {item.title}
                            </span>
                          </Link>
                        }
                        className={`w-full flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${isActive
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                      />
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-4 group-data-[collapsible=icon]:p-2 flex flex-row items-center justify-between gap-2 group-data-[collapsible=icon]:justify-center">
        <div className="flex items-center gap-3 overflow-hidden group-data-[collapsible=icon]:hidden">
          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs select-none shrink-0 uppercase border border-primary/20">
            {initial}
          </div>
          <div className="flex flex-col overflow-hidden text-left">
            <span className="text-xs font-semibold text-foreground truncate">
              {user.name}
            </span>
            <span className="text-[10px] text-muted-foreground truncate">
              {user.email}
            </span>
          </div>
        </div>

        <form action="/api/auth/logout" method="POST" className="shrink-0">
          <button
            type="submit"
            title="Sign Out"
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive active:bg-destructive/20 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </SidebarFooter>
    </Sidebar>
  );
}
