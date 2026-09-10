"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { ConvertLeadModal } from "./ConvertLeadModal";
import { useAppDispatch } from "@/store/hooks";
import { updateTrialOutcomeThunk } from "@/store/slices/admissionsSlice";
import { Calendar, Clock, User, CheckCircle2, ArrowRightToLine, Play, MessageSquare, Phone } from "lucide-react";
import { toast } from "sonner";
import { type LeadData, type TrialData } from "./AdmissionsClient";

interface TrialsTableProps {
  leads: LeadData[];
  trials: TrialData[];
  parentNameMap: Map<string, string>;
  branchNameMap: Map<string, string>;
  ownerNameMap: Map<string, string>;
  classGroupNameMap?: Map<string, string>;
}

export function TrialsTable({
  leads,
  trials,
  parentNameMap,
  branchNameMap,
  ownerNameMap,
}: TrialsTableProps) {
  const dispatch = useAppDispatch();

  const [selectedLeadForConvert, setSelectedLeadForConvert] = useState<LeadData | null>(null);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);

  // Outcome Logging Modal State
  const [outcomeTrial, setOutcomeTrial] = useState<TrialData | null>(null);
  const [outcomeValue, setOutcomeValue] = useState("Attended");
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [newTrialDate, setNewTrialDate] = useState("");
  const [newTrialTime, setNewTrialTime] = useState("");
  const [submittingOutcome, setSubmittingOutcome] = useState(false);

  // Filter leads that have trial status (Trial Booked, Trial Done) and EXCLUDE Converted / Enrolled trials
  const trialLeads = leads.filter((l) => {
    const s = (l.status || "").toLowerCase().trim();
    if (s === "enrolled" || s === "won") return false;

    const trial = trials.find((t) => t.leadIds?.includes(l.id));
    const trialOutcome = (trial?.outcome || "").toLowerCase().trim();
    if (trialOutcome === "converted") return false;

    const hasTrial = !!trial;
    return s === "trial booked" || s === "trial scheduled" || s === "trial done" || s === "trial completed" || hasTrial;
  });

  const getOutcomeBadge = (outcome: string | null) => {
    const o = (outcome || "").toLowerCase().trim();
    if (o === "attended") {
      return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold px-2.5 py-0.5">Attended</Badge>;
    }
    if (o === "rescheduled") {
      return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-bold px-2.5 py-0.5">Rescheduled</Badge>;
    }
    return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-bold px-2.5 py-0.5">{outcome || "Scheduled"}</Badge>;
  };

  const handleOpenOutcomeModal = (trial: TrialData) => {
    setOutcomeTrial(trial);
    setOutcomeValue(trial.outcome && trial.outcome !== "Scheduled" && trial.outcome !== "No-show" ? trial.outcome : "Attended");
    setOutcomeNotes(trial.notes || "");
    if (trial.dateTime) {
      const dt = new Date(trial.dateTime);
      setNewTrialDate(dt.toISOString().split("T")[0]);
      setNewTrialTime(dt.toTimeString().slice(0, 5));
    } else {
      setNewTrialDate("");
      setNewTrialTime("");
    }
  };

  const handleSaveOutcome = async () => {
    if (!outcomeTrial) return;

    if (outcomeValue === "Rescheduled") {
      if (!newTrialDate || !newTrialTime) {
        toast.error("Please specify both new trial date and time to reschedule.");
        return;
      }
    }

    setSubmittingOutcome(true);

    try {
      const res = await dispatch(
        updateTrialOutcomeThunk({
          trialId: outcomeTrial.id,
          outcome: outcomeValue,
          notes: outcomeNotes.trim(),
          newTrialDate: outcomeValue === "Rescheduled" ? newTrialDate : undefined,
          newTrialTime: outcomeValue === "Rescheduled" ? newTrialTime : undefined,
        })
      ).unwrap();

      if (res) {
        toast.success(
          outcomeValue === "Rescheduled"
            ? `Trial rescheduled to ${newTrialDate} ${newTrialTime} successfully!`
            : `Trial outcome updated to ${outcomeValue}!`
        );
        setOutcomeTrial(null);

        // If outcome is Attended, open Convert Lead modal directly
        if (outcomeValue === "Attended") {
          const matchedLead = leads.find((l) => outcomeTrial.leadIds.includes(l.id));
          if (matchedLead) {
            setSelectedLeadForConvert(matchedLead);
            setIsConvertModalOpen(true);
          }
        }
      }
    } catch (err: any) {
      toast.error(typeof err === "string" ? err : err?.message || "Failed to update trial outcome.");
    } finally {
      setSubmittingOutcome(false);
    }
  };

  if (!trialLeads || trialLeads.length === 0) {
    return (
      <div className="bg-card/70 border border-border/70 rounded-2xl p-8 text-center select-none shadow-2xs">
        <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto mb-2 font-bold">
          <Play className="h-5 w-5" />
        </div>
        <h4 className="text-xs font-bold text-foreground">No booked trials yet</h4>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Leads with scheduled trial lessons will appear in this table.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 select-none">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20 font-bold">
            <Play className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-foreground tracking-tight">Booked Trials & Outcomes</h3>
            <p className="text-[11px] text-muted-foreground font-medium">Log outcomes for scheduled trials and convert attended leads</p>
          </div>
        </div>
        <Badge variant="secondary" className="font-extrabold text-xs px-2.5 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-300">
          {trialLeads.length} trials
        </Badge>
      </div>

      {/* Table */}
      <div className="bg-card/80 border border-border/80 rounded-2xl shadow-2xs overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40 border-b border-border/70">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground/80 py-3 pl-4">
                Lead / Child Name
              </TableHead>
              <TableHead className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground/80 py-3">
                Parent Profile
              </TableHead>
              <TableHead className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground/80 py-3">
                Trial Date & Time
              </TableHead>
              <TableHead className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground/80 py-3">
                Branch
              </TableHead>
              <TableHead className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground/80 py-3">
                Outcome Status
              </TableHead>
              <TableHead className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground/80 py-3 pr-4 text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {trialLeads.map((lead) => {
              const trial = trials.find((t) => t.leadIds?.includes(lead.id));
              const parentName = lead.parentIds?.length ? parentNameMap.get(lead.parentIds[0]) : null;
              const branchName = lead.branchIds?.length ? branchNameMap.get(lead.branchIds[0]) : null;
              const outcome = trial?.outcome || "Scheduled";
              const isAttended = outcome.toLowerCase().trim() === "attended" || (lead.status || "").toLowerCase().trim() === "trial done";

              return (
                <TableRow key={lead.id} className="hover:bg-muted/40 transition-colors border-b border-border/40">
                  {/* Lead Name */}
                  <TableCell className="py-3 pl-4">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center font-extrabold text-xs shrink-0">
                        {lead.leadName?.charAt(0).toUpperCase() || "L"}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground truncate">{lead.leadName}</p>
                        {lead.childAge !== null && lead.childAge !== undefined && (
                          <p className="text-[11px] text-muted-foreground font-medium">Age: {lead.childAge} yrs</p>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* Parent Profile */}
                  <TableCell className="py-3 text-xs font-medium text-foreground/90">
                    <div>
                      <p>{parentName || lead.leadName}</p>
                      {lead.phone && <p className="text-[11px] font-mono text-muted-foreground">{lead.phone}</p>}
                    </div>
                  </TableCell>

                  {/* Trial Date & Time */}
                  <TableCell className="py-3 text-xs text-muted-foreground font-medium">
                    {trial?.dateTime ? (
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                        <Calendar className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>{new Date(trial.dateTime).toLocaleDateString()}</span>
                        <Clock className="h-3 w-3 text-slate-400 ml-1 shrink-0" />
                        <span>{new Date(trial.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/40 italic">Not scheduled</span>
                    )}
                  </TableCell>

                  {/* Branch */}
                  <TableCell className="py-3 text-xs text-muted-foreground font-medium">
                    {branchName || "—"}
                  </TableCell>

                  {/* Outcome Status */}
                  <TableCell className="py-3">
                    {getOutcomeBadge(outcome)}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="py-3 pr-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!isAttended && trial && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenOutcomeModal(trial)}
                          className="h-7 text-xs font-bold gap-1 rounded-lg border-slate-200 hover:bg-slate-100 dark:border-slate-800"
                        >
                          Log Outcome
                        </Button>
                      )}

                      {isAttended && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedLeadForConvert(lead);
                            setIsConvertModalOpen(true);
                          }}
                          className="h-7 text-xs font-extrabold gap-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20 hover:from-emerald-500 hover:to-teal-500"
                        >
                          <ArrowRightToLine className="h-3 w-3" />
                          Convert Lead
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Outcome Logging Dialog */}
      {outcomeTrial && (
        <Dialog open={!!outcomeTrial} onOpenChange={(open) => !open && setOutcomeTrial(null)}>
          <DialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl select-none fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <DialogHeader>
              <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-amber-500" />
                Log Trial Outcome
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 my-3 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Outcome *</label>
                <NativeSelect
                  value={outcomeValue}
                  onChange={(e) => setOutcomeValue(e.target.value)}
                >
                  <option value="Attended">Attended</option>
                  <option value="Rescheduled">Rescheduled</option>
                </NativeSelect>
              </div>

              {outcomeValue === "Rescheduled" && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">New Trial Date *</label>
                    <input
                      type="date"
                      value={newTrialDate}
                      onChange={(e) => setNewTrialDate(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">New Trial Time *</label>
                    <input
                      type="time"
                      value={newTrialTime}
                      onChange={(e) => setNewTrialTime(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Notes (Optional)</label>
                <Textarea
                  value={outcomeNotes}
                  onChange={(e) => setOutcomeNotes(e.target.value)}
                  placeholder="Notes on trial lesson performance, level, or next steps..."
                  className="text-xs h-20"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOutcomeTrial(null)}
                disabled={submittingOutcome}
                className="h-8 text-xs font-semibold rounded-xl"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveOutcome}
                disabled={submittingOutcome}
                className="h-8 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white"
              >
                {submittingOutcome ? "Saving..." : "Save Outcome"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Convert Lead Dialog */}
      <ConvertLeadModal
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
        lead={selectedLeadForConvert}
      />
    </div>
  );
}
