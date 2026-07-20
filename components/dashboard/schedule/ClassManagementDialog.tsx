"use client";

import React, { useState, useEffect } from "react";
import { X, Calendar, BookOpen, User, Home, Clock, Users } from "lucide-react";
import { toast } from "sonner";

interface Metadata {
  branches: { id: string; name: string }[];
  courses: { id: string; courseName: string }[];
  teachers: { id: string; fullName: string }[];
  rooms: { id: string; roomName: string }[];
  terms: { id: string; termName: string }[];
}

interface ClassManagementDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ClassManagementDialog({ onClose, onSuccess }: ClassManagementDialogProps) {
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [groupName, setGroupName] = useState("");
  const [branchId, setBranchId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [termId, setTermId] = useState("");
  const [capacity, setCapacity] = useState("8");
  const [startTime, setStartTime] = useState("16:00");
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const weekdays = [
    { label: "Mon", value: "Mon" },
    { label: "Tue", value: "Tue" },
    { label: "Wed", value: "Wed" },
    { label: "Thu", value: "Thu" },
    { label: "Fri", value: "Fri" },
    { label: "Sat", value: "Sat" },
    { label: "Sun", value: "Sun" },
  ];

  useEffect(() => {
    async function loadMetadata() {
      try {
        const res = await fetch("/api/dashboard/groups?metadata=true");
        if (!res.ok) {
          throw new Error("Failed to load layout scheduling metadata.");
        }
        const data = await res.json();
        setMetadata(data);
        if (data.branches?.length > 0) setBranchId(data.branches[0].id);
        if (data.courses?.length > 0) setCourseId(data.courses[0].id);
        if (data.teachers?.length > 0) setTeacherId(data.teachers[0].id);
        if (data.rooms?.length > 0) setRoomId(data.rooms[0].id);
        if (data.terms?.length > 0) setTermId(data.terms[0].id);
      } catch (err: any) {
        setError(err.message || "Failed to load dynamic metadata.");
      } finally {
        setLoading(false);
      }
    }
    loadMetadata();
  }, []);

  const handleWeekdayToggle = (value: string) => {
    setSelectedWeekdays((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!groupName.trim()) {
      setSubmitError("Group Name is required.");
      return;
    }
    if (selectedWeekdays.length === 0) {
      setSubmitError("Select at least one weekday.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/dashboard/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupName,
          branchId,
          courseId,
          teacherId: teacherId || null,
          roomId: roomId || null,
          termId,
          capacity: Number(capacity) || 8,
          weekdays: selectedWeekdays,
          startTime,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      onSuccess();
      toast.success(`Class group "${groupName}" created successfully!`);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to create class group.");
      setSubmitError(err.message || "Failed to create class group.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-background rounded-xl border border-border shadow-2xl flex flex-col max-h-[90vh] animate-in scale-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Create Class Group</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Loading configuration data...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-destructive font-medium">
            {error}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
            
            {/* Group Name */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Group Name
              </label>
              <input
                type="text"
                placeholder="e.g. English Kids Pro 1"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-shadow"
                disabled={submitting}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Branch */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                  <Home className="h-3 w-3" /> Branch
                </label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
                  disabled={submitting}
                >
                  {metadata?.branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Course */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                  <BookOpen className="h-3 w-3" /> Course
                </label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
                  disabled={submitting}
                >
                  {metadata?.courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.courseName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Teacher */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                  <User className="h-3 w-3" /> Teacher
                </label>
                <select
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
                  disabled={submitting}
                >
                  <option value="">-- No Teacher --</option>
                  {metadata?.teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Room */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                  <Home className="h-3 w-3" /> Room
                </label>
                <select
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
                  disabled={submitting}
                >
                  <option value="">-- No Room --</option>
                  {metadata?.rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.roomName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Term */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Term
                </label>
                <select
                  value={termId}
                  onChange={(e) => setTermId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
                  disabled={submitting}
                >
                  {metadata?.terms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.termName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Capacity */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                  <Users className="h-3 w-3" /> Capacity
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-shadow"
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Weekly Schedule & Start Time */}
            <div className="grid grid-cols-3 gap-4 items-end">
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Weekly Schedule
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {weekdays.map((day) => {
                    const isSelected = selectedWeekdays.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => handleWeekdayToggle(day.value)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground shadow-xs"
                            : "bg-card border-border hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                        }`}
                        disabled={submitting}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Start Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3.5 py-1.5 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
                  disabled={submitting}
                />
              </div>
            </div>

            {submitError && (
              <div className="text-xs font-semibold text-destructive mt-2 text-center bg-destructive/5 py-2 rounded-lg border border-destructive/10">
                {submitError}
              </div>
            )}

            {/* Footer buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-border hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                disabled={submitting}
              >
                {submitting ? "Creating..." : "Save Group"}
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  );
}
