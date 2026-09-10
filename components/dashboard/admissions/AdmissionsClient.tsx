"use client";

import { useEffect, useState } from "react";
import { getCsrfHeaders } from "@/lib/csrf-client";
import { useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchAdmissionsData, selectAdmissionsLeads, selectAdmissionsParents, selectAdmissionsUsers, selectAdmissionsBranches, selectAdmissionsTrials, selectAdmissionsActivities, selectAdmissionsRooms, selectAdmissionsClassGroups, selectAdmissionsSources, selectAdmissionsPagination, selectAdmissionsLoading, selectAdmissionsFilters, setFilters } from "@/store/slices/admissionsSlice";
import { selectAuthRole } from "@/store/slices/authSlice";
import { LeadFormModal } from "./LeadFormModal";
import { SearchBar } from "./SearchBar";
import { Filters } from "./Filters";
import { LeadsTable } from "./LeadsTable";
import { TrialsTable } from "./TrialsTable";
import { LeadDetailsModal } from "./LeadDetailsModal";
import { PaginationControls } from "@/components/dashboard/PaginationControls";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, Plus } from "lucide-react";

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

export interface TrialData {
  id: string;
  trialId: string;
  dateTime: string | Date | null;
  outcome: string | null;
  notes: string | null;
  leadIds: string[];
  teacherIds: string[];
  classGroupIds: string[];
  confirmationMethod?: string | null;
  confirmationSent?: boolean;
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

export function AdmissionsClient() {
  const dispatch = useAppDispatch();

  // Redux state
  const leads = useAppSelector(selectAdmissionsLeads);
  const parents = useAppSelector(selectAdmissionsParents);
  const users = useAppSelector(selectAdmissionsUsers);
  const branches = useAppSelector(selectAdmissionsBranches);
  const trials = useAppSelector(selectAdmissionsTrials);
  const activities = useAppSelector(selectAdmissionsActivities);
  const rooms = useAppSelector(selectAdmissionsRooms);
  const classGroups = useAppSelector(selectAdmissionsClassGroups);
  const sources = useAppSelector(selectAdmissionsSources);
  const pagination = useAppSelector(selectAdmissionsPagination);
  const loading = useAppSelector(selectAdmissionsLoading);
  const filters = useAppSelector(selectAdmissionsFilters);
  const userRole = useAppSelector(selectAuthRole);

  const [selectedLead, setSelectedLead] = useState<LeadData | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);

  const searchParams = useSearchParams();
  const page = parseInt(searchParams.get("page") || "1", 10);
  const search = searchParams.get("search") || undefined;
  const branch = searchParams.get("branch") || undefined;
  const status = searchParams.get("status") || undefined;
  const owner = searchParams.get("owner") || undefined;
  const source = searchParams.get("source") || undefined;
  const trialDate = searchParams.get("trialDate") || undefined;

  // Fetch data when filters/search URL params change
  useEffect(() => {
    dispatch(fetchAdmissionsData({
      page,
      search,
      branch,
      status,
      owner,
      source,
      trialDate
    }));
  }, [dispatch, page, search, branch, status, owner, source, trialDate]);

