"use client";

import { useState, useCallback, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { StatusBadge } from "./StatusBadge";
import { ProgressTracker } from "./ProgressTracker";
import { Timeline } from "./Timeline";
import { DeliveryChecklist } from "./DeliveryChecklist";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { NativeSelect } from "@/components/ui/native-select";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { updateOnboarding, selectOnboardingLoading } from "@/store/slices/onboardingSlice";
import {
  Phone, Mail, MessageSquare, User, UserCheck,
  Award, FileText, Landmark, Save, Loader2, AlertCircle, X
} from "lucide-react";

interface EnrollmentData {
  id: string;
  enrollmentId: string;
  enrollDate: string | Date | null;
  status: string | null;
  studentIds: string[];
  classGroupIds: string[];
  tuitionPlanIds: string[];
  branchIds: string[];
  trialFeeDeducted: boolean;
  contractSigned: boolean;
  contractDate: string | Date | null;
  hdSystemRegistered: boolean;
  appCredentialsIssued: boolean;
  scheduleDelivered: boolean;
  calendarDelivered: boolean;
  appInstructionsDelivered: boolean;
  audioRecommendationsDelivered: boolean;
  firstLessonConfirmed: boolean;
  firstLessonDate: string | Date | null;
  onboardingStatus: string | null;
}

interface StudentData {
  id: string;
  studentName: string;
  dateOfBirth?: string | Date | null;
  gender?: string | null;
  notes?: string | null;
  parentIds?: string[];
}

interface ParentData {
  id: string;
  parentName: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
}

interface OnboardingDrawerProps {
  enrollment: EnrollmentData | null;
  isOpen: boolean;
  onClose: () => void;
  student: StudentData | null;
  parent: ParentData | null;
  branchName: string | null;
  courseName: string | null;
  staffName: string | null;
}

/** Field IDs for Airtake */
const FIELD_IDS = {
  onboardingStatus: "fldV0VR7E7xehetvI",
  scheduleDelivered: "fldF5fb9UFQNHmObG",
  calendarDelivered: "fldhH2aL9TJzK7bVR",
  appInstructionsDelivered: "fldaLd0966SrwZDJv",
  audioRecommendationsDelivered: "fldWj3sCWbxwJnzNq",
  contractSigned: "fldblwDp8eo6EwKGB",
  contractDate: "fldi8KyGXRj5tuhoH",
  contractFile: "fldgQdBDRMGXJ2OUH",
  hdSystemRegistered: "fldz8xpBExqXB546O",
  appCredentialsIssued: "fldtgJU9259Sf78x9",
  firstLessonConfirmed: "fld0vvw0hpO2FZr3F",
  firstLessonDate: "fldMIiRIiEkU32lGv",
};

const ONBOARDING_STATUS_OPTIONS = ["Pending", "In Progress", "Complete"];

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
}

