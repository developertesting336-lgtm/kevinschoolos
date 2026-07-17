"use client";

import { PipelineColumn } from "./PipelineColumn";

import { type LeadData } from "./AdmissionsClient";

interface PipelineBoardProps {
  leads: LeadData[];
  parentNameMap: Map<string, string>;
  branchNameMap: Map<string, string>;
  ownerNameMap: Map<string, string>;
  leadToTrialMap: Map<string, any>;
  leadToFollowUpMap: Map<string, any>;
  onSelectLead: (lead: LeadData) => void;
}

export function PipelineBoard({
  leads,
  parentNameMap,
  branchNameMap,
  ownerNameMap,
  leadToTrialMap,
  leadToFollowUpMap,
  onSelectLead,
}: PipelineBoardProps) {
  
  // Categorize leads into columns based on their normalized status values
  const getLeadsByStatus = (columnTitle: string) => {
    return leads.filter((lead) => {
      const s = (lead.status || "").toLowerCase().trim();
      if (columnTitle === "New") {
        return s === "new" || s === "";
      }
      if (columnTitle === "Contacted") {
        return s === "contacted";
      }
      if (columnTitle === "Trial Scheduled") {
        return s === "trial booked" || s === "trial scheduled";
      }
      if (columnTitle === "Trial Completed") {
        return s === "trial done" || s === "trial completed" || s === "follow-up";
      }
      if (columnTitle === "Won") {
        return s === "enrolled" || s === "won";
      }
      if (columnTitle === "Lost") {
        return s === "lost";
      }
      return false;
    });
  };

  const columns = [
    { title: "New", statusKey: "New" },
    { title: "Contacted", statusKey: "Contacted" },
    { title: "Trial Scheduled", statusKey: "Trial Booked" },
    { title: "Trial Completed", statusKey: "Trial Done" },
    { title: "Won", statusKey: "Enrolled" },
    { title: "Lost", statusKey: "Lost" },
  ];

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-full min-h-[50vh] scrollbar-thin select-none">
      {columns.map((col) => (
        <PipelineColumn
          key={col.title}
          title={col.title}
          statusKey={col.statusKey}
          leads={getLeadsByStatus(col.title)}
          parentNameMap={parentNameMap}
          branchNameMap={branchNameMap}
          ownerNameMap={ownerNameMap}
          leadToTrialMap={leadToTrialMap}
          leadToFollowUpMap={leadToFollowUpMap}
          onSelectLead={onSelectLead}
        />
      ))}
    </div>
  );
}
