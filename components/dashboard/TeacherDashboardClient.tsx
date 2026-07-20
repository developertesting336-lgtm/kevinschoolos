"use client";

import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Layers,
  GraduationCap,
  Clock,
  FileCheck,
  DoorOpen,
  Award,
  ChevronRight
} from "lucide-react";

interface TeacherDashboardClientProps {
  initialStats: {
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
  terms: any[];
  rooms: any[];
  courses: any[];
  recentActivities: any[];
}

export function TeacherDashboardClient({
  initialStats,
  branches,
  teacherId,
  terms,
  rooms,
  courses,
  recentActivities
}: TeacherDashboardClientProps) {
  const branchMap = new Map(branches.map((b) => [b.id, b.name]));

  return (
    <div className="space-y-8 select-none animate-in fade-in duration-300">
      {/* Headline & Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Classes */}
        <Link href="/dashboard/owner/classgroup" className="block group">
          <Card className="bg-card border-border hover:border-primary/45 hover:shadow-md transition-all duration-300 hover:-translate-y-1 h-full cursor-pointer">
            <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
              <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground group-hover:text-primary transition-colors">
                Total Classes
              </span>
              <Layers className="h-3.5 w-3.5 text-primary/75 group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-extrabold text-foreground">{initialStats.totalClasses}</div>
              <p className="text-[9px] text-muted-foreground font-medium mt-0.5">Assigned groups</p>
            </CardContent>
          </Card>
        </Link>

        {/* Active Students */}
        <Link href="/dashboard/owner/student" className="block group">
          <Card className="bg-card border-border hover:border-primary/45 hover:shadow-md transition-all duration-300 hover:-translate-y-1 h-full cursor-pointer">
            <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
              <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground group-hover:text-primary transition-colors">
                My Students
              </span>
              <GraduationCap className="h-3.5 w-3.5 text-primary/75 group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-extrabold text-foreground">{initialStats.activeStudents}</div>
              <p className="text-[9px] text-muted-foreground font-medium mt-0.5">Active enrollments</p>
            </CardContent>
          </Card>
        </Link>

        {/* Today's Classes */}
        <Link href="/dashboard/owner/session" className="block group">
          <Card className="bg-card border-border hover:border-primary/45 hover:shadow-md transition-all duration-300 hover:-translate-y-1 h-full cursor-pointer">
            <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
              <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground group-hover:text-primary transition-colors">
                Sessions Today
              </span>
              <Clock className="h-3.5 w-3.5 text-primary/75 group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-extrabold text-foreground">{initialStats.todayClasses}</div>
              <p className="text-[9px] text-muted-foreground font-medium mt-0.5">Scheduled sessions</p>
            </CardContent>
          </Card>
        </Link>

        {/* Attendance Percentage */}
        <Link href="/dashboard/owner/attendance" className="block group">
          <Card className="bg-card border-border hover:border-primary/45 hover:shadow-md transition-all duration-300 hover:-translate-y-1 h-full cursor-pointer">
            <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
              <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground group-hover:text-primary transition-colors">
                Attendance Rate
              </span>
              <FileCheck className="h-3.5 w-3.5 text-primary/75 group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-extrabold text-emerald-600">{initialStats.attendanceRate}%</div>
              <p className="text-[9px] text-muted-foreground font-medium mt-0.5">Term average rate</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Grid of operational tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Activities & Course Catalog */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Activities Panel */}
          <Card className="bg-card border-border shadow-md overflow-hidden">
            <CardHeader className="border-b border-border py-4 px-5 bg-muted/10 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-sm font-bold text-foreground">Recent CRM Activities</CardTitle>
                <CardDescription className="text-[10px]">Your personal logged events, lesson notes, and student interactions</CardDescription>
              </div>
              <Link href="/dashboard/owner/activity" className="inline-flex items-center gap-1 text-xs text-primary font-bold hover:underline">
                View All
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="p-5">
              {recentActivities.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No recent activities logged in your system workspace.
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
                          {act.notes || "No additional description notes logged."}
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

          {/* Active Course Syllabus Panel */}
          <Card className="bg-card border-border shadow-md overflow-hidden">
            <CardHeader className="border-b border-border py-4 px-5 bg-muted/10 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-sm font-bold text-foreground">Syllabus & Active Courses</CardTitle>
                <CardDescription className="text-[10px]">Academic syllabus catalog and default courses information</CardDescription>
              </div>
              <Link href="/dashboard/owner/course" className="inline-flex items-center gap-1 text-xs text-primary font-bold hover:underline">
                View All
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="p-5">
              {courses.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No active courses found.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {courses.map((course) => (
                    <div key={course.id} className="p-3.5 rounded-lg border border-border bg-muted/10 flex flex-col justify-between space-y-2 hover:border-primary/20 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Award className="h-4.5 w-4.5 text-primary shrink-0" />
                          <h4 className="text-xs font-bold text-foreground truncate" title={course.courseName}>
                            {course.courseName}
                          </h4>
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-3" title={course.description}>
                          {course.description || "No curriculum description uploaded."}
                        </p>
                      </div>
                      <div className="pt-1 flex flex-wrap gap-1 border-t border-border/30">
                        {course.stage && (
                          <Badge variant="outline" className="text-[8px] py-0 px-1 text-muted-foreground font-medium uppercase">
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

        {/* Right Column: Terms timeline & Rooms list */}
        <div className="space-y-6">
          {/* Academic Terms Timeline */}
          <Card className="bg-card border-border shadow-md overflow-hidden">
            <CardHeader className="border-b border-border py-4 px-5 bg-muted/10 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-sm font-bold text-foreground">Terms Calendar</CardTitle>
                <CardDescription className="text-[10px]">Academic periods list and dates</CardDescription>
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

          {/* Branch Rooms & Facilities */}
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
