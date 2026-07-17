"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Landmark,
  Percent,
  DollarSign,
  CreditCard,
  BookOpen,
  Wallet,
  Receipt,
  Users,
  Clock,
  Filter,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { LedgerViewer } from "@/components/dashboard/finance/LedgerViewer";
import { RoyaltyViewer } from "@/components/dashboard/finance/RoyaltyViewer";
import { TeacherPayViewer } from "@/components/dashboard/finance/TeacherPayViewer";
import { ExpenseList } from "@/components/dashboard/finance/ExpenseList";

interface Branch {
  id: string;
  name: string;
}

interface FinanceConsoleClientProps {
  initialBranches: Branch[];
  userRole: string;
  userName: string;
  userEmail: string | null;
}

type ActiveTab = "ledger" | "royalties" | "teacher-pay" | "expenses";

export function FinanceConsoleClient({
  initialBranches,
  userRole,
  userName,
  userEmail,
}: FinanceConsoleClientProps) {
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("ledger");
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    totalTeacherPayroll: 0,
    totalRoyalties: 0,
    outstandingPayments: 0,
    currentAccountingPeriod: "Loading...",
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStats();
  }, [selectedBranch]);

  const fetchStats = async () => {
    setRefreshing(true);
    try {
      let url = `/api/dashboard/finance`;
      if (selectedBranch) {
        url += `?branchId=${encodeURIComponent(selectedBranch)}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load dashboard metrics");
      const json = await res.json();
      if (json.stats) {
        setStats(json.stats);
      }
    } catch (error) {
      console.error("[Finance Console Fetch Metrics Error]", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedBranch(e.target.value);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div className="space-y-8 select-none animate-in fade-in duration-500 pb-12">
      {/* Premium Dashboard Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-foreground font-semibold">Finance Console</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground bg-linear-to-r from-foreground via-foreground/90 to-foreground/75 bg-clip-text">
            Finance Console
          </h1>
          <p className="text-muted-foreground text-xs mt-1 max-w-xl leading-relaxed font-medium">
            Review accounting ledger entries, operating expenses, teacher hours runs, and franchise royalty reports.
          </p>
        </div>

        {/* Filters and Context controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Branch filter wrapper */}
          <div className="flex items-center gap-2 bg-card border border-border px-3 py-1.5 rounded-xl shadow-sm hover:border-primary/20 transition-all duration-300">
            <Filter className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
            <select
              value={selectedBranch}
              onChange={handleBranchChange}
              className="bg-transparent border-0 text-xs font-semibold text-foreground focus:ring-0 focus:outline-none cursor-pointer pr-8"
            >
              <option value="">
                {userRole === "owner" ? "All Branches" : "All Allowed Branches"}
              </option>
              {initialBranches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchStats}
            disabled={refreshing}
            className="p-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground hover:shadow-sm active:scale-95 transition-all cursor-pointer shrink-0 disabled:opacity-50"
            title="Refresh Metrics"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
          </button>

          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
            Role: {userRole === "owner" ? "Owner" : "Finance Specialist"}
          </Badge>
        </div>
      </div>

      {/* 6 Grid Metrics cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Revenue */}
        <Card className="bg-card border-border hover:border-emerald-500/30 hover:shadow-md hover:shadow-emerald-500/2 transition-all duration-300 group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-emerald-500/80 to-teal-500/80 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="p-4 pb-1.5 flex flex-row items-center justify-between space-y-0">
            <span className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground">
              Total Revenue
            </span>
            <div className="h-6 w-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {loading ? (
              <div className="h-7 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-xl font-extrabold text-foreground tracking-tight font-mono">
                {formatCurrency(stats.totalRevenue)}
              </div>
            )}
            <p className="text-[8px] text-muted-foreground font-semibold mt-1">Total posted payments</p>
          </CardContent>
        </Card>

        {/* Total Expenses */}
        <Card className="bg-card border-border hover:border-rose-500/30 hover:shadow-md hover:shadow-rose-500/2 transition-all duration-300 group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-rose-500/80 to-orange-500/80 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="p-4 pb-1.5 flex flex-row items-center justify-between space-y-0">
            <span className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground">
              Total Expenses
            </span>
            <div className="h-6 w-6 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600">
              <CreditCard className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {loading ? (
              <div className="h-7 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-xl font-extrabold text-foreground tracking-tight font-mono">
                {formatCurrency(stats.totalExpenses)}
              </div>
            )}
            <p className="text-[8px] text-muted-foreground font-semibold mt-1">All posted expenses</p>
          </CardContent>
        </Card>

        {/* Teacher Payroll */}
        <Card className="bg-card border-border hover:border-blue-500/30 hover:shadow-md hover:shadow-blue-500/2 transition-all duration-300 group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-blue-500/80 to-indigo-500/80 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="p-4 pb-1.5 flex flex-row items-center justify-between space-y-0">
            <span className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground">
              Teacher Payroll
            </span>
            <div className="h-6 w-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
              <DollarSign className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {loading ? (
              <div className="h-7 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-xl font-extrabold text-foreground tracking-tight font-mono">
                {formatCurrency(stats.totalTeacherPayroll)}
              </div>
            )}
            <p className="text-[8px] text-muted-foreground font-semibold mt-1">Sum of all pay runs</p>
          </CardContent>
        </Card>

        {/* Royalties */}
        <Card className="bg-card border-border hover:border-purple-500/30 hover:shadow-md hover:shadow-purple-500/2 transition-all duration-300 group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-purple-500/80 to-pink-500/80 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="p-4 pb-1.5 flex flex-row items-center justify-between space-y-0">
            <span className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground">
              Royalties (HQ)
            </span>
            <div className="h-6 w-6 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600">
              <Percent className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {loading ? (
              <div className="h-7 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-xl font-extrabold text-foreground tracking-tight font-mono">
                {formatCurrency(stats.totalRoyalties)}
              </div>
            )}
            <p className="text-[8px] text-muted-foreground font-semibold mt-1">HQ royalties calculated</p>
          </CardContent>
        </Card>

        {/* Outstanding Payments */}
        <Card className="bg-card border-border hover:border-amber-500/30 hover:shadow-md hover:shadow-amber-500/2 transition-all duration-300 group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-amber-500/80 to-orange-500/80 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="p-4 pb-1.5 flex flex-row items-center justify-between space-y-0">
            <span className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground">
              Outstanding
            </span>
            <div className="h-6 w-6 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Wallet className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {loading ? (
              <div className="h-7 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-xl font-extrabold text-foreground tracking-tight font-mono">
                {formatCurrency(stats.outstandingPayments)}
              </div>
            )}
            <p className="text-[8px] text-muted-foreground font-semibold mt-1">Unpaid invoice balances</p>
          </CardContent>
        </Card>

        {/* Current Accounting Period */}
        <Card className="bg-card border-border hover:border-sky-500/30 hover:shadow-md hover:shadow-sky-500/2 transition-all duration-300 group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-sky-500/80 to-blue-500/80 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="p-4 pb-1.5 flex flex-row items-center justify-between space-y-0">
            <span className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground">
              Active Period
            </span>
            <div className="h-6 w-6 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-600">
              <Clock className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {loading ? (
              <div className="h-7 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-sm font-extrabold text-foreground tracking-tight leading-7 truncate" title={stats.currentAccountingPeriod}>
                {stats.currentAccountingPeriod}
              </div>
            )}
            <p className="text-[8px] text-muted-foreground font-semibold mt-1">Current term or month</p>
          </CardContent>
        </Card>
      </div>

      {/* Main tabbed view switcher */}
      <div className="space-y-6">
        <div className="flex border-b border-border gap-1 overflow-x-auto pb-px">
          <button
            onClick={() => setActiveTab("ledger")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 tracking-tight transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "ledger"
                ? "border-primary text-primary bg-primary/2"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Ledger Viewer
          </button>
          <button
            onClick={() => setActiveTab("royalties")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 tracking-tight transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "royalties"
                ? "border-primary text-primary bg-primary/2"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <Percent className="h-4 w-4" />
            Royalty Pack
          </button>
          <button
            onClick={() => setActiveTab("teacher-pay")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 tracking-tight transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "teacher-pay"
                ? "border-primary text-primary bg-primary/2"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <Users className="h-4 w-4" />
            Teacher Pay Summary
          </button>
          <button
            onClick={() => setActiveTab("expenses")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 tracking-tight transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "expenses"
                ? "border-primary text-primary bg-primary/2"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            Expense List
          </button>
        </div>

        {/* Tab contents */}
        <div className="bg-card border border-border rounded-2xl shadow-sm p-6 overflow-hidden">
          {activeTab === "ledger" && <LedgerViewer branchId={selectedBranch} />}
          {activeTab === "royalties" && <RoyaltyViewer branchId={selectedBranch} />}
          {activeTab === "teacher-pay" && <TeacherPayViewer branchId={selectedBranch} />}
          {activeTab === "expenses" && <ExpenseList branchId={selectedBranch} />}
        </div>
      </div>
    </div>
  );
}
