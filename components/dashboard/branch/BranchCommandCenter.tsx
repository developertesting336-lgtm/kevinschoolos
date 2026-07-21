"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchBranchDashboardData, selectBranchDashboardData, selectBranchDashboardLoading, selectBranchDashboardError } from "@/store/slices/branchesSlice";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  Clock,
  Users,
  DoorOpen,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Phone,
  Bell,
  Building2,
  GraduationCap,
  ChevronRight,
  AlertTriangle,
  Target,
  PhoneCall,
  MessageSquare,
  Wallet,
  Play,
  Circle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClassGroupInfo {
  id: string;
  groupName: string;
}

interface TeacherInfo {
  id: string;
  fullName: string;
}

interface RoomInfo {
  id: string;
  roomName: string;
}

interface TodayClass {
  id: string;
  sessionId: string;
  dateTime: string | null;
  status: string | null;
  classGroups: (ClassGroupInfo | null)[];
  teachers: (TeacherInfo | null)[];
  rooms: RoomInfo[];
}

interface TimeSlot {
  sessionId: string;
  time: string | null;
  status: string | null;
  classGroupNames: string[];
}

interface RoomScheduleItem {
  id: string;
  roomName: string;
  capacity: number | null;
  timeSlots: TimeSlot[];
}

interface StudentBrief {
  id: string;
  studentName: string;
  status: string | null;
}

interface StudentsByGroupItem {
  id: string;
  groupName: string;
  studentCount: number;
  capacity: number | null;
  status: string | null;
  students: StudentBrief[];
}

interface TeacherScheduleItem {
  id: string;
  fullName: string;
  sessions: {
    sessionId: string;
    time: string | null;
    status: string | null;
    classGroupNames: string[];
    roomNames: string[];
  }[];
}

interface LeadBrief {
  id: string;
  leadName: string;
  status: string | null;
  channel: string | null;
  phone: string | null;
  whatsapp: string | null;
  lastActivityDate: string | null;
  nextFollowUpDate: string | null;
  ownerIds: string[];
  branchIds: string[];
}

interface PaymentBrief {
  id: string;
  paymentRef: string;
  date: string | null;
  amount: number | null;
  method: string | null;
  paymentType: string | null;
  possibleDuplicate: boolean;
  parentNames: string[];
}

interface TrialBrief {
  id: string;
  trialId: string;
  dateTime: string | null;
  outcome: string | null;
  leadNames: string[];
  teacherIds: string[];
  classGroupIds: string[];
}

interface NotificationBrief {
  id: string;
  type: string | null;
  channel: string | null;
  status: string | null;
  scheduledFor: string | null;
  sentAt: string | null;
  message: string | null;
}

