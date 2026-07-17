"use client";

import React, { useEffect, useState, useTransition } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Bell,
  Clock,
  Send,
  AlertTriangle,
  Calendar,
  Filter,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { NotificationTable } from "@/components/dashboard/notifications/NotificationTable";
import { NotificationDrawer } from "@/components/dashboard/notifications/NotificationDrawer";

interface Branch {
  id: string;
  name: string;
}

interface NotificationsCenterClientProps {
  initialBranches: Branch[];
  userRole: string;
  userName: string;
}

export function NotificationsCenterClient({
  initialBranches,
  userRole,
  userName,
}: NotificationsCenterClientProps) {
  const [data, setData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    scheduled: 0,
    sent: 0,
    failed: 0,
    today: 0,
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<any | null>(null);

  // Filter States
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [channel, setChannel] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [recipientType, setRecipientType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);

  const [, startTransition] = useTransition();

  useEffect(() => {
    setPage(1);
  }, [search, status, channel, selectedBranch, recipientType, startDate, endDate]);

  useEffect(() => {
    fetchNotifications();
  }, [page, search, status, channel, selectedBranch, recipientType, startDate, endDate]);

  const fetchNotifications = async () => {
    setRefreshing(true);
    try {
      let url = `/api/dashboard/notifications?page=${page}&limit=10`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (status) url += `&status=${encodeURIComponent(status)}`;
      if (channel) url += `&channel=${encodeURIComponent(channel)}`;
      if (selectedBranch) url += `&branchId=${encodeURIComponent(selectedBranch)}`;
      if (recipientType) url += `&recipientType=${encodeURIComponent(recipientType)}`;
      if (startDate) url += `&startDate=${encodeURIComponent(startDate)}`;
      if (endDate) url += `&endDate=${encodeURIComponent(endDate)}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load notifications history");
      const json = await res.json();

      startTransition(() => {
        setData(json.data || []);
        if (json.stats) {
          setStats(json.stats);
        }
        if (json.pagination) {
          setPagination(json.pagination);
        }
      });
    } catch (error) {
      console.error("[Notifications Center Fetch Error]", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatus("");
    setChannel("");
    setSelectedBranch("");
    setRecipientType("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  return (
    <div className="space-y-8 select-none animate-in fade-in duration-500 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-foreground font-semibold">Notifications Center</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground bg-linear-to-r from-foreground via-foreground/90 to-foreground/75 bg-clip-text">
            Notifications Center
          </h1>
          <p className="text-muted-foreground text-xs mt-1 max-w-xl leading-relaxed font-medium">
            Monitor and audit all automated customer communications, system notifications, and messaging activities.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchNotifications}
            disabled={refreshing}
            className="p-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground hover:shadow-sm active:scale-95 transition-all cursor-pointer shrink-0 disabled:opacity-50"
            title="Refresh logs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
          </button>
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
            Role: {userRole === "owner" ? "Owner" : "Office Administrator"}
          </Badge>
        </div>
      </div>

      {/* Overview Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Scheduled Card */}
        <Card className="bg-card border-border hover:border-amber-500/30 hover:shadow-md hover:shadow-amber-500/2 transition-all duration-300 group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-amber-500/80 to-yellow-500/80 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="p-4 pb-1.5 flex flex-row items-center justify-between space-y-0">
            <span className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground">
              Scheduled
            </span>
            <div className="h-6 w-6 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Clock className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {loading ? (
              <div className="h-7 w-12 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-extrabold text-foreground tracking-tight font-mono">
                {stats.scheduled}
              </div>
            )}
            <p className="text-[8px] text-muted-foreground font-semibold mt-1">Pending queue items</p>
          </CardContent>
        </Card>

        {/* Sent Card */}
        <Card className="bg-card border-border hover:border-emerald-500/30 hover:shadow-md hover:shadow-emerald-500/2 transition-all duration-300 group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-emerald-500/80 to-teal-500/80 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="p-4 pb-1.5 flex flex-row items-center justify-between space-y-0">
            <span className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground">
              Sent Successfully
            </span>
            <div className="h-6 w-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <Send className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {loading ? (
              <div className="h-7 w-12 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-extrabold text-foreground tracking-tight font-mono">
                {stats.sent}
              </div>
            )}
            <p className="text-[8px] text-muted-foreground font-semibold mt-1">Dispatched successfully</p>
          </CardContent>
        </Card>

        {/* Failed Card */}
        <Card className="bg-card border-border hover:border-rose-500/30 hover:shadow-md hover:shadow-rose-500/2 transition-all duration-300 group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-rose-500/80 to-red-500/80 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="p-4 pb-1.5 flex flex-row items-center justify-between space-y-0">
            <span className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground">
              Delivery Failures
            </span>
            <div className="h-6 w-6 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600">
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {loading ? (
              <div className="h-7 w-12 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-extrabold text-foreground tracking-tight font-mono">
                {stats.failed}
              </div>
            )}
            <p className="text-[8px] text-muted-foreground font-semibold mt-1">Erroneous or undeliverable</p>
          </CardContent>
        </Card>

        {/* Today Card */}
        <Card className="bg-card border-border hover:border-blue-500/30 hover:shadow-md hover:shadow-blue-500/2 transition-all duration-300 group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-blue-500/80 to-indigo-500/80 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="p-4 pb-1.5 flex flex-row items-center justify-between space-y-0">
            <span className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground">
              Today's Notifications
            </span>
            <div className="h-6 w-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
              <Calendar className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {loading ? (
              <div className="h-7 w-12 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-extrabold text-foreground tracking-tight font-mono">
                {stats.today}
              </div>
            )}
            <p className="text-[8px] text-muted-foreground font-semibold mt-1">Total triggered today</p>
          </CardContent>
        </Card>
      </div>

      {/* Control panel: Search and Filters */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground/60" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notifications by recipient name, message text, ref..."
              className="pl-10 text-xs h-10 rounded-xl focus-visible:ring-primary/20 border-border bg-muted/20"
            />
          </div>

          {/* Filters toggle/reset */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 border border-border hover:bg-muted text-xs font-bold text-muted-foreground hover:text-foreground rounded-xl transition-all cursor-pointer select-none"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Dynamic Filters Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Status filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-muted/30 border border-border px-3 py-2 rounded-xl text-xs font-semibold text-foreground focus:ring-0 focus:outline-none cursor-pointer h-10 w-full"
            >
              <option value="">All Statuses</option>
              <option value="Sent">Sent</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Failed">Failed</option>
            </select>
          </div>

          {/* Branch filter (conditional selector) */}
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

          {/* Channel filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">Channel</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="bg-muted/30 border border-border px-3 py-2 rounded-xl text-xs font-semibold text-foreground focus:ring-0 focus:outline-none cursor-pointer h-10 w-full"
            >
              <option value="">All Channels</option>
              <option value="Email">Email</option>
              <option value="SMS">SMS</option>
              <option value="WhatsApp">WhatsApp</option>
            </select>
          </div>

          {/* Recipient Type filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">Recipient Type</label>
            <select
              value={recipientType}
              onChange={(e) => setRecipientType(e.target.value)}
              className="bg-muted/30 border border-border px-3 py-2 rounded-xl text-xs font-semibold text-foreground focus:ring-0 focus:outline-none cursor-pointer h-10 w-full"
            >
              <option value="">All Recipients</option>
              <option value="Parent">Parent</option>
              <option value="Lead">Lead</option>
            </select>
          </div>

          {/* Date range filters */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">From Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-muted/30 border-border text-xs h-10 rounded-xl focus-visible:ring-primary/20 w-full"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">To Date</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-muted/30 border-border text-xs h-10 rounded-xl focus-visible:ring-primary/20 w-full"
            />
          </div>
        </div>
      </div>

      {/* Main Table view */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden p-6">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground font-semibold">Loading communication logs...</span>
          </div>
        ) : data.length === 0 ? (
          <div className="py-24 text-center select-none space-y-2 border border-dashed border-border rounded-2xl bg-muted/5">
            <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto" />
            <h3 className="text-xs font-bold text-foreground">No Logs Found</h3>
            <p className="text-[10px] text-muted-foreground max-w-xs mx-auto">
              We couldn't find any notification logs matching the search or filtering criteria.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <NotificationTable
              notifications={data}
              onSelectNotification={setSelectedNotification}
            />

            {/* Pagination */}
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

      {/* Details Slide-out Drawer */}
      <NotificationDrawer
        notification={selectedNotification}
        onClose={() => setSelectedNotification(null)}
      />
    </div>
  );
}
