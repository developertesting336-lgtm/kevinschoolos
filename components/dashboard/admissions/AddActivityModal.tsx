"use client";

import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { createActivityThunk, selectAdmissionsSavingActivity, selectAdmissionsSaveActivityError } from "@/store/slices/admissionsSlice";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Calendar, Info } from "lucide-react";

interface AddActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
}

export function AddActivityModal({ isOpen, onClose, leadId, leadName }: AddActivityModalProps) {
  const dispatch = useAppDispatch();
  const saving = useAppSelector(selectAdmissionsSavingActivity);
  const saveError = useAppSelector(selectAdmissionsSaveActivityError);

  // Form State
  const [activityType, setActivityType] = useState("Call");
  const [notes, setNotes] = useState("");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const activityTypes = [
    "Call",
    "WhatsApp",
    "Email",
    "SMS",
    "Walk-in",
    "Trial Follow-up",
    "Other",
    "Consultation"
  ];

  // Format today's date to YYYY-MM-DD for min date picker restriction
  const todayStr = new Date().toISOString().split("T")[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!notes.trim()) {
      setValidationError("Activity notes/summary is required.");
      return;
    }

    if (nextFollowUpDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selected = new Date(nextFollowUpDate);
      if (selected.getTime() < today.getTime()) {
        setValidationError("Next follow-up date must be today or in the future.");
        return;
      }
    }

    const payload = {
      activityType,
      notes: notes.trim(),
      nextFollowUpDate: nextFollowUpDate || null,
      leadId
    };

    try {
      const result = await dispatch(createActivityThunk(payload)).unwrap();
      if (result) {
        handleReset();
        onClose();
      }
    } catch (err: any) {
      // Error handled by redux state, but unwrap throws it
    }
  };

  const handleReset = () => {
    setActivityType("Call");
    setNotes("");
    setNextFollowUpDate("");
    setValidationError(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-card border border-border/80 shadow-2xl p-6 rounded-2xl select-none">
        <DialogHeader>
          <DialogTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Log Activity for {leadName}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Document a touchpoint. This creates an append-only activity record linked to this lead.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Validation & Redux errors */}
          {(validationError || saveError) && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl font-medium">
              {validationError || saveError}
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs font-bold" htmlFor="activityType">Activity Type *</Label>
            <select
              id="activityType"
              value={activityType}
              onChange={(e) => setActivityType(e.target.value)}
              className="w-full h-9 px-3 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {activityTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold" htmlFor="activityNotes">Activity Notes / Summary *</Label>
            <Textarea
              id="activityNotes"
              placeholder="What was discussed? Write notes about the interaction..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs min-h-[90px] rounded-lg"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold flex items-center gap-1" htmlFor="nextFollowUpDate">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              Set Next Follow-up Date (Optional)
            </Label>
            <input
              id="nextFollowUpDate"
              type="date"
              min={todayStr}
              value={nextFollowUpDate}
              onChange={(e) => setNextFollowUpDate(e.target.value)}
              className="w-full h-9 px-3 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
            />
            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <Info className="h-3 w-3" /> Leave empty if no further follow-up is scheduled.
            </p>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-border/40 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                handleReset();
                onClose();
              }}
              disabled={saving}
              className="h-9 text-xs rounded-lg"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="h-9 text-xs rounded-lg px-5 font-bold"
            >
              {saving ? "Saving..." : "Log Activity"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