export function OnboardingDrawer({
  enrollment,
  isOpen,
  onClose,
  student,
  parent,
  branchName,
  courseName,
  staffName,
}: OnboardingDrawerProps) {
  const dispatch = useAppDispatch();
  const globalLoading = useAppSelector(selectOnboardingLoading);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Local form state - populated from enrollment when it opens
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Sync form state when enrollment changes (useEffect, not useState initializer)
  const prevEnrollmentRef = useRef(enrollment);
  if (enrollment !== prevEnrollmentRef.current) {
    prevEnrollmentRef.current = enrollment;
    if (enrollment) {
      setFormData({
        [FIELD_IDS.onboardingStatus]: enrollment.onboardingStatus || "Pending",
        [FIELD_IDS.scheduleDelivered]: enrollment.scheduleDelivered ?? false,
        [FIELD_IDS.calendarDelivered]: enrollment.calendarDelivered ?? false,
        [FIELD_IDS.appInstructionsDelivered]: enrollment.appInstructionsDelivered ?? false,
        [FIELD_IDS.audioRecommendationsDelivered]: enrollment.audioRecommendationsDelivered ?? false,
        [FIELD_IDS.contractSigned]: enrollment.contractSigned ?? false,
        [FIELD_IDS.contractDate]: formatDate(enrollment.contractDate),
        [FIELD_IDS.hdSystemRegistered]: enrollment.hdSystemRegistered ?? false,
        [FIELD_IDS.appCredentialsIssued]: enrollment.appCredentialsIssued ?? false,
        [FIELD_IDS.firstLessonConfirmed]: enrollment.firstLessonConfirmed ?? false,
        [FIELD_IDS.firstLessonDate]: formatDate(enrollment.firstLessonDate),
      });
      setSaveError(null);
    }
  }

  const handleFieldChange = useCallback((fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
    setSaveError(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!enrollment) return;

    setSaving(true);
    setSaveError(null);

    try {
      const result = await dispatch(updateOnboarding({
        enrollmentId: enrollment.id,
        fields: formData,
      }));

      if (updateOnboarding.fulfilled.match(result)) {
        toast.success("Onboarding checklist updated successfully.");
        onClose();
      } else {
        const errorMsg = (result.payload as string) || "Failed to save changes";
        toast.error(errorMsg);
        setSaveError(errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err.message || "Unexpected error saving onboarding data";
      toast.error(errorMsg);
      setSaveError(errorMsg);
    } finally {
      setSaving(false);
    }
  }, [dispatch, enrollment, formData, onClose]);

  // Reset on close
  const handleClose = useCallback(() => {
    if (saving) return; // prevent close while saving
    onClose();
  }, [saving, onClose]);

  if (!enrollment) return null;

  const formattedEnrollDate = enrollment.enrollDate
    ? new Date(enrollment.enrollDate).toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
      })
    : "—";

  // Resolve parent contact details safely
  const displayPhone = parent?.phone !== undefined ? (parent.phone || "—") : "— (Redacted)";
  const displayEmail = parent?.email !== undefined ? (parent.email || "—") : "— (Redacted)";
  const displayWhatsapp = parent?.whatsapp !== undefined ? (parent.whatsapp || "—") : "— (Redacted)";

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg lg:max-w-xl p-0 flex flex-col h-full bg-background border-l border-border shadow-2xl transition duration-300 select-none"
      >
        {/* Header */}
        <SheetHeader className="p-6 pb-4 border-b border-border/60 shrink-0 bg-card/50">
          <div className="flex flex-wrap gap-2 items-center mb-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              Onboarding Tracker
            </span>
            <StatusBadge status={formData[FIELD_IDS.onboardingStatus]} />
          </div>
          <SheetTitle className="text-xl font-extrabold text-foreground tracking-tight leading-none">
            {student?.studentName || "Onboarding Record"}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground mt-1">
            Enrollment ID: {enrollment.enrollmentId} • Course: {courseName || "—"}
          </SheetDescription>
        </SheetHeader>

        {/* Scrollable form content */}
        <form ref={formRef} className="flex-1 overflow-y-auto px-6 py-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="space-y-6 pb-8">

            {/* Completion Progress Bar */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <ProgressTracker enrollment={enrollment} />
            </div>

            {/* A. Onboarding Status */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">
                A. Onboarding Status
              </h3>
              <div className="space-y-2">
                <Label htmlFor="onboardingStatus" className="text-xs font-semibold text-muted-foreground">
                  Status
                </Label>
                <NativeSelect
                  id="onboardingStatus"
                  value={formData[FIELD_IDS.onboardingStatus] || "Pending"}
                  onChange={(e) => handleFieldChange(FIELD_IDS.onboardingStatus, e.target.value)}
                >
                  {ONBOARDING_STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </NativeSelect>
              </div>
            </div>

            {/* B. Delivery Checklist */}
            <DeliveryChecklist
              enrollment={{
                scheduleDelivered: formData[FIELD_IDS.scheduleDelivered] ?? false,
                calendarDelivered: formData[FIELD_IDS.calendarDelivered] ?? false,
                appInstructionsDelivered: formData[FIELD_IDS.appInstructionsDelivered] ?? false,
                audioRecommendationsDelivered: formData[FIELD_IDS.audioRecommendationsDelivered] ?? false,
              }}
              onChange={(field, value) => {
                const fieldMap: Record<string, string> = {
                  scheduleDelivered: FIELD_IDS.scheduleDelivered,
                  calendarDelivered: FIELD_IDS.calendarDelivered,
                  appInstructionsDelivered: FIELD_IDS.appInstructionsDelivered,
                  audioRecommendationsDelivered: FIELD_IDS.audioRecommendationsDelivered,
                };
                handleFieldChange(fieldMap[field], value);
              }}
            />

            {/* C. Contract */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">
                C. Contract
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="contractSigned" className="text-xs font-semibold text-muted-foreground cursor-pointer">
                    Contract Signed
                  </Label>
                  <Switch
                    id="contractSigned"
                    checked={formData[FIELD_IDS.contractSigned] ?? false}
                    onCheckedChange={(checked) => handleFieldChange(FIELD_IDS.contractSigned, checked)}
                  />
                </div>

                {(formData[FIELD_IDS.contractSigned]) && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="contractDate" className="text-xs font-semibold text-muted-foreground">
                        Contract Date <span className="text-destructive">*</span>
                      </Label>
                      <input
                        id="contractDate"
                        type="date"
                        value={formData[FIELD_IDS.contractDate] || ""}
                        onChange={(e) => handleFieldChange(FIELD_IDS.contractDate, e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contractFile" className="text-xs font-semibold text-muted-foreground">
                        Contract File (optional)
                      </Label>
                      <input
                        id="contractFile"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:text-xs file:font-semibold hover:file:bg-primary/20 transition-colors"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* D. HD System Registered */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">
                D. HD System Registered
              </h3>
              <div className="flex items-center justify-between">
                <Label htmlFor="hdSystem" className="text-xs font-semibold text-muted-foreground cursor-pointer">
                  Registered
                </Label>
                <Switch
                  id="hdSystem"
                  checked={formData[FIELD_IDS.hdSystemRegistered] ?? false}
                  onCheckedChange={(checked) => handleFieldChange(FIELD_IDS.hdSystemRegistered, checked)}
                />
              </div>
            </div>

            {/* E. App Credentials Issued */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">
                E. App Credentials Issued
              </h3>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="appCredentials" className="text-xs font-semibold text-muted-foreground cursor-pointer">
                    Credentials Issued
                  </Label>
                  <p className="text-[10px] text-muted-foreground/60">
                    Record issuance only — never store actual credentials
                  </p>
                </div>
                <Switch
                  id="appCredentials"
                  checked={formData[FIELD_IDS.appCredentialsIssued] ?? false}
                  onCheckedChange={(checked) => handleFieldChange(FIELD_IDS.appCredentialsIssued, checked)}
                />
              </div>
            </div>

            {/* F. First Lesson */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">
                F. First Lesson
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="firstLessonConfirmed" className="text-xs font-semibold text-muted-foreground cursor-pointer">
                    First Lesson Confirmed
                  </Label>
                  <Switch
                    id="firstLessonConfirmed"
                    checked={formData[FIELD_IDS.firstLessonConfirmed] ?? false}
                    onCheckedChange={(checked) => handleFieldChange(FIELD_IDS.firstLessonConfirmed, checked)}
                  />
                </div>

                {(formData[FIELD_IDS.firstLessonConfirmed]) && (
                  <div className="space-y-2">
                    <Label htmlFor="firstLessonDate" className="text-xs font-semibold text-muted-foreground">
                      First Lesson Date <span className="text-destructive">*</span>
                    </Label>
                    <input
                      id="firstLessonDate"
                      type="date"
                      value={formData[FIELD_IDS.firstLessonDate] || ""}
                      onChange={(e) => handleFieldChange(FIELD_IDS.firstLessonDate, e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                      required
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Save Error Banner */}
            {saveError && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div className="text-xs font-medium text-destructive">
                  {saveError}
                </div>
                <button
                  type="button"
                  onClick={() => setSaveError(null)}
                  className="shrink-0 ml-auto text-destructive/50 hover:text-destructive transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Student & Parent summaries (read-only) */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">
                Profile Summaries 
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-2">
                  <h4 className="font-bold flex items-center gap-1.5 uppercase text-[10px] tracking-wider text-muted-foreground">
                    <User className="h-3.5 w-3.5 text-primary" />
                    Student Info
                  </h4>
                  <div className="space-y-1">
                    <p className="font-bold text-foreground">{student?.studentName || "—"}</p>
                    {student?.dateOfBirth && (
                      <p className="text-muted-foreground">
                        DOB: {new Date(student.dateOfBirth).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    )}
                    {student?.gender && <p className="text-muted-foreground capitalize">Gender: {student.gender}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold flex items-center gap-1.5 uppercase text-[10px] tracking-wider text-muted-foreground">
                    <UserCheck className="h-3.5 w-3.5 text-primary" />
                    Parent Contact
                  </h4>
                  <div className="space-y-1 text-muted-foreground">
                    <p className="font-bold text-foreground">{parent?.parentName || "—"}</p>
                    <p className="truncate flex items-center gap-1"><Phone className="h-3 w-3" /> {displayPhone}</p>
                    <p className="truncate flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {displayWhatsapp}</p>
                    <p className="truncate flex items-center gap-1"><Mail className="h-3 w-3" /> {displayEmail}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Milestone metadata (read-only) */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">
                Milestone Metadata 
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-2">
                  <h4 className="font-bold flex items-center gap-1.5 uppercase text-[10px] tracking-wider text-muted-foreground">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    Contract Details
                  </h4>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">
                      Trial Fee Deducted: <span className="font-semibold text-foreground">{enrollment.trialFeeDeducted ? "Yes" : "No"}</span>
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold flex items-center gap-1.5 uppercase text-[10px] tracking-wider text-muted-foreground">
                    <Award className="h-3.5 w-3.5 text-primary" />
                    First Lesson
                  </h4>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">
                      Staff: <span className="font-semibold text-foreground truncate max-w-[120px] inline-block">{staffName || "Unassigned"}</span>
                    </p>
                  </div>
                </div>
                <div className="space-y-2 sm:col-span-2 border-t border-border/40 pt-3">
                  <h4 className="font-bold flex items-center gap-1.5 uppercase text-[10px] tracking-wider text-muted-foreground">
                    <Landmark className="h-3.5 w-3.5 text-primary" />
                    Tuition & Fee
                  </h4>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">
                      Enrolled: <span className="font-semibold text-foreground">{formattedEnrollDate}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline (read-only) */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">
                Onboarding Milestones
              </h3>
              <Timeline enrollment={enrollment} />
            </div>

          </div>
        </form>

        {/* Footer with Save button */}
        <div className="shrink-0 border-t border-border/60 bg-card/50 p-4 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving || globalLoading}
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5 mr-1.5" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}