"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  GraduationCap,
  Calendar,
  Receipt,
  RefreshCw,
  LogOut,
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
];

interface AppSidebarProps {
  user: {
    name: string;
    email: string;
  };
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const initial = user.name ? user.name.charAt(0).toUpperCase() : "U";

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
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75 mb-2">
            Platform
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
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
                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                        isActive
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

        {/* <SidebarGroup className="mt-auto">
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75 mb-2">
            Maintenance
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Sync Data"
                  render={
                    <Link href="/api/sync" target="_blank">
                      <RefreshCw className="h-4 w-4 shrink-0" />
                      <span className="group-data-[collapsible=icon]:hidden truncate">
                        Airtable Sync
                      </span>
                    </Link>
                  }
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup> */}
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
