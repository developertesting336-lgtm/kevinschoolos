"use client";

import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { createLeadThunk, selectAdmissionsSavingLead, selectAdmissionsSaveLeadError } from "@/store/slices/admissionsSlice";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Info, User, Phone, Globe, UserCheck, HelpCircle } from "lucide-react";

interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches: { id: string; name: string }[];
  staffUsers: { id: string; fullName: string }[];
}

export function LeadFormModal({ isOpen, onClose, branches, staffUsers }: LeadFormModalProps) {
  const dispatch = useAppDispatch();
  const saving = useAppSelector(selectAdmissionsSavingLead);
  const saveError = useAppSelector(selectAdmissionsSaveLeadError);

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
        handleReset();
        onClose();
      }
    } catch (err: any) {
      // Error handled by redux state, but unwrap throws it
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
      <DialogContent className="max-w-2xl bg-card border border-border/80 shadow-2xl p-6 rounded-2xl select-none max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-extrabold text-foreground flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Create New Lead
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Register a parent inquiry. This creates the lead in the pipeline and links it to the parent profile.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Validation & Redux errors */}
          {(validationError || saveError) && (
            <div className="p-3.5 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl font-medium">
              {validationError || saveError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Parent Section */}
            <div className="space-y-4 bg-muted/20 border border-border/40 p-4 rounded-xl">
              <h3 className="text-xs uppercase font-extrabold text-muted-foreground tracking-wider flex items-center gap-1.5 border-b border-border/40 pb-2">
                <User className="h-3.5 w-3.5 text-primary" />
                Parent Profile
              </h3>

              <div className="space-y-1">
                <Label className="text-xs font-bold" htmlFor="parentName">Parent Full Name *</Label>
                <Input
                  id="parentName"
                  placeholder="e.g. Elena Petrova"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  className="h-9 text-xs rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold" htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="e.g. +996 555 123 456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-9 text-xs rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold" htmlFor="whatsapp">WhatsApp Number</Label>
                <Input
                  id="whatsapp"
                  placeholder="e.g. +996 555 123 456"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="h-9 text-xs rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold" htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="e.g. parent@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9 text-xs rounded-lg"
                />
              </div>
            </div>

            {/* Child & Interest Section */}
            <div className="space-y-4 bg-muted/20 border border-border/40 p-4 rounded-xl">
              <h3 className="text-xs uppercase font-extrabold text-muted-foreground tracking-wider flex items-center gap-1.5 border-b border-border/40 pb-2">
                <Info className="h-3.5 w-3.5 text-primary" />
                Child & Demographics
              </h3>

              <div className="space-y-1">
                <Label className="text-xs font-bold" htmlFor="childName">Child Name *</Label>
                <Input
                  id="childName"
                  placeholder="e.g. Artem Petrov"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  className="h-9 text-xs rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold" htmlFor="childAge">Child Age (Years)</Label>
                <Input
                  id="childAge"
                  type="number"
                  placeholder="e.g. 6"
                  min="1"
                  max="18"
                  value={childAge}
                  onChange={(e) => setChildAge(e.target.value)}
                  className="h-9 text-xs rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold" htmlFor="branchId">School Branch *</Label>
                <select
                  id="branchId"
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Select Branch...</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold" htmlFor="interestedCourse">Interested Course</Label>
                <Input
                  id="interestedCourse"
                  placeholder="e.g. the Dragon"
                  value={interestedCourse}
                  onChange={(e) => setInterestedCourse(e.target.value)}
                  className="h-9 text-xs rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* CRM Meta Section */}
          <div className="bg-muted/20 border border-border/40 p-4 rounded-xl space-y-4">
            <h3 className="text-xs uppercase font-extrabold text-muted-foreground tracking-wider flex items-center gap-1.5 border-b border-border/40 pb-2">
              <Globe className="h-3.5 w-3.5 text-primary" />
              CRM Attribution
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-bold" htmlFor="marketingChannel">Marketing Channel</Label>
                <select
                  id="marketingChannel"
                  value={marketingChannel}
                  onChange={(e) => setMarketingChannel(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Select Channel...</option>
                  {marketingChannels.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold" htmlFor="assignedStaffId">Assigned Staff User</Label>
                <select
                  id="assignedStaffId"
                  value={assignedStaffId}
                  onChange={(e) => setAssignedStaffId(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Unassigned</option>
                  {staffUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.fullName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold" htmlFor="notes">Inquiry Notes</Label>
              <Textarea
                id="notes"
                placeholder="Write specific details about the parent's inquiry..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs min-h-[70px] rounded-lg"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
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
              className="h-9 text-xs rounded-lg px-6 font-bold"
            >
              {saving ? "Creating..." : "Create Lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
