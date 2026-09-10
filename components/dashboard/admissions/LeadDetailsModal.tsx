"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { TrialScheduleCard } from "./TrialScheduleCard";
import { ScheduleTrialModal } from "./ScheduleTrialModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Phone,
  Mail,
  MessageSquare,
  MapPin,
  Calendar,
  User,
  UserCheck,
  Compass,
  FileText
} from "lucide-react";

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
  lastActivityDate: string | Date | null;
}

interface ParentData {
  id: string;
  parentName: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}

interface LeadDetailsModalProps {
  lead: LeadData | null;
  isOpen: boolean;
  onClose: () => void;
  parents: ParentData[];
  activities: any[];
  trial: any | null;
  teacherName: string | null;
  roomName: string | null;
  branchName: string | null;
  ownerName: string | null;
  staffIdToNameMap: Map<string, string>;
}

export function LeadDetailsModal({
  lead,
  isOpen,
  onClose,
  parents,
  trial,
  teacherName,
  roomName,
  branchName,
  ownerName,
}: LeadDetailsModalProps) {
  const [isScheduleTrialModalOpen, setIsScheduleTrialModalOpen] = useState(false);

  if (!lead) return null;

  const isAlreadyConverted = ["enrolled", "won"].includes((lead.status || "").toLowerCase().trim());

  const getStatusBadge = (status: string | null) => {
    const s = (status || "").toLowerCase().trim();
    if (s === "new" || !s) {
      return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-bold px-2.5 py-0.5">New Lead</Badge>;
    }
    if (s === "contacted") {
      return <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 font-bold px-2.5 py-0.5">Contacted</Badge>;
    }
    if (s === "trial booked" || s === "trial scheduled") {
      return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-bold px-2.5 py-0.5">Trial Booked</Badge>;
    }
    if (s === "trial done" || s === "trial completed" || s === "follow-up") {
      return <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 font-bold px-2.5 py-0.5">Trial Done</Badge>;
    }
    if (s === "enrolled" || s === "won") {
      return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold px-2.5 py-0.5">Enrolled</Badge>;
    }
    if (s === "lost") {
      return <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-bold px-2.5 py-0.5">Lost</Badge>;
    }
    return <Badge variant="secondary" className="font-bold px-2.5 py-0.5">{status}</Badge>;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl sm:max-w-2xl w-[95vw] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl p-6 sm:p-7 rounded-3xl select-none max-h-[90vh] overflow-y-auto">
          {/* Header Banner */}
          <DialogHeader className="space-y-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary border border-primary/20 flex items-center justify-center font-extrabold text-lg shrink-0 shadow-xs">
                  {lead.leadName?.charAt(0).toUpperCase() || "L"}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <DialogTitle className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                      {lead.leadName}
                    </DialogTitle>
                    {getStatusBadge(lead.status)}
                  </div>
                  <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3 flex-wrap font-medium">
                    {lead.childAge !== null && lead.childAge !== undefined && (
                      <span>Age: <strong>{lead.childAge} yrs</strong></span>
                    )}
                    {branchName && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-primary" />
                        {branchName}
                      </span>
                    )}
                    {ownerName && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3 text-slate-400" />
                        Assigned: {ownerName}
                      </span>
                    )}
                  </DialogDescription>
                </div>
              </div>

              {/* Action Toolbar — Only Trial Schedule button */}
              {!isAlreadyConverted && (
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsScheduleTrialModalOpen(true)}
                    className="h-8 text-xs font-bold gap-1.5 rounded-xl border-amber-200 bg-amber-50/60 text-amber-800 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    Trial
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          {/* Modal Main Body */}
          <div className="space-y-4 mt-5">
            {/* Parent Info Card */}
            <div className="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 p-4 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <UserCheck className="h-4 w-4 text-primary" />
                <span>Parent / Guardian Profile</span>
              </div>

              {parents.length > 0 ? (
                parents.map((p) => (
                  <div key={p.id} className="space-y-2 pt-1 border-t border-slate-200/50 dark:border-slate-800">
                    <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{p.parentName}</p>
                    <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                      {p.phone && (
                        <div className="flex items-center gap-2 font-mono">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <a className="hover:underline hover:text-primary">
                            {p.phone}
                          </a>
                        </div>
                      )}
                      {p.whatsapp && (
                        <div className="flex items-center gap-2 font-mono">
                          <MessageSquare className="h-3 w-3 text-emerald-500" />
                          <a target="_blank" rel="noreferrer" className="hover:underline hover:text-emerald-600">
                            {p.whatsapp}
                          </a>
                        </div>
                      )}
                      {p.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-slate-400" />
                          <span>{p.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 space-y-1">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">{lead.leadName}</p>
                  {lead.phone && <p className="font-mono">{lead.phone}</p>}
                  {lead.whatsapp && <p className="font-mono text-emerald-600">{lead.whatsapp}</p>}
                </div>
              )}
            </div>

            {/* Inquiry Details Card */}
            <div className="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 p-4 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300 mb-2">
                <Compass className="h-4 w-4 text-primary" />
                <span>Inquiry Context</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Source Channel</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{lead.channel || "Direct"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Inquiry Date</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {lead.inquiryDate ? new Date(lead.inquiryDate).toLocaleDateString() : "—"}
                  </span>
                </div>
              </div>
              {lead.notes && (
                <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Notes</span>
                  <p className="text-slate-700 dark:text-slate-300 italic text-xs mt-0.5 whitespace-pre-wrap">{lead.notes}</p>
                </div>
              )}
            </div>

            {/* Trial Session Card if existing */}
            {trial && (
              <TrialScheduleCard
                trial={trial}
                teacherName={teacherName}
                roomName={roomName}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule Trial Sub-Modal */}
      <ScheduleTrialModal
        isOpen={isScheduleTrialModalOpen}
        onClose={() => setIsScheduleTrialModalOpen(false)}
        leadId={lead.id}
        leadName={lead.leadName}
        leadBranchIds={lead.branchIds}
      />
    </>
  );
}
