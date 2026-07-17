"use client";

import { useState, useEffect } from "react";
import { SearchBar } from "./SearchBar";
import { Filters } from "./Filters";
import { PipelineBoard } from "./PipelineBoard";
import { LeadDrawer } from "./LeadDrawer";
import { PaginationControls } from "@/components/dashboard/PaginationControls";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, TrendingUp } from "lucide-react";

export interface LeadData {
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

interface UserData {
  id: string;
  fullName: string;
}

interface BranchData {
  id: string;
  name: string;
}

interface TrialData {
  id: string;
  trialId: string;
  dateTime: string | Date | null;
  outcome: string | null;
  notes: string | null;
  leadIds: string[];
  teacherIds: string[];
  classGroupIds: string[];
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

interface RoomData {
  id: string;
  roomName: string;
}

interface ClassGroupData {
  id: string;
  groupName: string;
  roomIds: string[];
}

interface AdmissionsClientProps {
  leads: LeadData[];
  parents: ParentData[];
  users: UserData[];
  branches: BranchData[];
  trials: TrialData[];
  activities: ActivityData[];
  rooms: RoomData[];
  classGroups: ClassGroupData[];
  sources: string[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function AdmissionsClient({
  leads,
  parents,
  users,
  branches,
  trials,
  activities,
  rooms,
  classGroups,
  sources,
  pagination,
}: AdmissionsClientProps) {
  const [selectedLead, setSelectedLead] = useState<LeadData | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Trigger POST audit logging whenever a lead is selected and drawer is opened
  useEffect(() => {
    if (selectedLead) {
      fetch("/api/admissions/audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ leadId: selectedLead.id }),
      }).catch((err) => {
        console.error("[Audit Service] Failed to trigger admissions audit endpoint", err);
      });
    }
  }, [selectedLead]);

  const handleSelectLead = (lead: LeadData) => {
    setSelectedLead(lead);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setSelectedLead(null);
    setIsDrawerOpen(false);
  };

  // Map helper structures
  const parentNameMap = new Map(parents.map((p) => [p.id, p.parentName]));
  const branchNameMap = new Map(branches.map((b) => [b.id, b.name]));
  const ownerNameMap = new Map(users.map((u) => [u.id, u.fullName]));
  const staffIdToNameMap = ownerNameMap;

  // Resolve room names for class groups
  const classGroupRoomMap = new Map<string, string | null>();
  classGroups.forEach((cg) => {
    if (cg.roomIds && cg.roomIds.length > 0) {
      const room = rooms.find((r) => r.id === cg.roomIds[0]);
      classGroupRoomMap.set(cg.id, room ? room.roomName : null);
    }
  });

  // Map leads to trials
  const leadToTrialMap = new Map<string, TrialData>();
  leads.forEach((lead) => {
    const trial = trials.find((t) => t.leadIds.includes(lead.id));
    if (trial) {
      leadToTrialMap.set(lead.id, trial);
    }
  });

  // Map leads to next follow-up dates
  const leadToFollowUpMap = new Map<string, string | Date | null>();
  leads.forEach((lead) => {
    const leadActivities = activities.filter((a) => a.leadIds.includes(lead.id));
    const nextFollowUp = leadActivities
      .map((a) => a.nextFollowUpDate)
      .filter(Boolean)
      .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0] || null;
    
    if (nextFollowUp) {
      leadToFollowUpMap.set(lead.id, nextFollowUp);
    }
  });

  // Map lists for display in lead details drawer
  const selectedLeadParents = selectedLead
    ? parents.filter((p) => selectedLead.parentIds.includes(p.id))
    : [];

  const selectedLeadActivities = selectedLead
    ? activities.filter((a) => a.leadIds.includes(selectedLead.id))
    : [];

  const selectedLeadTrial = selectedLead
    ? leadToTrialMap.get(selectedLead.id) || null
    : null;

  const trialTeacherName = selectedLeadTrial && selectedLeadTrial.teacherIds.length > 0
    ? users.find((u) => u.id === selectedLeadTrial.teacherIds[0])?.fullName || null
    : null;

  const trialRoomName = selectedLeadTrial && selectedLeadTrial.classGroupIds.length > 0
    ? classGroupRoomMap.get(selectedLeadTrial.classGroupIds[0]) || null
    : null;

  const selectedLeadBranch = selectedLead && selectedLead.branchIds.length > 0
    ? branchNameMap.get(selectedLead.branchIds[0]) || null
    : null;

  const selectedLeadOwner = selectedLead && selectedLead.ownerIds.length > 0
    ? ownerNameMap.get(selectedLead.ownerIds[0]) || null
    : null;

  const branchFilterOptions = branches.map((b) => ({ id: b.id, name: b.name }));
  const ownerFilterOptions = users.map((u) => ({ id: u.id, name: u.fullName }));

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-300">
      
      {/* Header controls (Search & Filter) */}
      <Card className="bg-card border-border shadow-xs overflow-hidden">
        <CardHeader className="border-b border-border py-4 px-6 bg-muted/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 space-y-0">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-wider">
            <Users className="h-4 w-4 text-primary" />
            Admissions Pipeline ({pagination.total})
          </CardTitle>
          <SearchBar />
        </CardHeader>
        <CardContent className="p-4">
          <Filters
            branches={branchFilterOptions}
            staff={ownerFilterOptions}
            sources={sources}
          />
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto min-h-[50vh]">
        <PipelineBoard
          leads={leads}
          parentNameMap={parentNameMap}
          branchNameMap={branchNameMap}
          ownerNameMap={ownerNameMap}
          leadToTrialMap={leadToTrialMap}
          leadToFollowUpMap={leadToFollowUpMap}
          onSelectLead={handleSelectLead}
        />
      </div>

      {/* Overall Board Pagination controls */}
      <div className="flex justify-end p-2 border border-border bg-card rounded-xl shadow-xs">
        <PaginationControls
          totalPages={pagination.totalPages}
          currentPage={pagination.page}
        />
      </div>

      {/* Details Slide-out Panel */}
      <LeadDrawer
        lead={selectedLead}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        parents={selectedLeadParents}
        activities={selectedLeadActivities}
        trial={selectedLeadTrial}
        teacherName={trialTeacherName}
        roomName={trialRoomName}
        branchName={selectedLeadBranch}
        ownerName={selectedLeadOwner}
        staffIdToNameMap={staffIdToNameMap}
      />
    </div>
  );
}
