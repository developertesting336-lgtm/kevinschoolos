"use client";

import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserCheck,
  UserPlus,
  GraduationCap,
  FileText,
  Wallet,
  CalendarRange,
  DoorOpen,
  PhoneCall,
  Play,
  Layers,
  Calendar,
  FileCheck,
  Activity,
  Building2,
  Award,
  Receipt,
  TrendingUp,
  FolderOpen,
  ChevronRight
} from "lucide-react";

interface OfficeAdminDashboardClientProps {
  stats: {
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
    coursesCount: number;
    parentsCount: number;
    recentPayments: number;
    invoicesCount?: number;
    leadsCount?: number;
    trialsCount?: number;
  };
  branches: { id: string; name: string }[];
  terms: any[];
  rooms: any[];
  courses: any[];
  recentActivities: any[];
}

export function OfficeAdminDashboardClient({
  stats,
  branches,
  terms,
  rooms,
  courses,
  recentActivities
}: OfficeAdminDashboardClientProps) {
  const branchMap = new Map(branches.map((b) => [b.id, b.name]));

  // Security directories grouping
  const registryTiers = [
    {
      title: "PII Registry Tiers (T2)",
      description: "Personal and billing records scoping",
      color: "border-blue-500/25 bg-blue-500/5",
      textColor: "text-blue-600",
      items: [
        { name: "Users & Staff", url: "/dashboard/owner/user", count: stats.totalStaff, icon: Users },
        { name: "Parents Registry", url: "/dashboard/owner/parent", count: stats.parentsCount, icon: UserCheck },
        { name: "Active Students", url: "/dashboard/owner/student", count: stats.activeStudents, icon: GraduationCap },
        { name: "Enrollment Logs", url: "/dashboard/owner/enrollment", count: stats.totalEnrollments, icon: UserPlus },
        { name: "Invoices Billing", url: "/dashboard/owner/invoice", count: stats.invoicesCount || 0, icon: FileText },
        { name: "Payments Received", url: "/dashboard/payments", count: stats.recentPayments, icon: Wallet },
      ],
    },
    {
      title: "Operations & Scheduling (T3)",
      description: "CRM tracking, calendar terms, and class groups",
      color: "border-purple-500/25 bg-purple-500/5",
      textColor: "text-purple-600",
      items: [
        { name: "Academic Terms", url: "/dashboard/owner/term", count: terms.length, icon: CalendarRange },
        { name: "Branch Classrooms", url: "/dashboard/owner/room", count: stats.roomsCount, icon: DoorOpen },
        { name: "CRM Leads", url: "/dashboard/owner/lead", count: stats.leadsCount || 0, icon: PhoneCall },
        { name: "Trials Booked", url: "/dashboard/owner/trial", count: stats.trialsCount || 0, icon: Play },
        { name: "Class Groups", url: "/dashboard/owner/classgroup", count: stats.totalGroups, icon: Layers },
      ],
    },
    {
      title: "Reference & Analytics (T4 / T4-RO)",
      description: "Branches, catalog, tuition options, and conversions",
      color: "border-emerald-500/25 bg-emerald-500/5",
      textColor: "text-emerald-600",
      items: [
        { name: "School Branches", url: "/dashboard/owner/branch", count: stats.branchesCount, icon: Building2 },
        { name: "Courses Catalog", url: "/dashboard/owner/course", count: stats.coursesCount, icon: Award },
        { name: "Tuition Plans", url: "/dashboard/owner/tuitionplan", count: null, icon: Receipt },
        { name: "Performance Charts", url: "/dashboard/owner/channelperformance", count: null, icon: TrendingUp },
      ],
    },
  ];

  return (
    <div className="space-y-8 select-none animate-in fade-in duration-300">
      {/* 8 Stats Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Active Students */}
        <Link href="/dashboard/owner/student" className="block group">
          <Card className="bg-card border-border hover:border-primary/45 hover:shadow-md transition-all duration-300 hover:-translate-y-1 h-full cursor-pointer">
            <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
              <span className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground group-hover:text-primary transition-colors">
                Active Students
              </span>
              <GraduationCap className="h-3.5 w-3.5 text-primary/75 group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl font-extrabold text-foreground">{stats.activeStudents}</div>
              <p className="text-[8px] text-muted-foreground font-medium mt-0.5">{stats.totalStudents} total</p>
            </CardContent>
          </Card>
        </Link>

        {/* Class Groups */}
        <Link href="/dashboard/owner/classgroup" className="block group">
          <Card className="bg-card border-border hover:border-primary/45 hover:shadow-md transition-all duration-300 hover:-translate-y-1 h-full cursor-pointer">
            <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
              <span className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground group-hover:text-primary transition-colors">
                Class Groups
              </span>
              <Layers className="h-3.5 w-3.5 text-primary/75 group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl font-extrabold text-foreground">{stats.activeGroups}</div>
              <p className="text-[8px] text-muted-foreground font-medium mt-0.5">{stats.totalGroups} total</p>
            </CardContent>
          </Card>
        </Link>

        {/* CRM Leads */}
        <Link href="/dashboard/owner/lead" className="block group">
          <Card className="bg-card border-border hover:border-primary/45 hover:shadow-md transition-all duration-300 hover:-translate-y-1 h-full cursor-pointer">
            <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
              <span className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground group-hover:text-primary transition-colors">
                Pending Leads
              </span>
              <PhoneCall className="h-3.5 w-3.5 text-primary/75 group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl font-extrabold text-foreground">{stats.leadsCount || 0}</div>
              <p className="text-[8px] text-muted-foreground font-medium mt-0.5">Active inquiries</p>
            </CardContent>
          </Card>
        </Link>

        {/* Invoices */}
        <Link href="/dashboard/owner/invoice" className="block group">
          <Card className="bg-card border-border hover:border-primary/45 hover:shadow-md transition-all duration-300 hover:-translate-y-1 h-full cursor-pointer">
            <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
              <span className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground group-hover:text-primary transition-colors">
                Billing Invoices
              </span>
              <FileText className="h-3.5 w-3.5 text-primary/75 group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl font-extrabold text-foreground">{stats.invoicesCount || 0}</div>
              <p className="text-[8px] text-muted-foreground font-medium mt-0.5">Total invoices</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Database folders sections */}
      <div className="space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5 pl-1">
          <FolderOpen className="h-4 w-4 text-primary" />
          Office Admin Academic Registry
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {registryTiers.map((tier) => (
            <Card key={tier.title} className={`border bg-card shadow-md flex flex-col justify-between overflow-hidden`}>
              <CardHeader className={`border-b border-border/60 py-3.5 px-4 bg-muted/10`}>
                <CardTitle className="text-xs font-bold text-foreground">{tier.title}</CardTitle>
                <CardDescription className="text-[9px]">{tier.description}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 flex-1">
                <div className="space-y-2">
                  {tier.items.map((item) => (
                    <Link
                      key={item.name}
                      href={item.url}
                      className="flex items-center justify-between p-2 rounded-lg border border-border/40 hover:bg-muted/15 transition-colors cursor-pointer group/item"
                    >
                      <div className="flex items-center gap-2">
                        <item.icon className="h-4 w-4 text-muted-foreground group-hover/item:text-primary transition-colors shrink-0" />
                        <span className="text-[11px] font-bold text-foreground">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {item.count !== null && (
                          <Badge variant="outline" className="text-[8px] py-0 px-1.5 font-mono text-muted-foreground font-semibold">
                            {item.count}
                          </Badge>
                        )}
                        <ChevronRight className="h-3 w-3 text-muted-foreground/50 group-hover/item:text-primary transition-colors shrink-0" />
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* CRM activity feed and term schedule splits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent activities */}
        <Card className="lg:col-span-2 bg-card border-border shadow-md overflow-hidden">
          <CardHeader className="border-b border-border py-4 px-5 bg-muted/10 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-sm font-bold text-foreground">Recent CRM Activities</CardTitle>
              <CardDescription className="text-[10px]">Logged follow-ups, calls, and email outcomes scoped to your branch</CardDescription>
            </div>
            <Link href="/dashboard/owner/activity" className="inline-flex items-center gap-1 text-xs text-primary font-bold hover:underline">
              View All
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-5">
            {recentActivities.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No recent activities logged in your branch locations.
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivities.map((act) => (
                  <div key={act.id} className="flex items-start justify-between gap-3 border-b border-border/40 pb-3 last:border-0 last:pb-0">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-foreground font-mono">{act.activityId}</span>
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 text-[9px] py-0 px-1.5 capitalize">
                          {act.type || "Note"}
                        </Badge>
                        {act.outcome && (
                          <span className="text-[10px] text-muted-foreground font-medium">• {act.outcome}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2" title={act.notes}>
                        {act.notes || "No description notes logged."}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono font-medium text-muted-foreground shrink-0">
                      {act.dateTime ? new Date(act.dateTime).toLocaleDateString() : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Terms timeline & Rooms list */}
        <div className="space-y-6">
          {/* Active terms timeline */}
          <Card className="bg-card border-border shadow-md overflow-hidden">
            <CardHeader className="border-b border-border py-4 px-5 bg-muted/10 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-sm font-bold text-foreground">Terms Calendar</CardTitle>
                <CardDescription className="text-[10px]">Academic periods and school calendar terms</CardDescription>
              </div>
              <Link href="/dashboard/owner/term" className="inline-flex items-center gap-1 text-xs text-primary font-bold hover:underline">
                View All
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="p-5">
              {terms.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No terms registered.
                </div>
              ) : (
                <div className="relative border-l-2 border-primary/20 pl-4 space-y-4 py-1">
                  {terms.map((term) => (
                    <div key={term.id} className="relative space-y-0.5">
                      <div className="absolute -left-5.25 top-1 h-2 w-2 rounded-full bg-primary" />
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-foreground">{term.termName}</h4>
                        <Badge variant="outline" className="text-[8px] py-0 px-1 bg-emerald-500/10 border-emerald-500/20 text-emerald-600 font-semibold uppercase">
                          {term.status || "Active"}
                        </Badge>
                      </div>
                      <p className="text-[9px] font-mono text-muted-foreground">
                        {term.startDate ? new Date(term.startDate).toLocaleDateString() : "—"} to {term.endDate ? new Date(term.endDate).toLocaleDateString() : "—"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Classroom rooms list */}
          <Card className="bg-card border-border shadow-md overflow-hidden">
            <CardHeader className="border-b border-border py-4 px-5 bg-muted/10 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-sm font-bold text-foreground">Facilities & Rooms</CardTitle>
                <CardDescription className="text-[10px]">Physical room configurations in your branch</CardDescription>
              </div>
              <Link href="/dashboard/owner/room" className="inline-flex items-center gap-1 text-xs text-primary font-bold hover:underline">
                View All
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="p-5">
              {rooms.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No classrooms scoped under your branch locations.
                </div>
              ) : (
                <div className="space-y-3">
                  {rooms.map((room) => {
                    const branchNames = room.branchIds
                      ?.map((id: string) => branchMap.get(id) || id)
                      .join(", ") || "—";
                    return (
                      <div key={room.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-muted/5 hover:bg-muted/15 transition-colors">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <DoorOpen className="h-3.5 w-3.5 text-primary/80 shrink-0" />
                            <h4 className="text-xs font-bold text-foreground">{room.roomName}</h4>
                          </div>
                          <p className="text-[9px] text-muted-foreground truncate max-w-37.5" title={branchNames}>
                            {branchNames}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono font-medium shrink-0">
                          {room.capacity || "—"} seats
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
