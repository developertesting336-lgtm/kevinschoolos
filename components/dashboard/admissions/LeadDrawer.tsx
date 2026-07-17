"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ConvertLeadWizard } from "./ConvertLeadWizard";
import { TrialScheduleCard } from "./TrialScheduleCard";
import { ActivityTimeline } from "./ActivityTimeline";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, MessageSquare, MapPin, Calendar, Clock, User, UserCheck, Compass, Info, FileText } from "lucide-react";
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

interface ActivityData {
  id: string;
  activityId: string;
  dateTime: string | Date | null;
  type: string | null;
  direction: string | null;
  outcome: string | null;
  notes: string | null;
  nextFollowUpDate: string | Date | null;
  leadIds: string[];
  ownerIds: string[];
}

interface LeadDrawerProps {
  lead: LeadData | null;
  isOpen: boolean;
  onClose: () => void;
  parents: ParentData[];
  activities: ActivityData[];
  trial: any | null;
  teacherName: string | null;
  roomName: string | null;
  branchName: string | null;
  ownerName: string | null;
  staffIdToNameMap: Map<string, string>;
}

export function LeadDrawer({
  lead,
  isOpen,
  onClose,
  parents,
  activities,
  trial,
  teacherName,
  roomName,
  branchName,
  ownerName,
  staffIdToNameMap,
}: LeadDrawerProps) {
  if (!lead) return null;

  const formattedInquiry = lead.inquiryDate
    ? new Date(lead.inquiryDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  const nextFollowUpDate = activities
    .map(a => a.nextFollowUpDate)
    .filter(Boolean)
    .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0] || null;

  const formattedFollowUp = nextFollowUpDate
    ? new Date(nextFollowUpDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* Target right slide with mobile full-screen overrides */}
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg lg:max-w-xl p-0 flex flex-col h-full bg-background border-l border-border shadow-2xl transition duration-300 select-none"
      >
        {/* Drawer Header */}
        <SheetHeader className="p-6 pb-4 border-b border-border/60 shrink-0 bg-card/50">
          <div className="flex flex-wrap gap-2 items-center mb-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              Lead Details
            </span>
            <Badge variant="outline" className="text-[10px] font-bold px-2.5 py-0.5 capitalize border-primary/20 text-primary bg-primary/5">
              {lead.status || "New"}
            </Badge>
          </div>
          <SheetTitle className="text-xl font-extrabold text-foreground tracking-tight leading-none">
            {lead.leadName}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground mt-1">
            Created on {formattedInquiry} • Branch: {branchName || "—"}
          </SheetDescription>
        </SheetHeader>

        {/* Scrollable details contents */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6 pb-8">
            
            {/* Stage Wizard Tracker */}
            <ConvertLeadWizard status={lead.status} />

            {/* Next Follow-up Card */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-2">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" />
                Next Follow-Up Date
              </span>
              <p className="text-sm font-bold text-foreground">
                {formattedFollowUp}
              </p>
            </div>

            {/* Trial Information Section */}
            <TrialScheduleCard
              trial={trial}
              teacherName={teacherName}
              roomName={roomName}
            />

            {/* Lead & Parent Bio Info Details */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">
                Contact & Demographics
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Lead Demographic Meta */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                      <Compass className="h-3 w-3" /> Preferred Language
                    </span>
                    <p className="text-xs font-semibold text-foreground">
                      {lead.preferredLanguage || "—"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                      <User className="h-3 w-3" /> Child Age
                    </span>
                    <p className="text-xs font-semibold text-foreground">
                      {lead.childAge !== null ? `${lead.childAge} years` : "—"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                      <Compass className="h-3 w-3" /> Source Channel
                    </span>
                    <p className="text-xs font-semibold text-foreground">
                      {lead.channel || "—"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                      <UserCheck className="h-3 w-3" /> Assigned Staff
                    </span>
                    <p className="text-xs font-semibold text-foreground">
                      {ownerName || "Unassigned"}
                    </p>
                  </div>
                </div>

                {/* Lead Notes */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                      <FileText className="h-3 w-3" /> Lead Phone
                    </span>
                    <p className="text-xs font-semibold text-foreground">
                      {lead.phone || "—"}
                    </p>
                  </div>
                  {lead.whatsapp && (
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" /> Lead WhatsApp
                      </span>
                      <p className="text-xs font-semibold text-foreground">
                        {lead.whatsapp}
                      </p>
                    </div>
                  )}
                  {lead.lostReason && (
                    <div className="space-y-1 p-2 bg-rose-500/5 border border-rose-500/10 rounded-lg">
                      <span className="text-[10px] uppercase font-bold text-rose-600 tracking-wider block">
                        Reason for Loss
                      </span>
                      <p className="text-xs font-medium text-rose-700 leading-tight">
                        {lead.lostReason}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {lead.notes && (
                <div className="border-t border-border/50 pt-3 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    General Lead Notes
                  </span>
                  <p className="text-xs text-muted-foreground leading-relaxed bg-muted/20 p-2.5 rounded-lg border border-border/30">
                    {lead.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Parent Profiles Section */}
            {parents.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">
                  Parent Profiles ({parents.length})
                </h3>
                
                <div className="space-y-4 divide-y divide-border/50">
                  {parents.map((parent, index) => {
                    const displayPhone = parent.phone !== undefined ? (parent.phone || "—") : "— (Redacted)";
                    const displayEmail = parent.email !== undefined ? (parent.email || "—") : "— (Redacted)";
                    const displayWhatsapp = parent.whatsapp !== undefined ? (parent.whatsapp || "—") : "— (Redacted)";

                    return (
                      <div key={parent.id} className={cn("space-y-3", index > 0 && "pt-4")}>
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-primary" />
                          <h4 className="text-xs font-bold text-foreground truncate">
                            {parent.parentName}
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2 truncate">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                            <span className="truncate">Phone: {displayPhone}</span>
                          </div>
                          <div className="flex items-center gap-2 truncate">
                            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                            <span className="truncate">WhatsApp: {displayWhatsapp}</span>
                          </div>
                          <div className="flex items-center gap-2 truncate sm:col-span-2">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                            <span className="truncate">Email: {displayEmail}</span>
                          </div>
                          {parent.address && (
                            <div className="flex items-center gap-2 truncate sm:col-span-2">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                              <span className="truncate" title={parent.address}>Address: {parent.address}</span>
                            </div>
                          )}
                        </div>

                        {parent.notes && (
                          <div className="p-2 bg-muted/30 border border-border/40 rounded text-xs text-muted-foreground italic">
                            "{parent.notes}"
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Activity History Timeline */}
            <ActivityTimeline
              activities={activities}
              staffIdToNameMap={staffIdToNameMap}
            />

          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
