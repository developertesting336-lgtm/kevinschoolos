"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  Clock,
  Users,
  DoorOpen,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Timer,
  FileText,
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
  BookOpen,
  UserCheck,
  UserX,
  UserMinus,
  Clock3,
  ListChecks,
  Edit3,
  Loader2,
  Ban,
  ChevronLeft,
  Send,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClassGroupInfo {
  classGroupId: string;
  groupName: string;
  headcount: number;
  roomIds: string[];
  roomNames: string[];
}

interface SessionCard {
  id: string;
  sessionId: string;
  dateTime: string | null;
  status: string | null;
  branchIds: string[];
  classGroups: ClassGroupInfo[];
}

interface ParentInfo {
  id: string;
  parentName: string;
}

interface RosterStudent {
  id: string;
  studentName: string;
  gender: string | null;
  status: string | null;
  parents: ParentInfo[];
  attendanceStatus: string | null;
}

interface RosterData {
  sessionId: string;
  sessionStatus: string | null;
  dateTime: string | null;
  classGroupIds: string[];
  students: RosterStudent[];
}

interface DashboardData {
  teacherId: string;
  teacherName: string;
  date: string;
  summary: {
    totalSessionsToday: number;
    totalActiveStudents: number;
    pendingAttendance: number;
  };
  sessions: SessionCard[];
}

type AttendanceStatus = "present" | "absent" | "late" | "excused" | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(dateStr: string | null): string {
  if (!dateStr) return "--:--";
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "--:--";
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function isUpcoming(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) > new Date();
}

