"use client";

import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  createLeadThunk,
  selectAdmissionsSavingLead,
  selectAdmissionsSaveLeadError,
} from "@/store/slices/admissionsSlice";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Info, User, Phone, Globe, UserCheck, HelpCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches: { id: string; name: string }[];
  staffUsers: { id: string; fullName: string; role?: string | null }[];
}

export function LeadFormModal({ isOpen, onClose, branches, staffUsers }: LeadFormModalProps) {
  const dispatch = useAppDispatch();
  const saving = useAppSelector(selectAdmissionsSavingLead);
  const saveError = useAppSelector(selectAdmissionsSaveLeadError);

  // Filter assigned staff users to only display users with Owner and Office/Admin roles
  const eligibleStaffUsers = staffUsers.filter((u) => {
    if (!u.role) return false;
    const norm = u.role.toLowerCase().trim();
    return (
      norm === "owner" ||
      norm === "office_admin" ||
      norm === "office/admin" ||
      norm === "office-admin" ||
      norm === "office admin"
    );
  });

  const displayStaffUsers = eligibleStaffUsers.length > 0 ? eligibleStaffUsers : staffUsers;

  // Form State
  const [parentName, setParentName] = useState("");
  const [childName, setChildName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [childAge, setChildAge] = useState("");
  const [branchId, setBranchId] = useState("");
  const [interestedCourse, setInterestedCourse] = useState("");
  const [marketingChannel, setMarketingChannel] = useState("");
  const [assignedStaffId, setAssignedStaffId] = useState("");
  const [notes, setNotes] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Predefined channels
  const marketingChannels = [
    "WhatsApp",
    "Instagram",
    "Facebook",
    "Local Ad",
    "Referral",
    "Walk-in",
    "Website",
    "Other"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!parentName.trim()) {
      setValidationError("Parent Name is required.");
      return;
    }
    if (!childName.trim()) {
      setValidationError("Child Name is required.");
      return;
    }
    if (!branchId) {
      setValidationError("Please select a branch.");
      return;
    }

    const payload = {
      parentName: parentName.trim(),
      childName: childName.trim(),
      phone: phone.trim(),
      whatsapp: whatsapp.trim(),
      email: email.trim(),
      childAge: childAge ? Number(childAge) : null,
      branchId,
      interestedCourse: interestedCourse.trim(),
      marketingChannel,
      assignedStaffId,
      leadStatus: "New",
      notes: notes.trim()
    };

    try {
      const result = await dispatch(createLeadThunk(payload)).unwrap();
      if (result) {
        toast.success("Lead created successfully!");
        handleReset();
        onClose();
      }
    } catch (err: any) {
      const errMsg = typeof err === "string" ? err : (err?.message || "Failed to create lead.");
      setValidationError(errMsg);
      toast.error(errMsg);
    }
  };

  const handleReset = () => {
    setParentName("");
    setChildName("");
    setPhone("");
    setWhatsapp("");
    setEmail("");
    setChildAge("");
    setBranchId("");
    setInterestedCourse("");
    setMarketingChannel("");
    setAssignedStaffId("");
    setNotes("");
    setValidationError(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl sm:max-w-4xl w-[95vw] bg-white border border-slate-200/80 shadow-2xl p-6 sm:p-8 rounded-3xl select-none max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <User className="h-5 w-5 text-blue-600" />
            Create New Lead
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 leading-relaxed">
            Register a parent inquiry. This creates the lead in the pipeline and links it to the parent profile.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-3">
          {/* Validation & Redux errors */}
          {(validationError || saveError) && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{validationError || saveError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Parent Section */}
            <div className="space-y-4 bg-slate-50/60 border border-slate-200/70 p-5 rounded-2xl">
              <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-wider text-slate-600 uppercase border-b border-slate-200/60 pb-2.5">
                <User className="h-4 w-4 text-blue-600" />
                <span>PARENT PROFILE</span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800" htmlFor="parentName">Parent Full Name *</Label>
                <Input
                  id="parentName"
                  placeholder="e.g. Elena Petrova"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  className="h-10 text-xs rounded-2xl bg-white border-slate-200/90 px-4 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800" htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="e.g. +996 555 123 456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-10 text-xs rounded-2xl bg-white border-slate-200/90 px-4 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800" htmlFor="whatsapp">WhatsApp Number</Label>
                <Input
                  id="whatsapp"
                  placeholder="e.g. +996 555 123 456"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="h-10 text-xs rounded-2xl bg-white border-slate-200/90 px-4 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800" htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="text"
                  placeholder="e.g. parent@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 text-xs rounded-2xl bg-white border-slate-200/90 px-4 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Child & Interest Section */}
            <div className="space-y-4 bg-slate-50/60 border border-slate-200/70 p-5 rounded-2xl">
              <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-wider text-slate-600 uppercase border-b border-slate-200/60 pb-2.5">
                <Info className="h-4 w-4 text-blue-600" />
                <span>CHILD & DEMOGRAPHICS</span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800" htmlFor="childName">Child Name *</Label>
                <Input
                  id="childName"
                  placeholder="e.g. Artem Petrov"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  className="h-10 text-xs rounded-2xl bg-white border-slate-200/90 px-4 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800" htmlFor="childAge">Child Age (Years)</Label>
                <Input
                  id="childAge"
                  type="number"
                  placeholder="e.g. 6"
                  min="1"
                  max="18"
                  value={childAge}
                  onChange={(e) => setChildAge(e.target.value)}
                  className="h-10 text-xs rounded-2xl bg-white border-slate-200/90 px-4 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800" htmlFor="branchId">School Branch *</Label>
                <select
                  id="branchId"
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full h-10 px-4 text-xs bg-white border border-slate-200/90 rounded-2xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 cursor-pointer"
                >
                  <option value="">Select Branch...</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800" htmlFor="interestedCourse">Interested Course</Label>
                <Input
                  id="interestedCourse"
                  placeholder="e.g. the Dragon"
                  value={interestedCourse}
                  onChange={(e) => setInterestedCourse(e.target.value)}
                  className="h-10 text-xs rounded-2xl bg-white border-slate-200/90 px-4 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>

          {/* CRM Meta Section */}
          <div className="bg-slate-50/60 border border-slate-200/70 p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-wider text-slate-600 uppercase border-b border-slate-200/60 pb-2.5">
              <Globe className="h-4 w-4 text-blue-600" />
              <span>CRM ATTRIBUTION</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800" htmlFor="marketingChannel">Marketing Channel</Label>
                <select
                  id="marketingChannel"
                  value={marketingChannel}
                  onChange={(e) => setMarketingChannel(e.target.value)}
                  className="w-full h-10 px-4 text-xs bg-white border border-slate-200/90 rounded-2xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 cursor-pointer"
                >
                  <option value="">Select Channel...</option>
                  {marketingChannels.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800" htmlFor="assignedStaffId">Assigned Staff User</Label>
                <select
                  id="assignedStaffId"
                  value={assignedStaffId}
                  onChange={(e) => setAssignedStaffId(e.target.value)}
                  className="w-full h-10 px-4 text-xs bg-white border border-slate-200/90 rounded-2xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 cursor-pointer"
                >
                  <option value="">Unassigned</option>
                  {displayStaffUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.fullName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800" htmlFor="notes">Inquiry Notes</Label>
              <Textarea
                id="notes"
                placeholder="Write specific details about the parent's inquiry..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs min-h-[70px] rounded-2xl bg-white border-slate-200/90 p-3.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                handleReset();
                onClose();
              }}
              disabled={saving}
              className="h-10 text-xs rounded-2xl px-5 border-slate-200 hover:bg-slate-100 font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="h-10 text-xs rounded-2xl px-6 font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              {saving ? "Creating..." : "Create Lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
