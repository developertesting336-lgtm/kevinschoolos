"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, MessageSquare, MapPin, Calendar, Compass, ArrowRight, UserCheck, Play } from "lucide-react";
import { type LeadData } from "./AdmissionsClient";
import { cn } from "@/lib/utils";

interface LeadsTableProps {
  leads: LeadData[];
  parentNameMap: Map<string, string>;
  branchNameMap: Map<string, string>;
  ownerNameMap: Map<string, string>;
  leadToTrialMap: Map<string, any>;
  onSelectLead: (lead: LeadData) => void;
}

export function LeadsTable({
  leads,
  parentNameMap,
  branchNameMap,
  ownerNameMap,
  leadToTrialMap,
  onSelectLead,
}: LeadsTableProps) {
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

  // Filter leads to ONLY display those with status 'New'
  const newLeads = (leads || []).filter((lead) => {
    const s = (lead.status || "").toLowerCase().trim();
    return s === "new" || !s;
  });

  if (!newLeads || newLeads.length === 0) {
    return (
      <div className="bg-card/70 border border-border/70 rounded-2xl p-10 text-center select-none shadow-2xs">
        <div className="h-10 w-10 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto mb-2 font-bold">
          <UserCheck className="h-5 w-5" />
        </div>
        <h3 className="text-sm font-extrabold text-foreground">No new leads available</h3>
        <p className="text-xs text-muted-foreground mt-0.5 max-w-sm mx-auto font-medium">
          Newly created inquiries will appear here until a trial is scheduled.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card/80 border border-border/80 rounded-2xl shadow-2xs overflow-hidden select-none">
      <Table>
        <TableHeader className="bg-muted/40 border-b border-border/70">
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground/80 py-3.5 pl-4">
              Lead / Child Name
            </TableHead>
            <TableHead className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground/80 py-3.5">
              Parent Profile
            </TableHead>
            <TableHead className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground/80 py-3.5">
              Contact Number
            </TableHead>
            <TableHead className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground/80 py-3.5">
              Branch
            </TableHead>
            <TableHead className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground/80 py-3.5">
              Channel
            </TableHead>
            <TableHead className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground/80 py-3.5">
              Inquiry Date
            </TableHead>
            <TableHead className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground/80 py-3.5">
              Status
            </TableHead>
            <TableHead className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground/80 py-3.5 pr-4 text-right">
              Action
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {newLeads.map((lead) => {
            const parentName = lead.parentIds?.length ? parentNameMap.get(lead.parentIds[0]) : null;
            const branchName = lead.branchIds?.length ? branchNameMap.get(lead.branchIds[0]) : null;
            const trial = leadToTrialMap.get(lead.id);

            return (
              <TableRow
                key={lead.id}
                onClick={() => onSelectLead(lead)}
                className="cursor-pointer hover:bg-muted/50 transition-colors group border-b border-border/40"
              >
                {/* Child Name */}
                <TableCell className="py-3.5 pl-4">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-extrabold text-xs shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      {lead.leadName?.charAt(0).toUpperCase() || "L"}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                        {lead.leadName}
                      </p>
                      {lead.childAge !== null && lead.childAge !== undefined && (
                        <p className="text-[11px] text-muted-foreground font-medium">Age: {lead.childAge} yrs</p>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* Parent Profile */}
                <TableCell className="py-3.5">
                  <span className="text-xs font-medium text-foreground/90">
                    {parentName || lead.leadName}
                  </span>
                </TableCell>

                {/* Contact Number */}
                <TableCell className="py-3.5 font-mono text-xs text-muted-foreground">
                  {lead.phone ? (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                      <a
                        onClick={(e) => e.stopPropagation()}
                        className="hover:underline hover:text-primary"
                      >
                        {lead.phone}
                      </a>
                    </div>
                  ) : lead.whatsapp ? (
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <MessageSquare className="h-3 w-3 shrink-0" />
                      <a
                        href={`https://wa.me/${lead.whatsapp.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="hover:underline"
                      >
                        {lead.whatsapp}
                      </a>
                    </div>
                  ) : (
                    <span className="text-muted-foreground/40 italic text-[11px]">No contact</span>
                  )}
                </TableCell>

                {/* Branch */}
                <TableCell className="py-3.5 text-xs text-muted-foreground font-medium">
                  {branchName ? (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-primary/70 shrink-0" />
                      <span>{branchName}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground/40 italic">—</span>
                  )}
                </TableCell>

                {/* Channel */}
                <TableCell className="py-3.5 text-xs text-muted-foreground font-medium">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 text-foreground/80 text-[11px] font-semibold">
                    {lead.channel || "Direct"}
                  </span>
                </TableCell>

                {/* Inquiry Date */}
                <TableCell className="py-3.5 text-xs text-muted-foreground font-medium">
                  {lead.inquiryDate ? new Date(lead.inquiryDate).toLocaleDateString() : "—"}
                </TableCell>

                {/* Status */}
                <TableCell className="py-3.5">
                  {getStatusBadge(lead.status)}
                </TableCell>

                {/* Action */}
                <TableCell className="py-3.5 pr-4 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectLead(lead);
                    }}
                    className="h-7 text-xs font-bold gap-1 text-primary hover:text-primary hover:bg-primary/10 rounded-lg"
                  >
                    View Details
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