function isPast(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function getStatusIcon(status: string | null) {
  switch (status?.toLowerCase()) {
    case "held":
    case "completed":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case "cancelled":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "scheduled":
      return <Clock className="h-4 w-4 text-blue-500" />;
    default:
      return <AlertCircle className="h-4 w-4 text-amber-500" />;
  }
}

function getAttendanceLabel(status: AttendanceStatus): { label: string; icon: React.ReactNode; color: string } {
  switch (status) {
    case "present":
      return { label: "Present", icon: <UserCheck className="h-4 w-4" />, color: "text-emerald-600 bg-emerald-50 border-emerald-200" };
    case "absent":
      return { label: "Absent", icon: <UserX className="h-4 w-4" />, color: "text-red-600 bg-red-50 border-red-200" };
    case "late":
      return { label: "Late", icon: <Clock3 className="h-4 w-4" />, color: "text-amber-600 bg-amber-50 border-amber-200" };
    case "excused":
      return { label: "Excused", icon: <UserMinus className="h-4 w-4" />, color: "text-purple-600 bg-purple-50 border-purple-200" };
    default:
      return { label: "Not Marked", icon: <AlertCircle className="h-4 w-4" />, color: "text-muted-foreground bg-muted/30 border-border" };
  }
}

// ─── Attendance Row Component ────────────────────────────────────────────────

function AttendanceRow({
  student,
  status,
  onChange,
}: {
  student: RosterStudent;
  status: AttendanceStatus;
  onChange: (studentId: string, status: AttendanceStatus) => void;
}) {
  const statusOptions: { value: AttendanceStatus; label: string; icon: React.ReactNode }[] = [
    { value: "present", label: "P", icon: <UserCheck className="h-3.5 w-3.5" /> },
    { value: "absent", label: "A", icon: <UserX className="h-3.5 w-3.5" /> },
    { value: "late", label: "L", icon: <Clock3 className="h-3.5 w-3.5" /> },
    { value: "excused", label: "E", icon: <UserMinus className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="flex items-center justify-between py-2.5 px-1 border-b border-border/40 last:border-0">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] uppercase shrink-0">
          {student.studentName.charAt(0)}
        </div>
        <div className="min-w-0">
          <span className="text-sm font-medium text-foreground truncate block">
            {student.studentName}
          </span>
          {student.parents.length > 0 && (
            <span className="text-[10px] text-muted-foreground truncate block">
              {student.parents.map(p => p.parentName).join(", ")}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {statusOptions.map(opt => {
          const isActive = status === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(student.id, isActive ? null : opt.value)}
              title={opt.label}
              className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? "bg-primary text-white shadow-sm"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Session Card Component ──────────────────────────────────────────────────

function SessionCardComponent({
  session,
  onTap,
  isExpanded,
}: {
  session: SessionCard;
  onTap: () => void;
  isExpanded: boolean;
}) {
  const cgNames = session.classGroups.map(cg => cg.groupName).join(", ");
  const roomNames = session.classGroups.flatMap(cg => cg.roomNames).filter(Boolean);
  const totalHeadcount = session.classGroups.reduce((sum, cg) => sum + cg.headcount, 0);
  const isPastSession = isPast(session.dateTime);
  const isUpcomingSession = isUpcoming(session.dateTime);

  return (
    <Card
      className={`border-border shadow-sm transition-all duration-200 cursor-pointer active:scale-[0.98] hover:shadow-md ${
        isPastSession ? "opacity-80" : ""
      }`}
      onClick={onTap}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Time and status */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-lg font-bold text-foreground tabular-nums">
                {formatTime(session.dateTime)}
              </span>
              {getStatusIcon(session.status)}
              <Badge variant="outline" className="text-[9px] py-0 px-1.5 uppercase font-bold bg-muted/30">
                {session.status || "scheduled"}
              </Badge>
            </div>

            {/* Class group names */}
            <div className="flex items-center gap-1.5 mb-0.5">
              <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-sm font-semibold text-foreground truncate">
                {cgNames || "No class group"}
              </span>
            </div>

            {/* Room and headcount */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
              {roomNames.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <DoorOpen className="h-3 w-3" />
                  <span>{roomNames.join(", ")}</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>{totalHeadcount} students</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <FileText className="h-3 w-3" />
                <span>{session.sessionId}</span>
              </div>
            </div>
          </div>

          {/* Expand indicator */}
          <div className="shrink-0 mt-1">
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Roster Drawer ───────────────────────────────────────────────────────────

function RosterDrawer({
  session,
  onClose,
}: {
  session: SessionCard;
  onClose: () => void;
}) {
  const [rosterData, setRosterData] = useState<RosterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Local attendance state
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  // Session completion toggle
  const [sessionCompleted, setSessionCompleted] = useState(false);
  // Hours confirmation
  const [hours, setHours] = useState<number>(1);
  // Class notes
  const [notes, setNotes] = useState("");
  // Submit attempt
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitResult, setSubmitResult] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRoster() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/teacher/sessions/${session.id}/roster`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        const data: RosterData = await res.json();
        setRosterData(data);

        // Initialize attendance from existing records
        const initialAttendance: Record<string, AttendanceStatus> = {};
        for (const student of data.students) {
          if (student.attendanceStatus) {
            initialAttendance[student.id] = student.attendanceStatus as AttendanceStatus;
          }
        }
        setAttendance(initialAttendance);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchRoster();
  }, [session.id]);

  const handleAttendanceChange = useCallback((studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  }, []);

  const handleMarkAllPresent = useCallback(() => {
    if (!rosterData) return;
    const allPresent: Record<string, AttendanceStatus> = {};
    for (const student of rosterData.students) {
      allPresent[student.id] = "present";
    }
    setAttendance(allPresent);
  }, [rosterData]);

  const handleSubmitAttendance = useCallback(async () => {
    setSubmitAttempted(true);
    setSubmitResult(null);
    try {
      const payload = {
        sessionId: session.id,
        attendance: Object.entries(attendance).map(([studentId, status]) => ({
          studentId,
          status,
        })),
      };
      const res = await fetch("/api/teacher/attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      setSubmitResult("Success");
      toast.success("Attendance saved successfully!");
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit attendance.");
      setSubmitResult(err.message || "Failed to submit attendance.");
    }
  }, [session.id, attendance, onClose]);

  const handleSubmitCompletion = useCallback(async () => {
    setSubmitAttempted(true);
    setSubmitResult("Completing sessions isn't enabled yet — this is a preview. Phase 3+ will enable writes.");
  }, []);

  const handleSubmitHours = useCallback(async () => {
    setSubmitAttempted(true);
    setSubmitResult("Confirming hours isn't enabled yet — this is a preview. Phase 3+ will enable writes.");
  }, []);

  const handleSubmitNotes = useCallback(async () => {
    setSubmitAttempted(true);
    setSubmitResult("Saving notes isn't enabled yet — this is a preview. Phase 3+ will enable writes.");
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed inset-x-0 bottom-0 top-16 bg-background border-t border-border rounded-t-2xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          <div className="text-center">
            <span className="text-sm font-bold text-foreground">{formatTime(session.dateTime)}</span>
            <span className="text-xs text-muted-foreground ml-2">
              {session.classGroups.map(cg => cg.groupName).join(", ")}
            </span>
          </div>
          <div className="w-12" />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
          {loading ? (
            <div className="space-y-3 py-8">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          ) : rosterData && rosterData.students.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No students enrolled in this session.</p>
            </div>
          ) : rosterData ? (
            <>
              {/* ─── Attendance Section ─── */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-bold text-foreground">Attendance</h3>
                  </div>
                  <button
                    onClick={handleMarkAllPresent}
                    className="text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <ListChecks className="h-3.5 w-3.5" />
                    Mark All Present
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Tap P (Present), A (Absent), L (Late), or E (Excused) for each student
                </p>

                <Card className="border-border shadow-sm">
                  <CardContent className="p-0">
                    {rosterData.students.map(student => (
                      <AttendanceRow
                        key={student.id}
                        student={student}
                        status={attendance[student.id] || null}
                        onChange={handleAttendanceChange}
                      />
                    ))}
                  </CardContent>
                </Card>

                {/* Marked count summary */}
                <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <UserCheck className="h-3 w-3 text-emerald-500" />
                    {Object.values(attendance).filter(v => v === "present").length} Present
                  </span>
                  <span className="flex items-center gap-1">
                    <UserX className="h-3 w-3 text-red-500" />
                    {Object.values(attendance).filter(v => v === "absent").length} Absent
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock3 className="h-3 w-3 text-amber-500" />
                    {Object.values(attendance).filter(v => v === "late").length} Late
                  </span>
                  <span className="flex items-center gap-1">
                    <UserMinus className="h-3 w-3 text-purple-500" />
                    {Object.values(attendance).filter(v => v === "excused").length} Excused
                  </span>
                  <span className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 text-muted-foreground" />
                    {rosterData.students.length - Object.values(attendance).filter(Boolean).length} Not Marked
                  </span>
                </div>

                {/* Submit Attendance Button */}
                <button
                  onClick={handleSubmitAttendance}
                  disabled={Object.values(attendance).filter(Boolean).length === 0}
                  className="w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                  Submit Attendance
                </button>
              </div>

              {/* ─── Divider ─── */}
              <hr className="border-border/60" />

              {/* ─── Session Completion Toggle ─── */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Session Completion</h3>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                  <div className="space-y-0.5">
                    <span className="text-sm font-medium text-foreground">Mark session as completed</span>
                    <p className="text-[10px] text-muted-foreground">Held sessions are ready for attendance finalization</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sessionCompleted}
                      onChange={(e) => setSessionCompleted(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-0.5 after:inset-s-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                  </label>
                </div>
                <button
                  onClick={handleSubmitCompletion}
                  className="w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Confirm Completion
                </button>
              </div>

              {/* ─── Divider ─── */}
              <hr className="border-border/60" />

              {/* ─── Hours Confirmation ─── */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Hours Confirmation</h3>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                  <span className="text-sm text-muted-foreground">Hours worked:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setHours(Math.max(0.5, hours - 0.5))}
                      className="h-7 w-7 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center text-sm font-bold cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-12 text-center text-sm font-bold tabular-nums">{hours}</span>
                    <button
                      onClick={() => setHours(Math.min(4, hours + 0.5))}
                      className="h-7 w-7 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center text-sm font-bold cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Note: Computed Pay (KGS) is not visible to teachers per system policy.
                </p>
                <button
                  onClick={handleSubmitHours}
                  className="w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Timer className="h-4 w-4" />
                  Confirm Hours
                </button>
              </div>

              {/* ─── Divider ─── */}
              <hr className="border-border/60" />

              {/* ─── Class Notes ─── */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Edit3 className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Class Notes</h3>
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Type your notes about this session..."
                  className="w-full min-h-20 p-3 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                <button
                  onClick={handleSubmitNotes}
                  className="w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FileText className="h-4 w-4" />
                  Save Notes
                </button>
              </div>

              {/* ─── Space at bottom ─── */}
              <div className="h-4" />
            </>
          ) : null}
        </div>

        {/* Submit Result Banner */}
        {submitResult && (
          <div className={`shrink-0 px-4 py-3 border-t ${
            submitResult === "Success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-amber-50 border-amber-200 text-amber-800"
          }`}>
            <div className="flex items-start gap-2">
              {submitResult === "Success" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <Ban className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-xs font-semibold">
                  {submitResult === "Success" ? "Attendance Saved Successfully" : "Submission Error"}
                </p>
                <p className="text-[10px]">
                  {submitResult === "Success" ? "The session has been completed and marked as Held." : submitResult}
                </p>
              </div>
              {submitResult !== "Success" && (
                <button
                  onClick={() => { setSubmitResult(null); setSubmitAttempted(false); }}
                  className="ml-auto text-amber-600 hover:text-amber-800 cursor-pointer"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Teacher Portal ──────────────────────────────────────────────────────

export function TeacherPortal() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - (offset * 60 * 1000));
    return local.toISOString().split("T")[0];
  });
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSession, setExpandedSession] = useState<SessionCard | null>(null);
  const [showAllSessions, setShowAllSessions] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/teacher/dashboard?date=${selectedDate}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data: DashboardData = await res.json();
      setDashboardData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="space-y-4 p-4 max-w-lg mx-auto">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
        <h2 className="text-lg font-bold text-foreground mb-1">Unable to Load</h2>
        <p className="text-sm text-muted-foreground">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center">
        <p className="text-sm text-muted-foreground">No data available.</p>
      </div>
    );
  }

  const sessions = dashboardData.sessions;
  const displaySessions = showAllSessions ? sessions : sessions.slice(0, 3);
  const hasMore = sessions.length > 3;
  const dateDisplay = formatDate(dashboardData.date);

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-5 pb-24">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-foreground tracking-tight">My Today</h1>
          <p className="text-xs text-muted-foreground">
            Welcome, {dashboardData.teacherName}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-muted/65 p-2 rounded-xl border border-border">
          <Calendar className="h-4 w-4 text-primary shrink-0" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent border-none text-xs font-semibold text-foreground focus:outline-none cursor-pointer w-28 text-center"
          />
        </div>
      </div>

      {/* ─── Summary Cards ─── */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="border-border shadow-sm bg-card">
          <CardContent className="p-3 text-center">
            <Calendar className="h-4 w-4 text-primary mx-auto mb-1" />
            <div className="text-lg font-bold text-foreground tabular-nums">{dashboardData.summary.totalSessionsToday}</div>
            <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Sessions</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm bg-card">
          <CardContent className="p-3 text-center">
            <Users className="h-4 w-4 text-primary mx-auto mb-1" />
            <div className="text-lg font-bold text-foreground tabular-nums">{dashboardData.summary.totalActiveStudents}</div>
            <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Students</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm bg-card">
          <CardContent className="p-3 text-center">
            <ClipboardCheck className="h-4 w-4 text-primary mx-auto mb-1" />
            <div className="text-lg font-bold text-foreground tabular-nums">{dashboardData.summary.pendingAttendance}</div>
            <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Session List ─── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">Schedule</h2>
          {sessions.length === 0 && (
            <Badge variant="outline" className="text-[9px] py-0 px-1.5 font-medium">No sessions today</Badge>
          )}
        </div>

        {sessions.length === 0 ? (
          <Card className="border-border shadow-sm bg-card">
            <CardContent className="p-8 text-center">
              <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No sessions scheduled for today.</p>
              <p className="text-[10px] text-muted-foreground mt-1">Enjoy your day off!</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-2">
              {displaySessions.map(session => (
                <SessionCardComponent
                  key={session.id}
                  session={session}
                  onTap={() => setExpandedSession(session)}
                  isExpanded={expandedSession?.id === session.id}
                />
              ))}
            </div>

            {/* Show more / less */}
            {hasMore && (
              <button
                onClick={() => setShowAllSessions(!showAllSessions)}
                className="w-full py-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                {showAllSessions ? (
                  <>Show Less <ChevronUp className="h-3.5 w-3.5" /></>
                ) : (
                  <>Show All ({sessions.length} sessions) <ChevronDown className="h-3.5 w-3.5" /></>
                )}
              </button>
            )}
          </>
        )}
      </div>

      {/* ─── Non-scheduled message ─── */}
      {sessions.length > 0 && (
        <div className="bg-muted/30 rounded-xl p-3 border border-border/60">
          <p className="text-[10px] text-muted-foreground text-center">
            Tap any session card to view the roster and mark attendance.
            Attendance submission will be available in a future update.
          </p>
        </div>
      )}

      {/* ─── Roster Drawer ─── */}
      {expandedSession && (
        <RosterDrawer
          session={expandedSession}
          onClose={() => {
            setExpandedSession(null);
            fetchDashboard();
          }}
        />
      )}
    </div>
  );
}