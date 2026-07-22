"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { convertLeadThunk, selectAdmissionsClassGroups, selectAdmissionsBranches, fetchAdmissionsData } from "@/store/slices/admissionsSlice";
import { fetchOnboardingData } from "@/store/slices/onboardingSlice";
import { fetchStudentsData } from "@/store/slices/studentsSlice";
import { fetchEnrollments } from "@/store/slices/enrollmentsSlice";
import { fetchTrials } from "@/store/slices/trialsSlice";
import { fetchParents } from "@/store/slices/parentsSlice";
import { fetchPaymentsData } from "@/store/slices/paymentsSlice";
import { fetchOwnerDashboard, fetchSmmDashboardData } from "@/store/slices/dashboardSlice";
import { Loader2, CheckCircle2, ArrowRight, ArrowLeft, User, GraduationCap, BookOpen, FileText, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeadData {
  id: string;
  leadName: string;
  phone: string | null;
  whatsapp: string | null;
  channel: string | null;
  status: string | null;
  parentIds: string[];
  branchIds: string[];
  ownerIds: string[];
  notes: string | null;
  preferredLanguage: string | null;
  childAge: number | null;
  inquiryDate: string | Date | null;
  lostReason: string | null;
}

interface ConvertLeadModalProps {
  lead: LeadData | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const STEPS = [
  { id: 1, label: "Parent", icon: User, desc: "Reuse or create" },
  { id: 2, label: "Student", icon: GraduationCap, desc: "Name & DOB" },
  { id: 3, label: "Course", icon: BookOpen, desc: "Class group" },
  { id: 4, label: "Enrollment", icon: FileText, desc: "Plan & status" },
  { id: 5, label: "Confirm", icon: PartyPopper, desc: "Review & finish" },
];

export function ConvertLeadModal({ lead, isOpen, onClose, onSuccess }: ConvertLeadModalProps) {
  const dispatch = useAppDispatch();
  const classGroups = useAppSelector(selectAdmissionsClassGroups);
  const branches = useAppSelector(selectAdmissionsBranches);

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [savingError, setSavingError] = useState<string | null>(null);

  // Form state
  const [parentInfo, setParentInfo] = useState({ name: "", phone: "", whatsapp: "", email: "" });
  const [studentInfo, setStudentInfo] = useState({ name: "", dob: "", gender: "" });
  const [classGroupId, setClassGroupId] = useState("");
  const [tuitionPlanId, setTuitionPlanId] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [courses, setCourses] = useState<any[]>([]);
  const [tuitionPlans, setTuitionPlans] = useState<any[]>([]);
  const [enrollDate, setEnrollDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [enrollmentStatus, setEnrollmentStatus] = useState("Active");
  const [completeTrial, setCompleteTrial] = useState(true);

  // Reset form when modal opens with a new lead
  useEffect(() => {
    if (lead && isOpen) {
      setStep(1);
      setSaving(false);
      setResult(null);
      setSavingError(null);
      setParentInfo({
        name: lead.leadName || "",
        phone: lead.phone || "",
        whatsapp: lead.whatsapp || "",
        email: "",
      });
      setStudentInfo({
        name: lead.leadName || "",
        dob: "",
        gender: "",
      });
      setClassGroupId("");
      setTuitionPlanId("");
      setSelectedBranchId(lead.branchIds?.[0] || "");
      setSelectedCourseId("");
      setEnrollDate(new Date().toISOString().split("T")[0]);
      setEnrollmentStatus("Active");
      setCompleteTrial(true);
    }
  }, [lead, isOpen]);

  // Fetch courses and tuition plans when modal opens
  useEffect(() => {
    if (isOpen) {
      fetch("/api/data/course")
        .then((res) => res.json())
        .then((data) => setCourses(Array.isArray(data) ? data : []))
        .catch((err) => console.error("Error fetching courses:", err));

      fetch("/api/data/tuitionplan")
        .then((res) => res.json())
        .then((data) => setTuitionPlans(Array.isArray(data) ? data : []))
        .catch((err) => console.error("Error fetching tuition plans:", err));
    }
  }, [isOpen]);

  if (!lead) return null;

  // Filter class group options by selected Course and Branch
  const classGroupOptions = classGroups.filter((cg: any) => {
    const matchesBranch = selectedBranchId ? cg.branchIds?.includes(selectedBranchId) : true;
    const matchesCourse = selectedCourseId ? cg.courseIds?.includes(selectedCourseId) : true;
    return matchesBranch && matchesCourse;
  });

  const handleNext = () => {
    if (step === 1 && !parentInfo.name.trim()) {
      toast.error("Parent name is required.");
      return;
    }
    if (step === 2 && !studentInfo.name.trim()) {
      toast.error("Student name is required.");
      return;
    }
    if (step === 3) {
      if (!selectedBranchId) {
        toast.error("Please select a branch.");
        return;
      }
      if (!selectedCourseId) {
        toast.error("Please select a course.");
        return;
      }
      if (!classGroupId) {
        toast.error("Please select a class group.");
        return;
      }
    }
    if (step === 4 && !tuitionPlanId) {
      toast.error("Please select a tuition plan.");
      return;
    }
    setStep((prev) => Math.min(prev + 1, 5));
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleConvert = async () => {
    setSaving(true);
    setSavingError(null);

    try {
      const resultAction = await dispatch(convertLeadThunk({
        leadId: lead.id,
        parentInfo: {
          name: parentInfo.name,
          phone: parentInfo.phone || undefined,
          whatsapp: parentInfo.whatsapp || undefined,
          email: parentInfo.email || undefined,
        },
        studentInfo: {
          name: studentInfo.name,
          dob: studentInfo.dob || undefined,
          gender: studentInfo.gender || undefined,
        },
        classGroupId,
        tuitionPlanId,
        enrollDate: enrollDate || undefined,
        enrollmentStatus,
        completeTrial,
      }));

      if (convertLeadThunk.fulfilled.match(resultAction)) {
        const data = resultAction.payload as any;
        const responseData = data.data || data;
        
        // Build a detailed success message including invoice info
        let successMsg = "Lead converted successfully!";
        if (responseData.invoiceNo) {
          successMsg += ` Invoice ${responseData.invoiceNo} created (${responseData.invoiceAmount?.toLocaleString() || "—"} KGS).`;
        }
        
        toast.success(successMsg, {
          duration: 5000,
        });
        
        // Refresh all relevant stores so that UI changes propagate immediately
        dispatch(fetchAdmissionsData({ forceRefetch: true }));
        dispatch(fetchOnboardingData({ forceRefetch: true }));
        dispatch(fetchStudentsData({ page: "1", search: "" }));
        dispatch(fetchEnrollments());
        dispatch(fetchTrials());
        dispatch(fetchParents());
        dispatch(fetchPaymentsData({}));
        dispatch(fetchOwnerDashboard({}));
        dispatch(fetchSmmDashboardData());
        
        // Auto-close the modal and drawer after a brief delay on success
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          } else {
            onClose();
          }
        }, 1500);
      } else {
        const errorMsg = (resultAction.payload as string) || "Failed to convert lead";
        setSavingError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err.message || "Unexpected error";
      setSavingError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = () => {
    if (onSuccess) onSuccess();
    onClose();
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="bg-muted/20 border border-border/40 rounded-xl p-4">
        <p className="text-xs text-muted-foreground mb-2">
          Information captured from the lead. We'll search for an existing parent by email, phone, or WhatsApp first.
        </p>
      </div>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Parent Name *</Label>
          <input
            type="text"
            value={parentInfo.name}
            onChange={(e) => setParentInfo((p) => ({ ...p, name: e.target.value }))}
            className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="Full name"
            required
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Phone</Label>
            <input
              type="tel"
              value={parentInfo.phone}
              onChange={(e) => setParentInfo((p) => ({ ...p, phone: e.target.value }))}
              className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="+996 XXX XXX XXX"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">WhatsApp</Label>
            <input
              type="tel"
              value={parentInfo.whatsapp}
              onChange={(e) => setParentInfo((p) => ({ ...p, whatsapp: e.target.value }))}
              className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="+996 XXX XXX XXX"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Email</Label>
          <input
            type="email"
            value={parentInfo.email}
            onChange={(e) => setParentInfo((p) => ({ ...p, email: e.target.value }))}
            className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="parent@example.com"
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="bg-muted/20 border border-border/40 rounded-xl p-4">
        <p className="text-xs text-muted-foreground">
          Create the student record. Age is computed automatically from DOB — never write it.
        </p>
      </div>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Student Name *</Label>
          <input
            type="text"
            value={studentInfo.name}
            onChange={(e) => setStudentInfo((s) => ({ ...s, name: e.target.value }))}
            className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="Full name"
            required
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Date of Birth</Label>
            <input
              type="date"
              value={studentInfo.dob}
              onChange={(e) => setStudentInfo((s) => ({ ...s, dob: e.target.value }))}
              className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Gender</Label>
            <NativeSelect
              value={studentInfo.gender}
              onChange={(e) => setStudentInfo((s) => ({ ...s, gender: e.target.value }))}
            >
              <option value="">Select...</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </NativeSelect>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="bg-muted/20 border border-border/40 rounded-xl p-4">
        <p className="text-xs text-muted-foreground">
          Select the branch, course, and class group. Groups with full capacity will be disabled.
        </p>
      </div>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Branch *</Label>
          <NativeSelect
            value={selectedBranchId}
            onChange={(e) => {
              setSelectedBranchId(e.target.value);
              setClassGroupId("");
            }}
          >
            <option value="">Select a branch...</option>
            {branches.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Course *</Label>
          <NativeSelect
            value={selectedCourseId}
            onChange={(e) => {
              setSelectedCourseId(e.target.value);
              setClassGroupId("");
              setTuitionPlanId("");
            }}
          >
            <option value="">Select a course...</option>
            {courses.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.courseName}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Class Group *</Label>
          <NativeSelect
            value={classGroupId}
            onChange={(e) => setClassGroupId(e.target.value)}
            disabled={!selectedBranchId || !selectedCourseId}
          >
            <option value="">
              {!selectedBranchId || !selectedCourseId
                ? "Select branch and course first..."
                : "Select a class group..."}
            </option>
            {classGroupOptions.map((cg: any) => (
              <option key={cg.id} value={cg.id}>
                {cg.groupName} {cg.roomIds?.length ? `• ${cg.roomIds[0]}` : ""}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => {
    // Filter tuition plans by selected course and active status
    const filteredTuitionPlans = tuitionPlans.filter((tp: any) => {
      if (!selectedCourseId) return false;
      return tp.courseIds?.includes(selectedCourseId) && tp.active === true;
    });

    return (
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Tuition Plan *</Label>
            <NativeSelect
              value={tuitionPlanId}
              onChange={(e) => setTuitionPlanId(e.target.value)}
            >
              <option value="">Select a plan...</option>
              {filteredTuitionPlans.map((tp: any) => (
                <option key={tp.id} value={tp.id}>
                  {tp.planName} ({tp.billingPeriod || "Monthly"}){tp.nameKyrgyz ? ` • ${tp.nameKyrgyz}` : ""}{tp.amount !== null && tp.amount !== undefined ? ` — ${tp.amount.toLocaleString()} KGS` : ""}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Start Date</Label>
              <input
                type="date"
                value={enrollDate}
                onChange={(e) => setEnrollDate(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Status</Label>
              <NativeSelect
                value={enrollmentStatus}
                onChange={(e) => setEnrollmentStatus(e.target.value)}
              >
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
              </NativeSelect>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border/40">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground cursor-pointer">
                Complete linked trial
              </Label>
              <p className="text-[10px] text-muted-foreground/60">
                Mark the trial as Completed
              </p>
            </div>
            <Switch
              checked={completeTrial}
              onCheckedChange={setCompleteTrial}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderStep5 = () => {
    const selectedPlan = tuitionPlans.find((tp: any) => tp.id === tuitionPlanId);
    const selectedGroupName = classGroups.find((cg: any) => cg.id === classGroupId)?.groupName;

    if (result) {
      return (
        <div className="space-y-5 text-center py-6">
          <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <PartyPopper className="h-8 w-8 text-emerald-500" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-foreground">Lead Successfully Converted!</p>
            <p className="text-xs text-muted-foreground">
              All records have been created successfully.
            </p>
          </div>
          <div className="bg-muted/20 border border-border/40 rounded-xl p-4 space-y-2 text-left">
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-muted-foreground">Parent: <strong className="text-foreground">{result.parentReused ? "Reused" : "Created"}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-muted-foreground">Student: <strong className="text-foreground">Created</strong></span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-muted-foreground">Enrollment: <strong className="text-foreground">Created</strong></span>
            </div>
            {result.trialCompleted && (
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-muted-foreground">Trial: <strong className="text-foreground">Completed</strong></span>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="bg-muted/20 border border-border/40 rounded-xl p-4 space-y-2">
          <p className="text-xs font-medium text-foreground">Conversion Summary</p>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Parent: <strong>{parentInfo.name}</strong></p>
            <p>• Student: <strong>{studentInfo.name}</strong></p>
            <p>• Class Group: <strong>{selectedGroupName || "—"}</strong></p>
            <p>• Plan: <strong>{selectedPlan ? selectedPlan.planName : "—"}</strong></p>
            <p>• Start: <strong>{enrollDate}</strong></p>
            <p>• Complete Trial: <strong>{completeTrial ? "Yes" : "No"}</strong></p>
          </div>
        </div>

        {savingError && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <p className="text-xs font-medium text-destructive">{savingError}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            Convert Lead: {lead.leadName}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Step {step} of 5: {STEPS[step - 1].desc}
          </DialogDescription>
        </DialogHeader>

        {/* Step progress indicators */}
        <div className="flex items-center gap-1 px-1">
          {STEPS.map((s, idx) => (
            <div
              key={s.id}
              className={cn(
                "flex-1 h-1.5 rounded-full transition-colors duration-300",
                idx + 1 < step ? "bg-primary" : idx + 1 === step ? "bg-primary/60" : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="py-2 min-h-[200px]">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
          {step === 5 && renderStep5()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          {result ? (
            <div className="w-full flex justify-end">
              <Button size="sm" onClick={handleFinish}>
                {onSuccess ? "Back to Pipeline" : "Finish"}
              </Button>
            </div>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={step === 1 ? onClose : handleBack}
                disabled={saving}
              >
                {step === 1 ? (
                  "Cancel"
                ) : (
                  <>
                    <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                    Back
                  </>
                )}
              </Button>

              {step < 5 ? (
                <Button size="sm" onClick={handleNext}>
                  Next
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleConvert}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      Converting...
                    </>
                  ) : (
                    "Convert Lead"
                  )}
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}