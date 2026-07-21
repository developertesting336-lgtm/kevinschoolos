"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PhoneCall,
  Play,
  Activity,
  Building2,
  Award,
  Receipt,
  TrendingUp,
  FolderOpen,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchSmmDashboardData,
  selectSmmStats,
  selectSmmCourses,
  selectSmmActivities,
  selectSmmLoading,
  selectSmmError,
} from "@/store/slices/dashboardSlice";

export function SmmDashboardClient() {
  const dispatch = useAppDispatch();

  // Redux hooks
  const stats = useAppSelector(selectSmmStats);
  const courses = useAppSelector(selectSmmCourses);
  const recentActivities = useAppSelector(selectSmmActivities);
  const loading = useAppSelector(selectSmmLoading);
  const error = useAppSelector(selectSmmError);

  useEffect(() => {
    dispatch(fetchSmmDashboardData());
  }, [dispatch]);

  if (loading) {
    return (
      <div className="space-y-8 select-none">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-6">
                <Skeleton className="h-3 w-20 bg-muted rounded mb-3" />
                <Skeleton className="h-8 w-16 bg-muted rounded mb-2" />
                <Skeleton className="h-3 w-24 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i} className="bg-card border-border">
              <CardHeader className="border-b border-border py-3 px-5">
                <Skeleton className="h-4 w-32 bg-muted rounded" />
              </CardHeader>
              <CardContent className="p-5">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="flex items-center justify-between py-3 border-b border-border/40 last:border-0">
                    <Skeleton className="h-4 w-36 bg-muted rounded" />
                    <Skeleton className="h-4 w-16 bg-muted rounded" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
        <h2 className="text-lg font-bold text-foreground mb-1">Unable to Load</h2>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  const registryTiers = [
    {
      title: "CRM & Operations Registry (T3)",
      description: "Leads tracking, marketing trials, and events logs",
      color: "border-purple-500/25 bg-purple-500/5",
      items: [
        { name: "CRM Leads", url: "/dashboard/owner/lead", count: stats.leadsCount, icon: PhoneCall },
        { name: "Trials Booked", url: "/dashboard/owner/trial", count: stats.trialsCount, icon: Play },
        { name: "Activities Notes", url: "/dashboard/owner/activity", count: recentActivities.length, icon: Activity },
      ],
    },
    {
      title: "Reference & Analytics (T4 / T4-RO)",
      description: "Branches, course catalogs, tuition plans, and performance",
      color: "border-emerald-500/25 bg-emerald-500/5",
      items: [
        { name: "Branches Config", url: "/dashboard/owner/branch", count: stats.branchesCount, icon: Building2 },
        { name: "Courses Catalog", url: "/dashboard/owner/course", count: stats.coursesCount, icon: Award },
        { name: "Tuition Plans", url: "/dashboard/owner/tuitionplan", count: null, icon: Receipt },
        { name: "Channel Performance", url: "/dashboard/owner/channelperformance", count: null, icon: TrendingUp },
      ],
    },
  ];

  return (
    <div className="space-y-8 select-none animate-in fade-in duration-300">
      {/* 4 Stats Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/dashboard/owner/branch" className="block group">
          <Card className="bg-card border-border hover:border-primary/45 hover:shadow-md transition-all duration-300 hover:-translate-y-1 h-full cursor-pointer">
            <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
              <span className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground group-hover:text-primary transition-colors">My Branches</span>
              <Building2 className="h-3.5 w-3.5 text-primary/75 group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl font-extrabold text-foreground">{stats.branchesCount}</div>
              <p className="text-[8px] text-muted-foreground font-medium mt-0.5">Assigned branches</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/owner/course" className="block group">
          <Card className="bg-card border-border hover:border-primary/45 hover:shadow-md transition-all duration-300 hover:-translate-y-1 h-full cursor-pointer">
            <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
              <span className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground group-hover:text-primary transition-colors">Course Catalog</span>
              <Award className="h-3.5 w-3.5 text-primary/75 group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl font-extrabold text-foreground">{stats.coursesCount}</div>
              <p className="text-[8px] text-muted-foreground font-medium mt-0.5">Available templates</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/owner/lead" className="block group">
          <Card className="bg-card border-border hover:border-primary/45 hover:shadow-md transition-all duration-300 hover:-translate-y-1 h-full cursor-pointer">
            <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
              <span className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground group-hover:text-primary transition-colors">CRM Leads</span>
              <PhoneCall className="h-3.5 w-3.5 text-primary/75 group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl font-extrabold text-foreground">{stats.leadsCount}</div>
              <p className="text-[8px] text-muted-foreground font-medium mt-0.5">Active inquiries</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/owner/trial" className="block group">
          <Card className="bg-card border-border hover:border-primary/45 hover:shadow-md transition-all duration-300 hover:-translate-y-1 h-full cursor-pointer">
            <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
              <span className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground group-hover:text-primary transition-colors">Trials Scheduled</span>
              <Play className="h-3.5 w-3.5 text-primary/75 group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl font-extrabold text-foreground">{stats.trialsCount}</div>
              <p className="text-[8px] text-muted-foreground font-medium mt-0.5">Assigned assessments</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Database folders sections */}
      <div className="space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5 pl-1">
          <FolderOpen className="h-4 w-4 text-primary" />
          SMM Media Workspace Directories
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {registryTiers.map((tier) => (
            <Card key={tier.title} className="border bg-card shadow-md flex flex-col justify-between overflow-hidden">
              <CardHeader className="border-b border-border/60 py-3.5 px-4 bg-muted/10">
                <CardTitle className="text-xs font-bold text-foreground">{tier.title}</CardTitle>
                <CardDescription className="text-[9px]">{tier.description}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 flex-1">
                <div className="space-y-2">
                  {tier.items.map((item) => (
                    <Link
                      key={item.name}
                      href={item.url}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 hover:bg-muted/15 transition-colors cursor-pointer group/item"
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

      {/* CRM activity feed and syllabus catalog */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-card border-border shadow-md overflow-hidden">
          <CardHeader className="border-b border-border py-4 px-5 bg-muted/10 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-sm font-bold text-foreground">Recent CRM Activities</CardTitle>
              <CardDescription className="text-[10px]">Logged events, phone logs, and notes scoped to your branch</CardDescription>
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
                {recentActivities.map((act: any) => (
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
                      <p className="text-xs text-muted-foreground line-clamp-2" title={act.notes || ""}>
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

        <Card className="bg-card border-border shadow-md overflow-hidden">
          <CardHeader className="border-b border-border py-4 px-5 bg-muted/10 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-sm font-bold text-foreground">Syllabus & Courses</CardTitle>
              <CardDescription className="text-[10px]">Academic course templates configuration</CardDescription>
            </div>
            <Link href="/dashboard/owner/course" className="inline-flex items-center gap-1 text-xs text-primary font-bold hover:underline">
              View All
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-5">
            {courses.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No active courses found.
              </div>
            ) : (
              <div className="space-y-3.5">
                {courses.map((course: any) => (
                  <div key={course.id} className="p-3 rounded-lg border border-border/80 bg-muted/5 flex flex-col justify-between space-y-1 hover:border-primary/20 transition-colors">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-foreground truncate" title={course.courseName || ""}>
                        {course.courseName}
                      </h4>
                      <p className="text-[10px] text-muted-foreground line-clamp-2" title={course.description || ""}>
                        {course.description || "No curriculum description."}
                      </p>
                    </div>
                    <div className="flex gap-1 pt-1.5 border-t border-border/30">
                      {course.stage && (
                        <Badge variant="outline" className="text-[8px] py-0 px-1 text-muted-foreground uppercase">
                          Stage: {course.stage}
                        </Badge>
                      )}
                      {course.ageBand && (
                        <Badge variant="outline" className="text-[8px] py-0 px-1 text-primary/80 border-primary/10 font-bold uppercase">
                          {course.ageBand}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}