  // Trigger POST audit logging whenever a lead is selected and modal is opened
  useEffect(() => {
    if (selectedLead) {
      fetch("/api/admissions/audit", {
        method: "POST",
        headers: getCsrfHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ leadId: selectedLead.id }),
      }).catch((err) => {
        console.error("[Audit Service] Failed to trigger admissions audit endpoint", err);
      });
    }
  }, [selectedLead]);

  // Sync selectedLead with the updated leads list in Redux
  useEffect(() => {
    if (selectedLead) {
      const updated = leads.find((l: any) => l.id === selectedLead.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedLead)) {
        setSelectedLead(updated);
      }
    }
  }, [leads, selectedLead]);

  const handleSelectLead = (lead: LeadData) => {
    setSelectedLead(lead);
    setIsDetailsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedLead(null);
    setIsDetailsModalOpen(false);
  };

  // Map helper structures
  const parentNameMap = new Map<string, string>(parents.map((p: any) => [p.id, p.parentName]));
  const branchNameMap = new Map<string, string>(branches.map((b: any) => [b.id, b.name]));
  const ownerNameMap = new Map<string, string>(users.map((u: any) => [u.id, u.fullName]));
  const staffIdToNameMap = ownerNameMap;

  // Resolve room names for class groups
  const classGroupRoomMap = new Map<string, string | null>();
  classGroups.forEach((cg: any) => {
    if (cg.roomIds && cg.roomIds.length > 0) {
      const room = rooms.find((r: any) => r.id === cg.roomIds[0]);
      classGroupRoomMap.set(cg.id, room ? room.roomName : null);
    }
  });

  // Map leads to trials
  const leadToTrialMap = new Map<string, TrialData>();
  leads.forEach((lead: any) => {
    const trial = trials.find((t: any) => t.leadIds.includes(lead.id));
    if (trial) {
      leadToTrialMap.set(lead.id, trial);
    }
  });

  // Map leads to next follow-up dates
  const leadToFollowUpMap = new Map<string, string | Date | null>();
  leads.forEach((lead: any) => {
    const leadActivities = activities.filter((a: any) => a.leadIds.includes(lead.id));
    const nextFollowUp = leadActivities
      .map((a: any) => a.nextFollowUpDate)
      .filter(Boolean)
      .sort((a: any, b: any) => new Date(b!).getTime() - new Date(a!).getTime())[0] || null;

    if (nextFollowUp) {
      leadToFollowUpMap.set(lead.id, nextFollowUp);
    }
  });

  // Map lists for display in lead details drawer
  const selectedLeadParents = selectedLead
    ? parents.filter((p: any) => selectedLead.parentIds.includes(p.id))
    : [];

  const selectedLeadActivities = selectedLead
    ? activities.filter((a: any) => a.leadIds.includes(selectedLead.id))
    : [];

  const selectedLeadTrial = selectedLead
    ? leadToTrialMap.get(selectedLead.id) || null
    : null;

  const trialTeacherName = selectedLeadTrial && selectedLeadTrial.teacherIds.length > 0
    ? users.find((u: any) => u.id === selectedLeadTrial.teacherIds[0])?.fullName || null
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

  const branchFilterOptions = branches.map((b: any) => ({ id: b.id, name: b.name }));
  const ownerFilterOptions = users.map((u: any) => ({ id: u.id, name: u.fullName }));

  // Compute KPI summary metrics
  const totalLeads = pagination.total;
  const trialsCount = Array.from(leadToTrialMap.values()).length;
  const newLeadsCount = leads.filter(
    (l: LeadData) => (l.status || "").toLowerCase().trim() === "new" || !(l.status)
  ).length;
  const wonLeadsCount = leads.filter((l: LeadData) =>
    ["enrolled", "won"].includes((l.status || "").toLowerCase().trim())
  ).length;

  return (
    <div className="space-y-5 select-none animate-in fade-in duration-300">
      {/* Top Page Header & Main Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/80 backdrop-blur-md border border-border/80 p-4 px-6 rounded-2xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-2xs">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-foreground tracking-tight flex items-center gap-2">
              Admissions Pipeline
            </h1>
            <p className="text-xs text-muted-foreground font-medium">
              Manage leads, schedule trials, and track conversion pipeline
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Filters
            branches={branchFilterOptions}
            staff={ownerFilterOptions}
            sources={sources}
          />
          <SearchBar />
          {["owner", "office_admin", "smm"].includes((userRole || "").toLowerCase()) && (
            <Button
              onClick={() => setIsLeadModalOpen(true)}
              className="h-9 px-3.5 text-xs font-bold gap-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              New Lead
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="h-64 bg-muted/30 animate-pulse rounded-2xl border border-border/40" />
      ) : (
        <div className="space-y-6 flex-1 w-full">
          <LeadsTable
            leads={leads}
            parentNameMap={parentNameMap}
            branchNameMap={branchNameMap}
            ownerNameMap={ownerNameMap}
            leadToTrialMap={leadToTrialMap}
            onSelectLead={handleSelectLead}
          />

          <TrialsTable
            leads={leads}
            trials={trials}
            parentNameMap={parentNameMap}
            branchNameMap={branchNameMap}
            ownerNameMap={ownerNameMap}
          />
        </div>
      )}

      {/* Overall Board Pagination controls */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-end p-2 px-3 border border-border/80 bg-card rounded-xl shadow-2xs">
          <PaginationControls
            totalPages={pagination.totalPages}
            currentPage={pagination.page}
          />
        </div>
      )}

      {/* Details Centered Modal */}
      <LeadDetailsModal
        lead={selectedLead}
        isOpen={isDetailsModalOpen}
        onClose={handleCloseModal}
        parents={selectedLeadParents}
        activities={selectedLeadActivities}
        trial={selectedLeadTrial}
        teacherName={trialTeacherName}
        roomName={trialRoomName}
        branchName={selectedLeadBranch}
        ownerName={selectedLeadOwner}
        staffIdToNameMap={staffIdToNameMap}
      />

      <LeadFormModal
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
        branches={branches}
        staffUsers={users}
      />
    </div>
  );
}

