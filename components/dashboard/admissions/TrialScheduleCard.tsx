"use client";

import { useState, useMemo } from "react";
import { Calendar, User, Home, CheckCircle2, AlertCircle, HelpCircle, MessageSquare, Save, Loader2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { updateTrialOutcomeThunk } from "@/store/slices/admissionsSlice";
import { selectAuthRole } from "@/store/slices/authSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface TrialScheduleCardProps {
  trial: {
    id: string;
    trialId: string;
    dateTime: string | Date | null;
    outcome: string | null;
    notes: string | null;
    confirmationMethod?: string | null;
    confirmationSent?: boolean;
  } | null;
  teacherName: string | null;
  roomName: string | null;
}

const VALID_OUTCOMES = ["Attended", "No-show","Declined", "Rescheduled"];

export function TrialScheduleCard({ trial, teacherName, roomName }: TrialScheduleCardProps) {
  const dispatch = useAppDispatch();
  const userRole = useAppSelector(selectAuthRole);
  const roleLower = (userRole || "").toLowerCase().trim();
  const canEditOutcome = ["owner", "office_admin"].includes(roleLower);

  const [isEditing, setIsEditing] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState(trial?.outcome || "Scheduled");
  const [notes, setNotes] = useState(trial?.notes || "");
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // State for reschedule date/time
  const [newTrialDate, setNewTrialDate] = useState("");
  const [newTrialTime, setNewTrialTime] = useState("");

  // Whether the Rescheduled fields should be shown
  const isRescheduling = selectedOutcome === "Rescheduled";

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  if (!trial || (trial.outcome || "").toLowerCase().trim() === "converted") {
    return null;
  }

  const hasDateTime = !!trial.dateTime;
  const trialDate = hasDateTime ? new Date(trial.dateTime!).toLocaleDateString("en-US", {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }) : "—";
  
  const trialTime = hasDateTime ? new Date(trial.dateTime!).toLocaleTimeString("en-US", {
    hour: '2-digit',
    minute: '2-digit'
  }) : "—";

  const outcome = trial.outcome || "Scheduled";
  const outcomeLower = outcome.toLowerCase();

  let statusColor = "bg-primary/10 border-primary/20 text-primary";
  let StatusIcon = HelpCircle;

  if (outcomeLower === "attended" || outcomeLower === "converted" || outcomeLower === "пришёл") {
    statusColor = "bg-emerald-500/10 border-emerald-500/20 text-emerald-600";
    StatusIcon = CheckCircle2;
  } else if (outcomeLower === "no-show" || outcomeLower === "declined" || outcomeLower === "не пришёл" || outcomeLower === "отказался") {
    statusColor = "bg-rose-500/10 border-rose-500/20 text-rose-600";
    StatusIcon = AlertCircle;
  } else if (outcomeLower === "scheduled" || outcomeLower === "запланирован") {
    statusColor = "bg-blue-500/10 border-blue-500/20 text-blue-600";
    StatusIcon = Calendar;
  }

  const handleSave = async () => {
    if (!trial.id) return;
    setValidationError(null);

    // Client-side validation for Rescheduled
    if (selectedOutcome === "Rescheduled") {
      if (!newTrialDate || !newTrialTime) {
        setValidationError("New Trial Date and Time are required when rescheduling.");
        return;
      }
      const dateTimeStr = `${newTrialDate}T${newTrialTime}:00`;
      const parsed = new Date(dateTimeStr);
      if (isNaN(parsed.getTime())) {
        setValidationError("Invalid new trial date or time format.");
        return;
      }
      if (parsed <= new Date()) {
        setValidationError("The rescheduled trial date and time must be in the future.");
        return;
      }
    }

    setSaving(true);
    try {
      const payload: any = {
        trialId: trial.id,
        outcome: selectedOutcome,
        notes: notes.trim() || undefined,
      };
      if (selectedOutcome === "Rescheduled") {
        payload.newTrialDate = newTrialDate;
        payload.newTrialTime = newTrialTime;
      }

      const result = await dispatch(
        updateTrialOutcomeThunk(payload)
      ).unwrap();

      if (result) {
        toast.success(`Trial outcome updated to "${selectedOutcome}"`);
        setIsEditing(false);
        setNewTrialDate("");
        setNewTrialTime("");
      }
    } catch (err: any) {
      const errMsg = typeof err === "string" ? err : err?.message || "Failed to update trial outcome.";
      setValidationError(errMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    const currentOutcome = trial.outcome || "";
    const defaultOutcome = VALID_OUTCOMES.includes(currentOutcome) ? currentOutcome : VALID_OUTCOMES[0];
    setSelectedOutcome(defaultOutcome);
    setNotes(trial.notes || "");
    setNewTrialDate("");
    setNewTrialTime("");
    setValidationError(null);
    setIsEditing(false);
  };

  const handleStartEdit = () => {
    // Default to first valid outcome if current trial outcome is not in the valid list
    const currentOutcome = trial.outcome || "";
    const defaultOutcome = VALID_OUTCOMES.includes(currentOutcome) ? currentOutcome : VALID_OUTCOMES[0];
    setSelectedOutcome(defaultOutcome);
    setNotes(trial.notes || "");
    setNewTrialDate("");
    setNewTrialTime("");
    setValidationError(null);
    setIsEditing(true);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4 select-none">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
          Trial Information
        </h3>
        {!isEditing ? (
          <span className={cn("inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border", statusColor)}>
            <StatusIcon className="h-3.5 w-3.5 shrink-0" />
            {outcome}
          </span>
        ) : (
          <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
            Editing
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Date / Time Card */}
        <div className="bg-muted/30 border border-border/50 rounded-lg p-3 space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1.5">
            <Calendar className="h-3 w-3 text-primary" />
            Date & Time
          </span>
          <p className="text-xs font-bold text-foreground">{trialDate}</p>
          <p className="text-[11px] text-muted-foreground font-medium">{trialTime}</p>
        </div>

        {/* Staff & Room Card */}
        <div className="bg-muted/30 border border-border/50 rounded-lg p-3 space-y-2">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1.5">
              <User className="h-3 w-3 text-primary" />
              Teacher
            </span>
            <p className="text-xs font-bold text-foreground truncate">{teacherName || "—"}</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1.5">
              <Home className="h-3 w-3 text-primary" />
              Room
            </span>
            <p className="text-xs font-bold text-foreground truncate">{roomName || "—"}</p>
          </div>
        </div>
      </div>

      {/* Confirmation Method Display */}
      {trial.confirmationMethod && (
        <div className="bg-muted/30 border border-border/50 rounded-lg p-3">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1.5">
            <MessageSquare className="h-3 w-3 text-primary" />
            Confirmation
          </span>
          <p className="text-xs font-semibold text-foreground mt-0.5">
            Sent via {trial.confirmationMethod}
            {trial.confirmationSent ? (
              <span className="ml-1.5 text-emerald-600 font-bold">✓</span>
            ) : null}
          </p>
        </div>
      )}

      {/* Editable Outcome Section (Owner / Office Admin only) */}
      {canEditOutcome && (
        <div className="border-t border-border/50 pt-3 space-y-3">
          {!isEditing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartEdit}
              className="w-full text-xs font-semibold rounded-xl border-primary/20 text-primary hover:bg-primary/5"
            >
              Update Trial Outcome
            </Button>
          ) : (
            <div className="space-y-3">
              {/* Validation Error */}
              {validationError && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 text-xs rounded-xl font-medium">
                  {validationError}
                </div>
              )}

              {/* Outcome Dropdown */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Outcome *
                </span>
                <select
                  value={selectedOutcome}
                  onChange={(e) => {
                    setSelectedOutcome(e.target.value);
                    setValidationError(null);
                  }}
                  className="w-full h-9 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-slate-800 dark:text-slate-200 cursor-pointer shadow-xs"
                >
                  {VALID_OUTCOMES.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reschedule Date/Time Fields (shown only when Rescheduled is selected) */}
              {isRescheduling && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 space-y-3">
                  <p className="text-[10px] uppercase font-bold text-amber-600 tracking-wider flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    New Schedule (Required)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-muted-foreground">Date</span>
                      <Input
                        type="date"
                        min={todayStr}
                        value={newTrialDate}
                        onChange={(e) => setNewTrialDate(e.target.value)}
                        className="h-9 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 px-3 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-muted-foreground">Time</span>
                      <Input
                        type="time"
                        value={newTrialTime}
                        onChange={(e) => setNewTrialTime(e.target.value)}
                        className="h-9 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 px-3 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Notes Editor */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Notes
                </span>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about the trial outcome..."
                  className="text-xs min-h-15 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 p-2.5 focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-slate-400 shadow-xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex-1 h-8 text-xs rounded-xl border-slate-200 dark:border-slate-700 font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 h-8 text-xs rounded-xl font-bold gap-1.5"
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Read-only Notes Display (when not editing) */}
      {!isEditing && trial.notes && (
        <div className="bg-muted/40 border border-border/50 rounded-lg p-3">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">
            Trial Notes
          </span>
          <p className="text-xs text-muted-foreground leading-relaxed italic">
            "{trial.notes}"
          </p>
        </div>
      )}
    </div>
  );
}