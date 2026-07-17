"use client";

import React, { useEffect, useState, useTransition } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  TrendingUp,
  Calendar,
  UserCheck,
  UserPlus,
  XCircle,
  Percent,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Info,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface Branch {
  id: string;
  name: string;
}

interface ChannelPerformanceRecord {
  id: string;
  channel: string | null;
  month: string | null;
  leads: number | null;
  trialsBooked: number | null;
  trialsAttended: number | null;
  enrolled: number | null;
  lost: number | null;
  trialBookingRate: number;
  trialShowRate: number;
  closeRate: number;
}

interface ChannelPerformanceClientProps {
  initialBranches: Branch[];
  userRole: string;
  userName: string;
}

export function ChannelPerformanceClient({
  initialBranches,
  userRole,
  userName,
}: ChannelPerformanceClientProps) {
  const [data, setData] = useState<ChannelPerformanceRecord[]>([]);
  const [stats, setStats] = useState({
    totalLeads: 0,
    totalBooked: 0,
    totalAttended: 0,
    totalEnrolled: 0,
    totalLost: 0,
    overallCloseRate: 0,
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters State
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [page, setPage] = useState(1);

  const [, startTransition] = useTransition();

  useEffect(() => {
    setPage(1);
  }, [search, channelFilter, monthFilter, selectedBranch]);

  useEffect(() => {
    fetchPerformance();
  }, [page, search, channelFilter, monthFilter, selectedBranch]);

  const fetchPerformance = async () => {
    setRefreshing(true);
    try {
      let url = `/api/dashboard/channel-performance?page=${page}&limit=10`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (channelFilter) url += `&channel=${encodeURIComponent(channelFilter)}`;
      if (monthFilter) url += `&month=${encodeURIComponent(monthFilter)}`;
      if (selectedBranch) url += `&branchId=${encodeURIComponent(selectedBranch)}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      const json = await res.json();

      startTransition(() => {
        setData(json.data || []);
        if (json.stats) {
          setStats(json.stats);
        }
        if (json.pagination) {
          setPagination(json.pagination);
        }
        if (json.lastUpdated) {
          setLastUpdated(json.lastUpdated);
        }
      });
    } catch (error) {
      console.error("[Channel Performance Fetch Error]", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleClearFilters = () => {
    setSearch("");
    setChannelFilter("");
    setMonthFilter("");
    setSelectedBranch("");
    setPage(1);
  };

  const formatPercent = (val: number) => {
    return `${val.toFixed(1)}%`;
  };

  const formatLastUpdated = (dateStr: string | null) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Compile monthly trend data for LineChart
  const getMonthlyTrendData = () => {
    const monthsMap: Record<string, { month: string; Leads: number; Enrollments: number }> = {};
    data.forEach((r) => {
      if (r.month) {
        if (!monthsMap[r.month]) {
          monthsMap[r.month] = { month: r.month, Leads: 0, Enrollments: 0 };
        }
        monthsMap[r.month].Leads += r.leads || 0;
        monthsMap[r.month].Enrollments += r.enrolled || 0;
      }
    });
    return Object.values(monthsMap).sort((a, b) => a.month.localeCompare(b.month));
  };

  // Compile channel rates data for BarChart
  const getChannelRatesData = () => {
    const channelsMap: Record<string, { name: string; BookingRate: number; CloseRate: number }> = {};
    data.forEach((r) => {
      if (r.channel) {
        if (!channelsMap[r.channel]) {
          channelsMap[r.channel] = {
            name: r.channel,
            BookingRate: r.trialBookingRate,
            CloseRate: r.closeRate,
          };
        }
      }
    });
    return Object.values(channelsMap).slice(0, 5); // display top 5 channels
  };

  const uniqueMonths = Array.from(new Set(data.map((r) => r.month).filter(Boolean))) as string[];
  const uniqueChannels = Array.from(new Set(data.map((r) => r.channel).filter(Boolean))) as string[];

  return (
    <div className="space-y-8 select-none animate-in fade-in duration-500 pb-12">
      {/* Freshness Banner */}
      <div className="bg-linear-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 px-5 py-3 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Info className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground">Updated by nightly automation</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Marketing funnels and CRM conversions are calculated nightly. This workspace is read-only.
            </div>
          </div>
        </div>
        <div className="text-xs font-mono font-bold text-muted-foreground/80 md:text-right">
          Last Updated: <span className="text-foreground">{formatLastUpdated(lastUpdated)}</span>
        </div>
      </div>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-foreground font-semibold">Channel Performance</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground bg-linear-to-r from-foreground via-foreground/90 to-foreground/75 bg-clip-text">
            Channel Performance
          </h1>
          <p className="text-muted-foreground text-xs mt-1 max-w-xl leading-relaxed font-medium">
            Analyze lead funnels, trial booking metrics, attendance show rates, and overall conversions by marketing channel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchPerformance}
            disabled={refreshing}
            className="p-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground hover:shadow-sm active:scale-95 transition-all cursor-pointer shrink-0 disabled:opacity-50"
            title="Refresh analytics"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
          </button>
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
            Role: {userRole === "owner" ? "Owner" : userRole === "smm" ? "Marketing Specialist" : "Office Administrator"}
          </Badge>
        </div>
      </div>

      {/* 6 Grid Metrics cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Leads */}
        <Card className="bg-card border-border hover:border-blue-500/30 hover:shadow-md hover:shadow-blue-500/2 transition-all duration-300 group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-blue-500/80 to-indigo-500/80 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="p-4 pb-1.5 flex flex-row items-center justify-between space-y-0">
            <span className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground">
              Total Leads
            </span>
            <div className="h-6 w-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {loading ? (
              <div className="h-7 w-12 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-extrabold text-foreground tracking-tight font-mono">
                {stats.totalLeads}
              </div>
            )}
            <p className="text-[8px] text-muted-foreground font-semibold mt-1">Inquired contact leads</p>
          </CardContent>
        </Card>

        {/* Trials Booked */}
        <Card className="bg-card border-border hover:border-amber-500/30 hover:shadow-md hover:shadow-amber-500/2 transition-all duration-300 group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-amber-500/80 to-yellow-500/80 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="p-4 pb-1.5 flex flex-row items-center justify-between space-y-0">
            <span className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground">
              Booked Trials
            </span>
            <div className="h-6 w-6 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Calendar className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {loading ? (
              <div className="h-7 w-12 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-extrabold text-foreground tracking-tight font-mono">
                {stats.totalBooked}
              </div>
            )}
            <p className="text-[8px] text-muted-foreground font-semibold mt-1">Booked trial classes</p>
          </CardContent>
        </Card>

        {/* Trials Attended */}
        <Card className="bg-card border-border hover:border-emerald-500/30 hover:shadow-md hover:shadow-emerald-500/2 transition-all duration-300 group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-emerald-500/80 to-teal-500/80 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="p-4 pb-1.5 flex flex-row items-center justify-between space-y-0">
            <span className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground">
              Show / Attended
            </span>
            <div className="h-6 w-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <UserCheck className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {loading ? (
              <div className="h-7 w-12 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-extrabold text-foreground tracking-tight font-mono">
                {stats.totalAttended}
              </div>
            )}
            <p className="text-[8px] text-muted-foreground font-semibold mt-1">Attended trial classes</p>
          </CardContent>
        </Card>

        {/* Enrollments */}
        <Card className="bg-card border-border hover:border-violet-500/30 hover:shadow-md hover:shadow-violet-500/2 transition-all duration-300 group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-violet-500/80 to-purple-500/80 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="p-4 pb-1.5 flex flex-row items-center justify-between space-y-0">
            <span className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground">
              Enrollments
            </span>
            <div className="h-6 w-6 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-600">
              <UserPlus className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {loading ? (
              <div className="h-7 w-12 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-extrabold text-foreground tracking-tight font-mono">
                {stats.totalEnrolled}
              </div>
            )}
            <p className="text-[8px] text-muted-foreground font-semibold mt-1">Signed student contracts</p>
          </CardContent>
        </Card>

        {/* Lost Leads */}
        <Card className="bg-card border-border hover:border-rose-500/30 hover:shadow-md hover:shadow-rose-500/2 transition-all duration-300 group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-rose-500/80 to-red-500/80 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="p-4 pb-1.5 flex flex-row items-center justify-between space-y-0">
            <span className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground">
              Lost Leads
            </span>
            <div className="h-6 w-6 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600">
              <XCircle className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {loading ? (
              <div className="h-7 w-12 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-extrabold text-foreground tracking-tight font-mono">
                {stats.totalLost}
              </div>
            )}
            <p className="text-[8px] text-muted-foreground font-semibold mt-1">Lost lead opportunities</p>
          </CardContent>
        </Card>

        {/* Close Rate */}
        <Card className="bg-card border-border hover:border-pink-500/30 hover:shadow-md hover:shadow-pink-500/2 transition-all duration-300 group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-pink-500/80 to-rose-500/80 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="p-4 pb-1.5 flex flex-row items-center justify-between space-y-0">
            <span className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground">
              Close Rate
            </span>
            <div className="h-6 w-6 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-600">
              <Percent className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {loading ? (
              <div className="h-7 w-12 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-extrabold text-foreground tracking-tight font-mono">
                {formatPercent(stats.overallCloseRate)}
              </div>
            )}
            <p className="text-[8px] text-muted-foreground font-semibold mt-1">Enrolled ÷ Trial Attended</p>
          </CardContent>
        </Card>
      </div>

      {/* Control panel: Search and Filters */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground/60" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by channel name or month..."
              className="pl-10 text-xs h-10 rounded-xl focus-visible:ring-primary/20 border-border bg-muted/20"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 border border-border hover:bg-muted text-xs font-bold text-muted-foreground hover:text-foreground rounded-xl transition-all cursor-pointer select-none"
            >
              Reset Filters
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Branch filter (visible for Owner) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">Branch</label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-muted/30 border border-border px-3 py-2 rounded-xl text-xs font-semibold text-foreground focus:ring-0 focus:outline-none cursor-pointer h-10 w-full"
            >
              <option value="">
                {userRole === "owner" ? "All Branches" : "All Assigned Branches"}
              </option>
              {initialBranches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Month selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">Month</label>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="bg-muted/30 border border-border px-3 py-2 rounded-xl text-xs font-semibold text-foreground focus:ring-0 focus:outline-none cursor-pointer h-10 w-full"
            >
              <option value="">All Months</option>
              {uniqueMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Channel selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">Channel</label>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="bg-muted/30 border border-border px-3 py-2 rounded-xl text-xs font-semibold text-foreground focus:ring-0 focus:outline-none cursor-pointer h-10 w-full"
            >
              <option value="">All Channels</option>
              {uniqueChannels.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts */}
      {!loading && data.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Funnel trends chart */}
          <Card className="bg-card border-border p-5">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                Monthly Funnel Trend
              </CardTitle>
            </CardHeader>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getMonthlyTrendData()}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip wrapperStyle={{ fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="Leads" stroke="#3b82f6" strokeWidth={2} />
                  <Line type="monotone" dataKey="Enrollments" stroke="#8b5cf6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Conversion rates chart */}
          <Card className="bg-card border-border p-5">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                Conversion Efficiency by Channel
              </CardTitle>
            </CardHeader>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getChannelRatesData()}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 10 }} unit="%" />
                  <Tooltip wrapperStyle={{ fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="BookingRate" name="Booking Rate" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="CloseRate" name="Close Rate" fill="#ec4899" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* Main Table view */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden p-6">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground font-semibold">Loading conversion records...</span>
          </div>
        ) : data.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground font-semibold">
            No channel performance metrics recorded.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto border border-border/60 rounded-xl shadow-inner bg-card/40">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/20 text-muted-foreground select-none">
                    <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Channel / Month</th>
                    <th className="p-3 font-semibold tracking-tight text-[10px] uppercase text-right">Leads</th>
                    <th className="p-3 font-semibold tracking-tight text-[10px] uppercase text-right">Trials Booked</th>
                    <th className="p-3 font-semibold tracking-tight text-[10px] uppercase text-right">Trials Attended</th>
                    <th className="p-3 font-semibold tracking-tight text-[10px] uppercase text-right">Enrolled</th>
                    <th className="p-3 font-semibold tracking-tight text-[10px] uppercase text-right">Lost</th>
                    <th className="p-3 font-semibold tracking-tight text-[10px] uppercase text-center">Booking Rate</th>
                    <th className="p-3 font-semibold tracking-tight text-[10px] uppercase text-center">Show Rate</th>
                    <th className="p-3 font-semibold tracking-tight text-[10px] uppercase text-center">Close Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {data.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground/90">{row.channel}</span>
                          <span className="text-[9px] text-muted-foreground font-mono mt-0.5">{row.month}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-foreground/80">{row.leads || 0}</td>
                      <td className="p-3 text-right font-mono font-semibold text-foreground/80">{row.trialsBooked || 0}</td>
                      <td className="p-3 text-right font-mono font-semibold text-foreground/80">{row.trialsAttended || 0}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-600">{row.enrolled || 0}</td>
                      <td className="p-3 text-right font-mono font-semibold text-rose-600">{row.lost || 0}</td>

                      {/* Rates cells */}
                      <td className="p-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-bold text-foreground/80 font-mono">{formatPercent(row.trialBookingRate)}</span>
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="bg-amber-500 h-full" style={{ width: `${row.trialBookingRate}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-bold text-foreground/80 font-mono">{formatPercent(row.trialShowRate)}</span>
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full" style={{ width: `${row.trialShowRate}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-bold text-foreground/80 font-mono">{formatPercent(row.closeRate)}</span>
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="bg-purple-500 h-full" style={{ width: `${row.closeRate}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="block md:hidden space-y-4">
              {data.map((row) => (
                <Card key={row.id} className="border-border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-border/40 pb-2">
                    <div>
                      <span className="font-bold text-sm text-foreground">{row.channel}</span>
                      <span className="text-[9px] text-muted-foreground font-mono block mt-0.5">{row.month}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground font-semibold block">Leads</span>
                      <span className="font-mono font-bold">{row.leads || 0}</span>
                    </div>
                    <div>
                      <span className="text-emerald-600 font-semibold block">Enrolled</span>
                      <span className="font-mono font-bold text-emerald-600">{row.enrolled || 0}</span>
                    </div>
                    <div>
                      <span className="text-rose-600 font-semibold block">Lost</span>
                      <span className="font-mono font-bold text-rose-600">{row.lost || 0}</span>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-border/40 pt-2 text-[10px]">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Booking Rate</span>
                      <span className="font-mono font-bold">{formatPercent(row.trialBookingRate)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Show Rate</span>
                      <span className="font-mono font-bold">{formatPercent(row.trialShowRate)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Close Rate</span>
                      <span className="font-mono font-bold text-purple-600">{formatPercent(row.closeRate)}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4 select-none border-t border-border/40">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted/40 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Previous
                </button>
                <span className="text-[10px] text-muted-foreground font-semibold px-2">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted/40 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
