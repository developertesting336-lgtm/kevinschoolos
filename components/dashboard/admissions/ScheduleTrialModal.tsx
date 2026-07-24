"use client";

import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  createTrialThunk,
  selectAdmissionsSavingTrial,
  selectAdmissionsSaveTrialError,
  selectAdmissionsClassGroups,
  selectAdmissionsUsers,
} from "@/store/slices/admissionsSlice";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, User, BookOpen, UserCheck, MessageSquare, AlertTriangle, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface ScheduleTrialModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
  leadBranchIds?: string[];
}

export function ScheduleTrialModal({
  isOpen,
  onClose,
  leadId,
  leadName,
  leadBranchIds = [],
}: ScheduleTrialModalProps) {
  const dispatch = useAppDispatch();
  const saving = useAppSelector(selectAdmissionsSavingTrial);
  const saveError = useAppSelector(selectAdmissionsSaveTrialError);
  const classGroups = useAppSelector(selectAdmissionsClassGroups);
  const users = useAppSelector(selectAdmissionsUsers);

  // Form state
  const [classGroupId, setClassGroupId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [trialDate, setTrialDate] = useState("");
  const [trialTime, setTrialTime] = useState("");
  const [confirmationMethod, setConfirmationMethod] = useState("WhatsApp");
  const [notes, setNotes] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Filter class groups based on lead's branch if possible
  const filteredClassGroups = classGroups.filter((cg: any) => {
    if (!leadBranchIds || leadBranchIds.length === 0) return true;
    if (!cg.branchIds || cg.branchIds.length === 0) return true;
    return cg.branchIds.some((bid: string) => leadBranchIds.includes(bid));
  });
  const displayClassGroups = filteredClassGroups.length > 0 ? filteredClassGroups : classGroups;

  // Filter teachers (role contains teacher, or fallback to all users)
  const teacherUsers = users.filter((u: any) => {
    if (!u.role) return false;
    return u.role.toLowerCase().includes("teacher");
  });
  const displayTeachers = teacherUsers.length > 0 ? teacherUsers : users;

  const todayStr = new Date().toISOString().split("T")[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!classGroupId) {
      setValidationError("Please select a Class Group.");
      return;
    }
    if (!teacherId) {
      setValidationError("Please select a Teacher.");
      return;
    }
    if (!trialDate) {
      setValidationError("Trial Date is required.");
      return;
    }
    if (!trialTime) {
      setValidationError("Trial Time is required.");
      return;
    }

    try {
      const result = await dispatch(
        createTrialThunk({
          leadId,
          classGroupId,
          teacherId,
          trialDate,
          trialTime,
          confirmationMethod,
          notes: notes.trim(),
        })
      ).unwrap();

      if (result) {
        toast.success(`Trial lesson scheduled successfully for ${leadName}!`);
        handleReset();
        onClose();
      }
    } catch (err: any) {
      const errMsg = typeof err === "string" ? err : err?.message || "Failed to schedule trial lesson.";
      setValidationError(errMsg);
      toast.error(errMsg);
    }
  };

  const handleReset = () => {
    setClassGroupId("");
    setTeacherId("");
    setTrialDate("");
    setTrialTime("");
    setConfirmationMethod("WhatsApp");
    setNotes("");
    setValidationError(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="max-w-3xl sm:max-w-3xl w-[95vw] lg:w-[calc(100vw-38rem)] xl:w-full lg:max-w-[calc(100vw-38rem)] xl:max-w-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl p-6 sm:p-8 rounded-3xl select-none max-h-[90vh] overflow-y-auto left-1/2 lg:left-6 xl:left-12 -translate-x-1/2 lg:translate-x-0">
        <DialogHeader className="space-y-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/20 shrink-0">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Schedule Trial Lesson
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">
                  Admissions
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Book a trial session for this lead.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* Validation & Redux errors */}
          {(validationError || saveError) && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 text-xs rounded-xl font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{validationError || saveError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left Section: Lead & Group Placement */}
            <div className="space-y-4 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 p-5 rounded-2xl">
              <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-wider text-slate-600 dark:text-slate-400 uppercase border-b border-slate-200/60 dark:border-slate-700/60 pb-2.5">
                <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>LEAD &amp; GROUP PLACEMENT</span>
              </div>

              {/* Read-only Lead Field */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Lead Name
                </Label>
                <div className="relative">
                  <Input
                    value={leadName}
                    readOnly
                    disabled
                    className="h-10 text-xs rounded-2xl bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-700 px-4 font-semibold text-slate-700 dark:text-slate-300 cursor-not-allowed opacity-100 select-none shadow-2xs"
                  />
                </div>
              </div>

              {/* Class Group Dropdown */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5" htmlFor="classGroupId">
                  <BookOpen className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  Class Group *
                </Label>
                <select
                  id="classGroupId"
                  value={classGroupId}
                  onChange={(e) => setClassGroupId(e.target.value)}
                  className="w-full h-10 px-4 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-800 dark:text-slate-200 cursor-pointer shadow-2xs"
                >
                  <option value="">Select Class Group...</option>
                  {displayClassGroups.map((cg: any) => (
                    <option key={cg.id} value={cg.id}>
                      {cg.groupName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Teacher Dropdown */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5" htmlFor="teacherId">
                  <UserCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Assigned Teacher *
                </Label>
                <select
                  id="teacherId"
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  className="w-full h-10 px-4 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-800 dark:text-slate-200 cursor-pointer shadow-2xs"
                >
                  <option value="">Select Teacher...</option>
                  {displayTeachers.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right Section: Timing & Confirmation */}
            <div className="space-y-4 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 p-5 rounded-2xl">
              <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-wider text-slate-600 dark:text-slate-400 uppercase border-b border-slate-200/60 dark:border-slate-700/60 pb-2.5">
                <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>TIMING &amp; CONFIRMATION</span>
              </div>

              {/* Date & Time Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5" htmlFor="trialDate">
                    <Calendar className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    Trial Date *
                  </Label>
                  <Input
                    id="trialDate"
                    type="date"
                    min={todayStr}
                    value={trialDate}
                    onChange={(e) => setTrialDate(e.target.value)}
                    className="h-10 text-xs rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 px-3 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-slate-800 dark:text-slate-200 shadow-2xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5" htmlFor="trialTime">
                    <Clock className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                    Trial Time *
                  </Label>
                  <Input
                    id="trialTime"
                    type="time"
                    value={trialTime}
                    onChange={(e) => setTrialTime(e.target.value)}
                    className="h-10 text-xs rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 px-3 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-slate-800 dark:text-slate-200 shadow-2xs"
                  />
                </div>
              </div>

              {/* Confirmation Method */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5" htmlFor="confirmationMethod">
                  <MessageSquare className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  Confirmation Channel
                </Label>
                <select
                  id="confirmationMethod"
                  value={confirmationMethod}
                  onChange={(e) => setConfirmationMethod(e.target.value)}
                  className="w-full h-10 px-4 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-800 dark:text-slate-200 cursor-pointer shadow-2xs"
                >
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Phone">Phone Call</option>
                  <option value="Email">Email</option>
                  <option value="SMS">SMS Message</option>
                </select>
              </div>
            </div>
          </div>

          {/* Full-width Notes Section */}
          <div className="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 p-5 rounded-2xl space-y-1.5">
            <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5" htmlFor="notes">
              <MessageSquare className="h-3.5 w-3.5 text-slate-500" />
              Trial Session Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Add specific instructions, student skill observations, preferred timing, or teacher remarks..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs min-h-17.5 rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 p-3.5 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 placeholder:text-slate-400 shadow-2xs"
            />
          </div>

          {/* Modal Actions */}
          <DialogFooter className="gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                handleReset();
                onClose();
              }}
              disabled={saving}
              className="h-10 text-xs rounded-2xl px-5 border-slate-200 dark:border-slate-700 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="h-10 text-xs rounded-2xl px-6 font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20 gap-2"
            >
              <Calendar className="h-4 w-4" />
              {saving ? "Scheduling..." : "Schedule Trial"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
