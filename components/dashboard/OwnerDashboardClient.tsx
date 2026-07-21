"use client";

import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchOwnerDashboard, selectDashboardData, selectDashboardLoading, selectDashboardError, selectDashboardFilters, setFilters, clearFilters as clearDashboardFilters } from "@/store/slices/dashboardSlice";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GraduationCap,
  UserPlus,
  DollarSign,
  Wallet,
  Heart,
  TrendingUp,
  PhoneCall,
  Play,
  Users,
  AlertCircle,
  RefreshCw,
  Filter,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────
interface KPIs {
  activeStudents?: number;
  totalStudents?: number;
  activeEnrollments?: number;
  totalEnrollments?: number;
  monthlyRevenue?: number;
  receivables?: number;
  attendanceHealth?: number;
  todaySessions?: number;
  trialToEnrollmentConversion?: number;
  leadsCount?: number;
  trialsBooked?: number;
  trialsAttended?: number;
  enrolled?: number;
  channelPerformance?: any[];
}

interface Funnel {
  totalLeads: number;
  trialsBooked: number;
  trialsAttended: number;
  enrolled: number;
  lost: number;
}

interface FinancialSnapshot {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  pendingInvoices: number;
}

interface PayrollAlerts {
  unpaidPayments: number;
  unconfirmedHours: number;
}

interface ChannelPerformanceData {
  data: Array<{
    id: string;
    month: string;
    channel: string;
    leads: number;
    trialsBooked: number;
    trialsAttended: number;
    enrolled: number;
    lost: number;
    trialBookedRate: number | null;
    showRate: number | null;
    closeRate: number | null;
    updatedAt: string;
  }>;
  lastUpdated: string | null;
  isStale: boolean;
  staleMessage: string | null;
}

interface EnrollmentTrend {
  month: string;
  count: number;
}

interface DashboardResponse {
  role: string;
  branchIds: string[];
  filters: {
    branch: string;
    month: string;
    course: string;
    channel: string;
  };
  kpis: KPIs;
  funnel: Funnel;
  enrollmentTrend: EnrollmentTrend[];
  channelPerformance: ChannelPerformanceData | null;
  financialSnapshot?: FinancialSnapshot;
  payrollAlerts?: PayrollAlerts;
}

type ExpandedSection = "financial" | "payroll" | "channel" | null;

