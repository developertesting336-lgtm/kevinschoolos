"use client";

import React, { useState, useEffect } from "react";
import { X, Users, Search, CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";

interface StudentItem {
  id: string;
  name: string;
}

interface EnrollStudentsDialogProps {
  classGroupId: string;
  groupName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EnrollStudentsDialog({
  classGroupId,
  groupName,
  onClose,
  onSuccess,
}: EnrollStudentsDialogProps) {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEnrollments() {
      try {
        const res = await fetch(`/api/dashboard/groups/enroll?classGroupId=${classGroupId}`);
        if (!res.ok) {
          throw new Error("Failed to load student roster data.");
        }
        const data = await res.json();
        setStudents(data.students || []);
        setSelectedIds(data.enrolledStudentIds || []);
      } catch (err: any) {
        setError(err.message || "Failed to load database records.");
      } finally {
        setLoading(false);
      }
    }
    loadEnrollments();
  }, [classGroupId]);

  const handleToggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(filteredStudents.map((s) => s.id));
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/groups/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classGroupId,
          studentIds: selectedIds,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      onSuccess();
      toast.success("Student enrollment updated successfully!");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to save student enrollments.");
      setSaveError(err.message || "Failed to save student enrollments.");
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-background rounded-xl border border-border shadow-2xl flex flex-col h-[75vh] animate-in scale-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-sm font-bold text-foreground">Enroll Students</h2>
              <p className="text-[10px] text-muted-foreground font-medium uppercase mt-0.5">
                Class Group: {groupName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search Bar */}
        {!loading && !error && (
          <div className="px-6 py-3 border-b border-border shrink-0 bg-muted/10 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
              <input
                type="text"
                placeholder="Search students..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-2 py-1 text-[10px] font-bold text-primary hover:bg-primary/5 rounded border border-primary/20 transition-all cursor-pointer"
              >
                All
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="px-2 py-1 text-[10px] font-bold text-muted-foreground hover:bg-muted rounded border border-border transition-all cursor-pointer"
              >
                None
              </button>
            </div>
          </div>
        )}

        {/* Content list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {loading ? (
            // Skeleton Optimization Loader
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/40 animate-pulse bg-muted/20">
                  <div className="h-4 w-4 rounded bg-muted shrink-0" />
                  <div className="h-3.5 w-32 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center text-xs font-semibold text-destructive py-8">
              {error}
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-8">
              No students found.
            </div>
          ) : (
            <div className="space-y-1">
              {filteredStudents.map((student) => {
                const isSelected = selectedIds.includes(student.id);
                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => handleToggle(student.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-all text-left cursor-pointer ${
                      isSelected
                        ? "bg-primary/5 border-primary/30 text-foreground"
                        : "bg-card border-border hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="text-xs font-semibold">{student.name}</span>
                    {isSelected ? (
                      <CheckSquare className="h-4 w-4 text-primary shrink-0" />
                    ) : (
                      <Square className="h-4 w-4 text-muted-foreground/45 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/5 shrink-0 flex flex-col gap-2">
          {saveError && (
            <div className="text-[10px] font-bold text-destructive text-center bg-destructive/5 py-1.5 rounded border border-destructive/10">
              {saveError}
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase">
              {selectedIds.length} Selected
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg border border-border hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