interface DashboardData {
  branchIds: string[];
  date: string;
  todayClasses: TodayClass[];
  roomSchedule: RoomScheduleItem[];
  studentsByGroup: StudentsByGroupItem[];
  teacherSchedule: TeacherScheduleItem[];
  openLeads: { total: number; leads: LeadBrief[] };
  recentPayments: PaymentBrief[];
  upcomingTrials: { today: TrialBrief[]; overdue: TrialBrief[]; future: TrialBrief[] };
  notificationsStatus: { scheduled: number; sent: number; failed: number; total: number; recent: NotificationBrief[] };
  followUpDue: { today: LeadBrief[]; overdue: LeadBrief[]; next: LeadBrief[] };
  onboardingInProgress: { count: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(dateStr: string | null): string {
  if (!dateStr) return "--:--";
  try {
    return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch { return "--:--"; }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString([], { day: "numeric", month: "short" });
  } catch { return ""; }
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

function formatCurrency(amount: number | null): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("ru-KG", { style: "currency", currency: "KGS", minimumFractionDigits: 0 }).format(amount);
}

function getStatusIcon(status: string | null) {
  switch (status?.toLowerCase()) {
    case "held": case "completed": return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
    case "cancelled": return <XCircle className="h-3.5 w-3.5 text-red-500" />;
    case "scheduled": return <Clock className="h-3.5 w-3.5 text-blue-500" />;
    default: return <AlertCircle className="h-3.5 w-3.5 text-amber-500" />;
  }
}

function getStatusBadge(status: string | null) {
  const s = (status || "").toLowerCase();
  if (s === "held" || s === "completed") return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[9px]">{status}</Badge>;
  if (s === "cancelled") return <Badge className="bg-red-500/10 text-red-600 border-red-200 text-[9px]">{status}</Badge>;
  if (s === "scheduled") return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 text-[9px]">{status}</Badge>;
  return <Badge variant="outline" className="text-[9px]">{status || "unknown"}</Badge>;
}

// ─── Card Shell ───────────────────────────────────────────────────────────────

function CardShell({ title, description, icon, children, loading, empty, emptyMessage, count }: {
  title: string;
  description?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  count?: number;
}) {
  if (loading) {
    return (
      <Card className="border-border shadow-sm">
        <CardHeader className="py-3 px-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-32 rounded" />
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="space-y-2">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-3/4 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (empty) {
    return (
      <Card className="border-border shadow-sm">
        <CardHeader className="py-3 px-4">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{icon}</span>
            <CardTitle className="text-sm font-bold">{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="py-6 text-center">
            <AlertCircle className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">{emptyMessage || "No data available."}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <span className="text-primary">{icon}</span>
          <CardTitle className="text-sm font-bold">{title}</CardTitle>
          {count !== undefined && (
            <Badge variant="secondary" className="text-[9px] py-0 px-1.5 font-bold">{count}</Badge>
          )}
        </div>
        {description && <CardDescription className="text-[9px] hidden sm:block">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {children}
      </CardContent>
    </Card>
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

function DetailDrawer({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-background border-l border-border shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card border-b border-border px-4 py-3 flex items-center justify-between z-10">
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors cursor-pointer">
            <XCircle className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Main Branch Command Center ───────────────────────────────────────────────

export function BranchCommandCenter() {
  const dispatch = useAppDispatch();

  // Redux hooks
  const data = useAppSelector(selectBranchDashboardData) as DashboardData | null;
  const loading = useAppSelector(selectBranchDashboardLoading);
  const error = useAppSelector(selectBranchDashboardError);

  const [drawer, setDrawer] = useState<{ title: string; content: React.ReactNode } | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    dispatch(fetchBranchDashboardData());
  }, [dispatch]);

  const toggleGroupExpand = useCallback((groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 p-4 max-w-7xl mx-auto">
        <Skeleton className="h-8 w-64 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
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
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors cursor-pointer">
          Try Again
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center">
        <p className="text-sm text-muted-foreground">No data available.</p>
      </div>
    );
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Branch Command Center</h1>
          <p className="text-xs text-muted-foreground capitalize">{dateStr}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] font-semibold">
            <Building2 className="h-3 w-3 mr-1" />
            {data.branchIds.length} branch(es)
          </Badge>
        </div>
      </div>

      {/* ─── Urgency-Banded Cards Grid ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. Today's Classes */}
        <CardShell
          title="Today's Classes"
          icon={<Calendar className="h-4 w-4" />}
          count={data.todayClasses.length}
          loading={loading}
          empty={data.todayClasses.length === 0}
          emptyMessage="No classes scheduled today."
        >
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.todayClasses.slice(0, 8).map(s => (
              <div key={s.id} className="flex items-start justify-between p-2 rounded-lg bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => setDrawer({
                  title: `Session ${s.sessionId}`,
                  content: (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(s.status)}
                        <span className="text-lg font-bold tabular-nums">{formatTime(s.dateTime)}</span>
                        {getStatusBadge(s.status)}
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><BookOpen className="h-3 w-3" /> Groups: {s.classGroups.map(cg => cg?.groupName).filter(Boolean).join(", ")}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Teachers: {s.teachers.map(t => t?.fullName).filter(Boolean).join(", ")}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><DoorOpen className="h-3 w-3" /> Rooms: {s.rooms.map(r => r.roomName).join(", ")}</p>
                      </div>
                    </div>
                  )
                })}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold tabular-nums">{formatTime(s.dateTime)}</span>
                    {getStatusIcon(s.status)}
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                    {s.classGroups.map(cg => cg?.groupName).filter(Boolean).join(", ")}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-medium text-muted-foreground">{s.teachers.map(t => t?.fullName).filter(Boolean).join(", ")}</p>
                  <p className="text-[9px] text-muted-foreground">{s.rooms.map(r => r.roomName).join(", ")}</p>
                </div>
              </div>
            ))}
            {data.todayClasses.length > 8 && (
              <button className="w-full text-[10px] text-primary font-medium hover:underline text-center cursor-pointer">+{data.todayClasses.length - 8} more</button>
            )}
          </div>
        </CardShell>

        {/* 2. Room Schedule */}
        <CardShell
          title="Room Schedule"
          icon={<DoorOpen className="h-4 w-4" />}
          count={data.roomSchedule.length}
          loading={loading}
          empty={data.roomSchedule.length === 0}
          emptyMessage="No rooms configured."
        >
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.roomSchedule.slice(0, 6).map(room => (
              <div key={room.id} className="p-2 rounded-lg bg-muted/30 border border-border/40">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-foreground">{room.roomName}</span>
                  <span className="text-[9px] text-muted-foreground">Cap: {room.capacity || "—"}</span>
                </div>
                {room.timeSlots.length === 0 ? (
                  <p className="text-[9px] text-muted-foreground italic">No sessions today</p>
                ) : (
                  <div className="space-y-0.5">
                    {room.timeSlots.map(ts => (
                      <div key={ts.sessionId} className="flex items-center gap-1.5 text-[9px]">
                        {getStatusIcon(ts.status)}
                        <span className="font-medium tabular-nums">{formatTime(ts.time)}</span>
                        <span className="text-muted-foreground truncate">{ts.classGroupNames.join(", ")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardShell>

        {/* 3. Students by Group */}
        <CardShell
          title="Students by Group"
          icon={<GraduationCap className="h-4 w-4" />}
          count={data.studentsByGroup.reduce((sum, g) => sum + g.studentCount, 0)}
          loading={loading}
          empty={data.studentsByGroup.length === 0}
          emptyMessage="No active groups."
        >
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.studentsByGroup.slice(0, 8).map(g => (
              <div key={g.id}>
                <div
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => toggleGroupExpand(g.id)}
                >
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-foreground truncate block">{g.groupName}</span>
                    <span className="text-[9px] text-muted-foreground">{g.studentCount}/{g.capacity || "—"} students</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {getStatusBadge(g.status)}
                    {expandedGroups.has(g.id) ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                  </div>
                </div>
                {expandedGroups.has(g.id) && g.students.length > 0 && (
                  <div className="ml-3 mt-1 space-y-0.5 border-l-2 border-border/40 pl-3">
                    {g.students.map(st => (
                      <div key={st.id} className="flex items-center gap-1.5 text-[10px]">
                        <div className="h-4 w-4 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[7px] uppercase shrink-0">
                          {st.studentName.charAt(0)}
                        </div>
                        <span className="text-foreground">{st.studentName}</span>
                        <Badge variant="outline" className="text-[7px] py-0 px-1 ml-auto">{st.status || "active"}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardShell>

        {/* 4. Teacher Schedule */}
        <CardShell
          title="Teacher Schedule"
          icon={<Users className="h-4 w-4" />}
          count={data.teacherSchedule.length}
          loading={loading}
          empty={data.teacherSchedule.length === 0}
          emptyMessage="No teachers assigned."
        >
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.teacherSchedule.slice(0, 6).map(t => (
              <div key={t.id} className="p-2 rounded-lg bg-muted/30 border border-border/40">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[8px] uppercase shrink-0">
                    {t.fullName.charAt(0)}
                  </div>
                  <span className="text-xs font-bold text-foreground">{t.fullName}</span>
                  <Badge variant="outline" className="text-[8px] py-0 px-1 ml-auto">{t.sessions.length} session(s)</Badge>
                </div>
                {t.sessions.length > 0 && (
                  <div className="space-y-0.5 ml-6">
                    {t.sessions.map(s => (
                      <div key={s.sessionId} className="flex items-center gap-1.5 text-[9px]">
                        {getStatusIcon(s.status)}
                        <span className="font-medium tabular-nums">{formatTime(s.time)}</span>
                        <span className="text-muted-foreground truncate">{s.classGroupNames.join(", ")}</span>
                        {s.roomNames.length > 0 && <span className="text-muted-foreground">· {s.roomNames.join(", ")}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardShell>

        {/* 5. Open Leads */}
        <CardShell
          title="Open Leads"
          icon={<PhoneCall className="h-4 w-4" />}
          count={data.openLeads.total}
          loading={loading}
          empty={data.openLeads.total === 0}
          emptyMessage="No open leads."
        >
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.openLeads.leads.slice(0, 8).map(l => (
              <div key={l.id} className="flex items-start justify-between p-2 rounded-lg bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => setDrawer({
                  title: l.leadName,
                  content: (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px]">{l.status}</Badge>
                        {l.channel && <Badge variant="secondary" className="text-[9px]">{l.channel}</Badge>}
                      </div>
                      <div className="space-y-1">
                        {l.phone && <p className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" /> <a href={`tel:${l.phone}`} className="text-primary hover:underline">{l.phone}</a></p>}
                        {l.whatsapp && <p className="text-xs flex items-center gap-1"><MessageSquare className="h-3 w-3" /> <a href={`https://wa.me/${l.whatsapp.replace(/[^0-9]/g, "")}`} className="text-primary hover:underline" target="_blank">{l.whatsapp}</a></p>}
                        {l.lastActivityDate && <p className="text-[10px] text-muted-foreground">Last activity: {formatDateTime(l.lastActivityDate)}</p>}
                        {l.nextFollowUpDate && <p className="text-[10px] text-amber-600 font-medium">Follow-up: {formatDateTime(l.nextFollowUpDate)}</p>}
                      </div>
                    </div>
                  )
                })}
              >
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-foreground truncate block">{l.leadName}</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Badge variant="outline" className="text-[8px] py-0 px-1">{l.status || "New"}</Badge>
                    {l.channel && <Badge variant="secondary" className="text-[8px] py-0 px-1">{l.channel}</Badge>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {l.nextFollowUpDate && (
                    <span className="text-[9px] text-amber-600 font-medium block">
                      {new Date(l.nextFollowUpDate) < new Date() ? "Overdue" : formatDate(l.nextFollowUpDate)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardShell>

        {/* 6. Recent Payments */}
        <CardShell
          title="Recent Payments"
          icon={<Wallet className="h-4 w-4" />}
          count={data.recentPayments.length}
          loading={loading}
          empty={data.recentPayments.length === 0}
          emptyMessage="No recent payments."
        >
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.recentPayments.slice(0, 8).map(p => (
              <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/40">
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-foreground">{formatCurrency(p.amount)}</span>
                    {p.possibleDuplicate && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                  </div>
                  <p className="text-[9px] text-muted-foreground truncate">
                    {p.parentNames.join(", ")} · {p.paymentType || p.method || "—"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[9px] text-muted-foreground block">{formatDate(p.date)}</span>
                  <span className="text-[8px] text-muted-foreground">{p.paymentRef}</span>
                </div>
              </div>
            ))}
          </div>
        </CardShell>

        {/* 7. Upcoming Trials */}
        <CardShell
          title="Upcoming Trials"
          icon={<Play className="h-4 w-4" />}
          count={data.upcomingTrials.today.length + data.upcomingTrials.overdue.length + data.upcomingTrials.future.length}
          loading={loading}
          empty={data.upcomingTrials.today.length === 0 && data.upcomingTrials.overdue.length === 0 && data.upcomingTrials.future.length === 0}
          emptyMessage="No trials."
        >
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {/* Today's trials */}
            {data.upcomingTrials.today.length > 0 && (
              <div>
                <p className="text-[9px] font-bold text-blue-600 uppercase mb-1">Today ({data.upcomingTrials.today.length})</p>
                {data.upcomingTrials.today.slice(0, 3).map(t => (
                  <div key={t.id} className="flex items-center gap-1.5 p-1.5 text-[10px]">
                    <Clock className="h-3 w-3 text-blue-500 shrink-0" />
                    <span className="font-medium tabular-nums">{formatTime(t.dateTime)}</span>
                    <span className="text-muted-foreground truncate">{t.leadNames.join(", ")}</span>
                  </div>
                ))}
              </div>
            )}
            {/* Overdue trials */}
            {data.upcomingTrials.overdue.length > 0 && (
              <div>
                <p className="text-[9px] font-bold text-red-600 uppercase mb-1">Overdue ({data.upcomingTrials.overdue.length})</p>
                {data.upcomingTrials.overdue.slice(0, 3).map(t => (
                  <div key={t.id} className="flex items-center gap-1.5 p-1.5 text-[10px]">
                    <AlertCircle className="h-3 w-3 text-red-500 shrink-0" />
                    <span className="font-medium tabular-nums">{formatDate(t.dateTime)}</span>
                    <span className="text-muted-foreground truncate">{t.leadNames.join(", ")}</span>
                  </div>
                ))}
              </div>
            )}
            {/* Future trials */}
            {data.upcomingTrials.future.length > 0 && (
              <div>
                <p className="text-[9px] font-bold text-emerald-600 uppercase mb-1">Upcoming ({data.upcomingTrials.future.length})</p>
                {data.upcomingTrials.future.slice(0, 3).map(t => (
                  <div key={t.id} className="flex items-center gap-1.5 p-1.5 text-[10px]">
                    <Calendar className="h-3 w-3 text-emerald-500 shrink-0" />
                    <span className="font-medium tabular-nums">{formatDateTime(t.dateTime)}</span>
                    <span className="text-muted-foreground truncate">{t.leadNames.join(", ")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardShell>

        {/* 8. Notifications Status */}
        <CardShell
          title="Notifications"
          icon={<Bell className="h-4 w-4" />}
          count={data.notificationsStatus.total}
          loading={loading}
          empty={data.notificationsStatus.total === 0}
          emptyMessage="No notifications."
        >
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-200 text-center">
                <div className="text-lg font-bold text-blue-600 tabular-nums">{data.notificationsStatus.scheduled}</div>
                <p className="text-[8px] text-blue-600 font-medium uppercase">Scheduled</p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-200 text-center">
                <div className="text-lg font-bold text-emerald-600 tabular-nums">{data.notificationsStatus.sent}</div>
                <p className="text-[8px] text-emerald-600 font-medium uppercase">Sent</p>
              </div>
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-200 text-center">
                <div className="text-lg font-bold text-red-600 tabular-nums">{data.notificationsStatus.failed}</div>
                <p className="text-[8px] text-red-600 font-medium uppercase">Failed</p>
              </div>
            </div>
            {data.notificationsStatus.recent.length > 0 && (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {data.notificationsStatus.recent.slice(0, 4).map(n => (
                  <div key={n.id} className="flex items-center gap-1.5 text-[9px] p-1 rounded bg-muted/20">
                    {n.status === "sent" ? <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" /> :
                     n.status === "failed" ? <XCircle className="h-3 w-3 text-red-500 shrink-0" /> :
                     <Clock className="h-3 w-3 text-blue-500 shrink-0" />}
                    <span className="text-muted-foreground truncate">{n.type || n.channel || "Notification"}</span>
                    <span className="text-muted-foreground shrink-0">{n.scheduledFor ? formatDate(n.scheduledFor) : ""}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardShell>

        {/* 9. Follow-Up Due */}
        <CardShell
          title="Follow-Up Due"
          icon={<Target className="h-4 w-4" />}
          count={data.followUpDue.today.length + data.followUpDue.overdue.length + data.followUpDue.next.length}
          loading={loading}
          empty={data.followUpDue.today.length === 0 && data.followUpDue.overdue.length === 0 && data.followUpDue.next.length === 0}
          emptyMessage="No follow-ups due."
        >
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {/* Today */}
            {data.followUpDue.today.length > 0 && (
              <div>
                <p className="text-[9px] font-bold text-amber-600 uppercase mb-1">Today ({data.followUpDue.today.length})</p>
                {data.followUpDue.today.slice(0, 3).map(l => (
                  <div key={l.id} className="flex items-center gap-1.5 p-1.5 text-[10px]">
                    <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />
                    <span className="font-medium text-foreground truncate">{l.leadName}</span>
                    <span className="text-muted-foreground shrink-0">{l.status}</span>
                  </div>
                ))}
              </div>
            )}
            {/* Overdue */}
            {data.followUpDue.overdue.length > 0 && (
              <div>
                <p className="text-[9px] font-bold text-red-600 uppercase mb-1">Overdue ({data.followUpDue.overdue.length})</p>
                {data.followUpDue.overdue.slice(0, 3).map(l => (
                  <div key={l.id} className="flex items-center gap-1.5 p-1.5 text-[10px]">
                    <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
                    <span className="font-medium text-foreground truncate">{l.leadName}</span>
                    <span className="text-muted-foreground shrink-0">{formatDate(l.nextFollowUpDate)}</span>
                  </div>
                ))}
              </div>
            )}
            {/* Next */}
            {data.followUpDue.next.length > 0 && (
              <div>
                <p className="text-[9px] font-bold text-emerald-600 uppercase mb-1">Next ({data.followUpDue.next.length})</p>
                {data.followUpDue.next.slice(0, 3).map(l => (
                  <div key={l.id} className="flex items-center gap-1.5 p-1.5 text-[10px]">
                    <Calendar className="h-3 w-3 text-emerald-500 shrink-0" />
                    <span className="font-medium text-foreground truncate">{l.leadName}</span>
                    {l.nextFollowUpDate && <span className="text-muted-foreground shrink-0">{formatDate(l.nextFollowUpDate)}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardShell>

        {/* 10. Onboarding In Progress */}
        <CardShell
          title="Onboarding In Progress"
          icon={<ClipboardCheck className="h-4 w-4" />}
          count={data.onboardingInProgress.count}
          loading={loading}
          empty={data.onboardingInProgress.count === 0}
          emptyMessage="All onboarding complete."
        >
          <div className="space-y-2">
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-200 text-center">
              <div className="text-2xl font-bold text-amber-600 tabular-nums">{data.onboardingInProgress.count}</div>
              <p className="text-[9px] text-amber-600 font-medium uppercase">Pending Completion</p>
            </div>
            <button
              onClick={() => {
                // Open drawer immediately with loading skeleton
                setDrawer({
                  title: "Onboarding (loading...)",
                  content: (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="p-3 rounded-lg border border-border bg-card space-y-2">
                          <div className="flex items-center justify-between">
                            <Skeleton className="h-4 w-32 rounded" />
                            <Skeleton className="h-4 w-16 rounded" />
                          </div>
                          <Skeleton className="h-3 w-24 rounded" />
                          <div className="grid grid-cols-2 gap-1">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(j => (
                              <Skeleton key={j} className="h-3 w-full rounded" />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ),
                });
                // Fetch data in background
                fetch("/api/branch/onboarding")
                  .then(res => {
                    if (!res.ok) throw new Error("Failed to load");
                    return res.json();
                  })
                  .then(onboardingData => {
                    setDrawer({
                      title: `Onboarding (${onboardingData.total})`,
                      content: (
                        <div className="space-y-3">
                          {onboardingData.enrollments.map((e: any) => (
                            <div key={e.id} className="p-3 rounded-lg border border-border bg-card space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-foreground">{e.studentNames.join(", ") || e.enrollmentId}</span>
                                <Badge className={
                                  e.onboardingStatus === "Complete" ? "bg-emerald-500/10 text-emerald-600" :
                                  e.onboardingStatus === "In Progress" ? "bg-blue-500/10 text-blue-600" :
                                  "bg-amber-500/10 text-amber-600"
                                }>{e.onboardingStatus}</Badge>
                              </div>
                              {e.classGroupNames.length > 0 && <p className="text-[9px] text-muted-foreground">Groups: {e.classGroupNames.join(", ")}</p>}
                              <div className="grid grid-cols-2 gap-1 text-[9px]">
                                <div className="flex items-center gap-1">{e.scheduleDelivered ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Circle className="h-3 w-3 text-muted-foreground" />} Schedule</div>
                                <div className="flex items-center gap-1">{e.calendarDelivered ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Circle className="h-3 w-3 text-muted-foreground" />} Calendar</div>
                                <div className="flex items-center gap-1">{e.appInstructionsDelivered ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Circle className="h-3 w-3 text-muted-foreground" />} App Instructions</div>
                                <div className="flex items-center gap-1">{e.audioRecommendationsDelivered ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Circle className="h-3 w-3 text-muted-foreground" />} Audio Recs</div>
                                <div className="flex items-center gap-1">{e.contractSigned ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Circle className="h-3 w-3 text-muted-foreground" />} Contract</div>
                                <div className="flex items-center gap-1">{e.hdSystemRegistered ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Circle className="h-3 w-3 text-muted-foreground" />} HD System</div>
                                <div className="flex items-center gap-1">{e.appCredentialsIssued ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Circle className="h-3 w-3 text-muted-foreground" />} App Credentials</div>
                                <div className="flex items-center gap-1">{e.firstLessonConfirmed ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Circle className="h-3 w-3 text-muted-foreground" />} First Lesson</div>
                                <div className="flex items-center gap-1">{e.trialFeeDeducted ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Circle className="h-3 w-3 text-muted-foreground" />} Trial Fee</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ),
                    });
                  })
                  .catch(err => {
                    console.error(err);
                    setDrawer({
                      title: "Onboarding",
                      content: (
                        <div className="py-8 text-center">
                          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Failed to load onboarding data.</p>
                        </div>
                      ),
                    });
                  });
              }}
              className="w-full py-2 text-[10px] font-medium text-primary hover:text-primary/80 transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              View Details <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </CardShell>
      </div>

      {/* ─── Detail Drawer ─── */}
      {drawer && (
        <DetailDrawer title={drawer.title} onClose={() => setDrawer(null)}>
          {drawer.content}
        </DetailDrawer>
      )}
    </div>
  );
}