// ─── Component ────────────────────────────────────────────────────────────
export function OwnerDashboardClient() {
  const dispatch = useAppDispatch();
  
  // Redux state
  const data = useAppSelector(selectDashboardData);
  const loading = useAppSelector(selectDashboardLoading);
  const error = useAppSelector(selectDashboardError);
  const filters = useAppSelector(selectDashboardFilters);
  
  const [expandedSection, setExpandedSection] = useState<ExpandedSection>(null);

  // Local Input State (Prevents reloading/skeletons on every keystroke)
  const [localBranchFilter, setLocalBranchFilter] = useState(filters.branch);
  const [localMonthFilter, setLocalMonthFilter] = useState(filters.month);
  const [localCourseFilter, setLocalCourseFilter] = useState(filters.course);
  const [localChannelFilter, setLocalChannelFilter] = useState(filters.channel);

  // Fetch data when filters change
  useEffect(() => {
    dispatch(fetchOwnerDashboard(filters));
  }, [dispatch, filters]);

  const handleApplyFilters = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    dispatch(setFilters({
      branch: localBranchFilter,
      month: localMonthFilter,
      course: localCourseFilter,
      channel: localChannelFilter,
    }));
  };

  const clearFilters = () => {
    dispatch(clearDashboardFilters());
    setLocalBranchFilter("");
    setLocalMonthFilter("");
    setLocalCourseFilter("");
    setLocalChannelFilter("");
  };

  const toggleSection = (section: ExpandedSection) => {
    setExpandedSection(expandedSection === section ? null : section);
  };


  if (loading) {
    return (
      <div className="space-y-8 select-none">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-6">
                <Skeleton className="h-3 w-20 bg-muted rounded mb-3" />
                <Skeleton className="h-8 w-16 bg-muted rounded mb-2" />
                <Skeleton className="h-3 w-24 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border py-3 px-5">
            <Skeleton className="h-4 w-48 bg-muted rounded" />
          </CardHeader>
          <CardContent className="p-5">
            {[1, 2, 3, 4, 5].map((j) => (
              <div key={j} className="flex items-center justify-between py-3 border-b border-border/40 last:border-0">
                <Skeleton className="h-4 w-36 bg-muted rounded" />
                <Skeleton className="h-4 w-16 bg-muted rounded" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
        <h2 className="text-lg font-bold text-foreground mb-1">Unable to Load Dashboard</h2>
        <p className="text-sm text-muted-foreground">{error || "No data available."}</p>
      </div>
    );
  }

  const kpis = data.kpis;
  const funnel = data.funnel;
  const enrollmentTrend = data.enrollmentTrend;
  const channelPerformance = data.channelPerformance;
  const financialSnapshot = data.financialSnapshot;
  const payrollAlerts = data.payrollAlerts;
  const role = data.role;

  const hasActiveFilters = filters.branch || filters.month || filters.course || filters.channel;

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-300">
      {/* Global Filters */}
      <Card className="bg-card border-border shadow-md">
        <CardHeader className="border-b border-border/60 py-3.5 px-5 bg-muted/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              <CardTitle className="text-xs font-bold text-foreground">Global Filters</CardTitle>
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-[10px] text-destructive font-bold hover:underline"
              >
                <X className="h-3 w-3" />
                Clear All
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <form onSubmit={handleApplyFilters} className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Branch</label>
                <input
                  type="text"
                  value={localBranchFilter}
                  onChange={(e) => setLocalBranchFilter(e.target.value)}
                  placeholder="Branch ID or name"
                  className="w-full text-xs border border-border rounded-md px-2.5 py-1.5 bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Month</label>
                <input
                  type="month"
                  value={localMonthFilter}
                  onChange={(e) => setLocalMonthFilter(e.target.value)}
                  className="w-full text-xs border border-border rounded-md px-2.5 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Course</label>
                <input
                  type="text"
                  value={localCourseFilter}
                  onChange={(e) => setLocalCourseFilter(e.target.value)}
                  placeholder="Course name or ID"
                  className="w-full text-xs border border-border rounded-md px-2.5 py-1.5 bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Channel</label>
                <input
                  type="text"
                  value={localChannelFilter}
                  onChange={(e) => setLocalChannelFilter(e.target.value)}
                  placeholder="Channel name"
                  className="w-full text-xs border border-border rounded-md px-2.5 py-1.5 bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-md shadow hover:bg-primary/90 hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {(role === "owner" || role === "office_admin") && kpis.activeStudents !== undefined && (
          <Card className="bg-card border-border hover:border-primary/45 hover:shadow-md transition-all duration-300">
            <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
              <span className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground">Active Students</span>
              <GraduationCap className="h-3.5 w-3.5 text-primary/75" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl font-extrabold text-foreground">{kpis.activeStudents}</div>
              <p className="text-[8px] text-muted-foreground font-medium mt-0.5">of {kpis.totalStudents || 0} total</p>
            </CardContent>
          </Card>
        )}

        {(role === "owner" || role === "office_admin") && kpis.activeEnrollments !== undefined && (
          <Card className="bg-card border-border hover:border-primary/45 hover:shadow-md transition-all duration-300">
            <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
              <span className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground">Enrollments</span>
              <UserPlus className="h-3.5 w-3.5 text-primary/75" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl font-extrabold text-foreground">{kpis.activeEnrollments}</div>
              <p className="text-[8px] text-muted-foreground font-medium mt-0.5">of {kpis.totalEnrollments || 0} total</p>
            </CardContent>
          </Card>
        )}

        {role === "owner" && kpis.monthlyRevenue !== undefined && (
          <Card className="bg-card border-border hover:border-primary/45 hover:shadow-md transition-all duration-300">
            <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
              <span className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground">Monthly Revenue</span>
              <DollarSign className="h-3.5 w-3.5 text-primary/75" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl font-extrabold text-foreground">${kpis.monthlyRevenue.toLocaleString()}</div>
              <p className="text-[8px] text-muted-foreground font-medium mt-0.5">KGS collected</p>
            </CardContent>
          </Card>
        )}

        {role === "owner" && kpis.receivables !== undefined && (
          <Card className="bg-card border-border hover:border-primary/45 hover:shadow-md transition-all duration-300">
            <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
              <span className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground">Receivables</span>
              <Wallet className="h-3.5 w-3.5 text-primary/75" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl font-extrabold text-foreground">${kpis.receivables.toLocaleString()}</div>
              <p className="text-[8px] text-muted-foreground font-medium mt-0.5">Outstanding invoices</p>
            </CardContent>
          </Card>
        )}

        {(role === "owner" || role === "office_admin") && kpis.attendanceHealth !== undefined && (
          <Card className="bg-card border-border hover:border-primary/45 hover:shadow-md transition-all duration-300">
            <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
              <span className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground">Attendance Health</span>
              <Heart className="h-3.5 w-3.5 text-primary/75" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl font-extrabold text-foreground">{kpis.attendanceHealth}%</div>
              <p className="text-[8px] text-muted-foreground font-medium mt-0.5">{kpis.todaySessions || 0} sessions today</p>
            </CardContent>
          </Card>
        )}

        {(role === "owner" || role === "office_admin" || role === "smm") && kpis.trialToEnrollmentConversion !== undefined && (
          <Card className="bg-card border-border hover:border-primary/45 hover:shadow-md transition-all duration-300">
            <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
              <span className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground">Trial → Enrollment</span>
              <TrendingUp className="h-3.5 w-3.5 text-primary/75" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl font-extrabold text-foreground">
                {kpis.trialToEnrollmentConversion !== null ? `${kpis.trialToEnrollmentConversion}%` : "—"}
              </div>
              <p className="text-[8px] text-muted-foreground font-medium mt-0.5">Conversion rate</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Admissions Funnel */}
      {(role === "owner" || role === "office_admin" || role === "smm") && (
        <Card className="bg-card border-border shadow-md overflow-hidden">
          <CardHeader className="border-b border-border py-4 px-5 bg-muted/10">
            <CardTitle className="text-sm font-bold text-foreground">Admissions Funnel</CardTitle>
            <CardDescription className="text-[10px]">Lead → Trial → Enrollment pipeline</CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              {[
                { label: "Leads", value: funnel.totalLeads, icon: PhoneCall, color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
                { label: "Trials Booked", value: funnel.trialsBooked, icon: Play, color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
                { label: "Trials Attended", value: funnel.trialsAttended, icon: Users, color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
                { label: "Enrolled", value: funnel.enrolled, icon: UserPlus, color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
                { label: "Lost", value: funnel.lost, icon: AlertCircle, color: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
              ].map((stage, idx, arr) => (
                <React.Fragment key={stage.label}>
                  <div className={`flex flex-col items-center justify-center p-4 rounded-lg border ${stage.color} min-w-25`}>
                    <stage.icon className="h-5 w-5 mb-1.5" />
                    <span className="text-lg font-extrabold">{stage.value}</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider">{stage.label}</span>
                  </div>
                  {idx < arr.length - 1 && (
                    <ChevronRight className="h-5 w-5 text-muted-foreground/50 hidden md:block shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enrollment Trend */}
      {(role === "owner" || role === "office_admin") && enrollmentTrend && enrollmentTrend.length > 0 && (
        <Card className="bg-card border-border shadow-md overflow-hidden">
          <CardHeader className="border-b border-border py-4 px-5 bg-muted/10">
            <CardTitle className="text-sm font-bold text-foreground">Enrollment Trend</CardTitle>
            <CardDescription className="text-[10px]">Monthly enrollment volume</CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <div className="flex items-end gap-2 h-32">
              {enrollmentTrend.map((item) => (
                <div key={item.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-[10px] font-bold text-foreground">{item.count}</div>
                  <div
                    className="w-full bg-primary/80 rounded-t-md min-h-1"
                    style={{ height: `${Math.max(4, (item.count / Math.max(...enrollmentTrend.map(e => e.count))) * 100)}%` }}
                  />
                  <div className="text-[8px] text-muted-foreground font-mono -rotate-45 origin-top-left whitespace-nowrap">
                    {item.month}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Financial Snapshot & Payroll Alerts (owner only) */}
      {role === "owner" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {financialSnapshot && (
            <Card className="bg-card border-border shadow-md overflow-hidden">
              <CardHeader className="border-b border-border py-4 px-5 bg-muted/10 flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">Financial Snapshot</CardTitle>
                  <CardDescription className="text-[10px]">Executive summary</CardDescription>
                </div>
                <button
                  onClick={() => toggleSection("financial")}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {expandedSection === "financial" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Revenue</div>
                    <div className="text-lg font-extrabold text-foreground">${financialSnapshot.totalRevenue.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Expenses</div>
                    <div className="text-lg font-extrabold text-foreground">${financialSnapshot.totalExpenses.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Net Profit</div>
                    <div className="text-lg font-extrabold text-foreground">${financialSnapshot.netProfit.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Pending Invoices</div>
                    <div className="text-lg font-extrabold text-foreground">{financialSnapshot.pendingInvoices}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {payrollAlerts && (
            <Card className="bg-card border-border shadow-md overflow-hidden">
              <CardHeader className="border-b border-border py-4 px-5 bg-muted/10 flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">Payroll Alerts</CardTitle>
                  <CardDescription className="text-[10px]">Teacher pay & hours status</CardDescription>
                </div>
                <button
                  onClick={() => toggleSection("payroll")}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {expandedSection === "payroll" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Unpaid Payments</div>
                    <div className="text-lg font-extrabold text-foreground">{payrollAlerts.unpaidPayments}</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Unconfirmed Hours</div>
                    <div className="text-lg font-extrabold text-foreground">{payrollAlerts.unconfirmedHours}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Channel Performance Band */}
      {(role === "owner" || role === "office_admin" || role === "smm") && channelPerformance && (
        <Card className="bg-card border-border shadow-md overflow-hidden">
          <CardHeader className="border-b border-border py-4 px-5 bg-muted/10 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-sm font-bold text-foreground">Channel Performance</CardTitle>
              <CardDescription className="text-[10px]">Marketing channel analytics</CardDescription>
            </div>
            <button
              onClick={() => toggleSection("channel")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {expandedSection === "channel" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </CardHeader>
          {expandedSection === "channel" && (
            <CardContent className="p-5">
              {channelPerformance.isStale && (
                <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-md flex items-start gap-2">
                  <RefreshCw className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-amber-700">Stale Data</div>
                    <div className="text-[10px] text-amber-600">{channelPerformance.staleMessage}</div>
                  </div>
                </div>
              )}

              {channelPerformance.lastUpdated && (
                <div className="mb-4 text-[10px] text-muted-foreground">
                  Updated by nightly automation — Last updated: {new Date(channelPerformance.lastUpdated).toLocaleString()}
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/60">
                      <th className="text-left py-2 px-2 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Month</th>
                      <th className="text-left py-2 px-2 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Channel</th>
                      <th className="text-right py-2 px-2 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Leads</th>
                      <th className="text-right py-2 px-2 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Booked</th>
                      <th className="text-right py-2 px-2 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Attended</th>
                      <th className="text-right py-2 px-2 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Enrolled</th>
                      <th className="text-right py-2 px-2 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Booked %</th>
                      <th className="text-right py-2 px-2 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Show %</th>
                      <th className="text-right py-2 px-2 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Close %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channelPerformance.data.map((row) => (
                      <tr key={row.id} className="border-b border-border/30 hover:bg-muted/5">
                        <td className="py-2 px-2 font-mono">{row.month}</td>
                        <td className="py-2 px-2">{row.channel}</td>
                        <td className="py-2 px-2 text-right font-mono">{row.leads}</td>
                        <td className="py-2 px-2 text-right font-mono">{row.trialsBooked}</td>
                        <td className="py-2 px-2 text-right font-mono">{row.trialsAttended}</td>
                        <td className="py-2 px-2 text-right font-mono">{row.enrolled}</td>
                        <td className="py-2 px-2 text-right font-mono">{row.trialBookedRate !== null ? `${row.trialBookedRate}%` : "—"}</td>
                        <td className="py-2 px-2 text-right font-mono">{row.showRate !== null ? `${row.showRate}%` : "—"}</td>
                        <td className="py-2 px-2 text-right font-mono">{row.closeRate !== null ? `${row.closeRate}%` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}