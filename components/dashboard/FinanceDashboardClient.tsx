"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  FileText,
  Wallet,
  Building2,
  Landmark,
  BookOpen,
  CreditCard,
  Percent,
  DollarSign,
  UserPlus,
  Award,
  Receipt,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { LedgerViewer } from "@/components/dashboard/finance/LedgerViewer";
import { RoyaltyViewer } from "@/components/dashboard/finance/RoyaltyViewer";
import { TeacherPayViewer } from "@/components/dashboard/finance/TeacherPayViewer";
import { ExpenseList } from "@/components/dashboard/finance/ExpenseList";

interface FinanceDashboardClientProps {
  stats: {
    activeStudents: number;
    totalStudents: number;
    activeEnrollments: number;
    totalEnrollments: number;
    branchesCount: number;
    coursesCount: number;
    recentPayments: number;
    invoicesCount?: number;
  };
  invoices: any[];
  payments: any[];
  expenses: any[];
  accounts: any[];
}

type ExpandedSection = "ledger" | "royalties" | "teacher-pay" | "expenses" | null;

export function FinanceDashboardClient({
  stats,
  invoices,
  payments,
  expenses,
  accounts
}: FinanceDashboardClientProps) {
  const [expandedSection, setExpandedSection] = useState<ExpandedSection>("expenses");

  const toggleSection = (section: ExpandedSection) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Finance folders list — only tiles with dedicated finance views remain
  const registryTiers = [
    {
      title: "Financial Registry (T1)",
      description: "Direct accounting books, ledger entries, expenses, and payroll tables",
      color: "border-rose-500/25 bg-rose-500/5",
      items: [
        { name: "Chart of Accounts", count: accounts.length, icon: Landmark, section: null as ExpandedSection, summary: true },
        { name: "Journal Entries & Ledger Lines", count: null, icon: BookOpen, section: "ledger" as ExpandedSection, summary: false },
        { name: "Branch Expenses", count: expenses.length, icon: CreditCard, section: "expenses" as ExpandedSection, summary: false },
        { name: "HQ Franchise Royalties", count: null, icon: Percent, section: "royalties" as ExpandedSection, summary: false },
        { name: "Teacher Pay Runs & Hours", count: null, icon: DollarSign, section: "teacher-pay" as ExpandedSection, summary: false },
      ],
    },
    {
      title: "Student & Billing Registry (T2)",
      description: "Customer directories, active tuition enrollments, and ledger ledgers",
      color: "border-blue-500/25 bg-blue-500/5",
      items: [
        { name: "Students Registry", count: stats.totalStudents, icon: GraduationCap, section: null as ExpandedSection, summary: true },
        { name: "Tuition Enrollments", count: stats.totalEnrollments, icon: UserPlus, section: null as ExpandedSection, summary: true },
        { name: "Invoices Ledger", count: stats.invoicesCount, icon: FileText, section: null as ExpandedSection, summary: true },
        { name: "Payments Received", count: stats.recentPayments, icon: Wallet, section: null as ExpandedSection, summary: true },
      ],
    },
    {
      title: "Academic & Reference (T4)",
      description: "Branches directories, academic curriculum catalogs, and tuition matrices",
      color: "border-purple-500/25 bg-purple-500/5",
      items: [
        { name: "Branches Config", count: stats.branchesCount, icon: Building2, section: null as ExpandedSection, summary: true },
        { name: "Courses Catalog", count: stats.coursesCount, icon: Award, section: null as ExpandedSection, summary: true },
        { name: "Tuition Fee Plans", count: null, icon: Receipt, section: null as ExpandedSection, summary: true },
      ],
    },
  ];

  return (
    <div className="space-y-8 select-none animate-in fade-in duration-300">
      {/* 4 Stats Cards Grid — read-only summary cards, no link-outs to owner routes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Scoped Active Students */}
        <div className="block group">
          <Card className="bg-card border-border hover:border-primary/45 hover:shadow-md transition-all duration-300 hover:-translate-y-1 h-full cursor-default">
            <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
              <span className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground">
                Active Students
              </span>
              <GraduationCap className="h-3.5 w-3.5 text-primary/75" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl font-extrabold text-foreground">{stats.activeStudents}</div>
              <p className="text-[8px] text-muted-foreground font-medium mt-0.5">Reference directories</p>
            </CardContent>
          </Card>
        </div>

        {/* Scoped Billing Invoices */}
        <div className="block group">
          <Card className="bg-card border-border hover:border-primary/45 hover:shadow-md transition-all duration-300 hover:-translate-y-1 h-full cursor-default">
            <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
              <span className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground">
                Total Invoices
              </span>
              <FileText className="h-3.5 w-3.5 text-primary/75" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl font-extrabold text-foreground">{stats.invoicesCount || 0}</div>
              <p className="text-[8px] text-muted-foreground font-medium mt-0.5">Pending & posted billing</p>
            </CardContent>
          </Card>
        </div>

        {/* Payments Collected */}
        <div className="block group">
          <Card className="bg-card border-border hover:border-primary/45 hover:shadow-md transition-all duration-300 hover:-translate-y-1 h-full cursor-default">
            <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
              <span className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground">
                Payments Count
              </span>
              <Wallet className="h-3.5 w-3.5 text-primary/75" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl font-extrabold text-foreground">{stats.recentPayments}</div>
              <p className="text-[8px] text-muted-foreground font-medium mt-0.5">Transactions ledger</p>
            </CardContent>
          </Card>
        </div>

        {/* Scoped Branches */}
        <div className="block group">
          <Card className="bg-card border-border hover:border-primary/45 hover:shadow-md transition-all duration-300 hover:-translate-y-1 h-full cursor-default">
            <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
              <span className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground">
                My Branches
              </span>
              <Building2 className="h-3.5 w-3.5 text-primary/75" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl font-extrabold text-foreground">{stats.branchesCount}</div>
              <p className="text-[8px] text-muted-foreground font-medium mt-0.5">Financial units</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Database folders sections — no links to /dashboard/owner/ */}
      <div className="space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5 pl-1">
          <FolderOpen className="h-4 w-4 text-primary" />
          Finance Division Directories
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {registryTiers.map((tier) => (
            <Card key={tier.title} className="border bg-card shadow-md flex flex-col justify-between overflow-hidden">
              <CardHeader className="border-b border-border/60 py-3.5 px-4 bg-muted/10">
                <CardTitle className="text-xs font-bold text-foreground">{tier.title}</CardTitle>
                <CardDescription className="text-[9px]">{tier.description}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 flex-1">
                <div className="space-y-2">
                  {tier.items.map((item) => {
                    const isExpandable = item.section && !item.summary;
                    const isExpanded = expandedSection === item.section;

                    if (item.summary) {
                      // Summary-only card — no click target, just shows count
                      return (
                        <div
                          key={item.name}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-muted/5"
                        >
                          <div className="flex items-center gap-2">
                            <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-[11px] font-bold text-foreground">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {item.count !== null && (
                              <Badge variant="outline" className="text-[8px] py-0 px-1.5 font-mono text-muted-foreground font-semibold">
                                {item.count}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    }

                    // Expandable tile with dedicated finance view
                    return (
                      <div key={item.name}>
                        <button
                          onClick={() => toggleSection(item.section)}
                          className="w-full flex items-center justify-between p-2.5 rounded-lg border border-border/40 hover:bg-muted/15 transition-colors cursor-pointer group/item"
                        >
                          <div className="flex items-center gap-2">
                            <item.icon className="h-4 w-4 text-muted-foreground group-hover/item:text-primary transition-colors shrink-0" />
                            <span className="text-[11px] font-bold text-foreground">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {item.count !== null && (
                              <Badge variant="outline" className="text-[8px] py-0 px-1.5 font-mono text-muted-foreground font-semibold">
                                {item.count}
                              </Badge>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="h-3 w-3 text-muted-foreground shrink-0" />
                            ) : (
                              <ChevronDown className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                            )}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="mt-2 pl-2">
                            {item.section === "ledger" && <LedgerViewer />}
                            {item.section === "royalties" && <RoyaltyViewer />}
                            {item.section === "teacher-pay" && <TeacherPayViewer />}
                            {item.section === "expenses" && <ExpenseList />}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Financial logs feeds — read-only previews, no link-outs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Payments ledger — no link-out */}
        <Card className="bg-card border-border shadow-md overflow-hidden">
          <CardHeader className="border-b border-border py-4 px-5 bg-muted/10 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-sm font-bold text-foreground">Recent Payments</CardTitle>
              <CardDescription className="text-[10px]">Posted cash flows, credit receipts, and transfers</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            {payments.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No recent payment transactions recorded.
              </div>
            ) : (
              <div className="space-y-4">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between border-b border-border/40 pb-3 last:border-0 last:pb-0">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-foreground font-mono">{p.paymentRef}</span>
                        <Badge variant="outline" className="bg-emerald-500/5 text-emerald-600 border-emerald-500/10 text-[8px] py-0 px-1 capitalize">
                          {p.method || "Cash"}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {p.date ? new Date(p.date).toLocaleDateString() : "—"}
                      </p>
                    </div>
                    <span className="text-xs font-extrabold text-foreground font-mono">
                      ${p.amount?.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Center Column: Recent Invoices issued — no link-out */}
        <Card className="bg-card border-border shadow-md overflow-hidden">
          <CardHeader className="border-b border-border py-4 px-5 bg-muted/10 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-sm font-bold text-foreground">Recent Invoices</CardTitle>
              <CardDescription className="text-[10px]">Tuition fees, materials billing, and assessments</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            {invoices.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No recent invoices issued.
              </div>
            ) : (
              <div className="space-y-4">
                {invoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between border-b border-border/40 pb-3 last:border-0 last:pb-0">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-foreground font-mono">{inv.invoiceNo}</span>
                        <Badge
                          variant="outline"
                          className={`text-[8px] py-0 px-1.5 capitalize font-bold ${
                            inv.status?.toLowerCase() === "paid"
                              ? "bg-emerald-500/5 text-emerald-600 border-emerald-500/10"
                              : "bg-amber-500/5 text-amber-600 border-amber-500/10"
                          }`}
                        >
                          {inv.status || "Draft"}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Due: {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}
                      </p>
                    </div>
                    <span className="text-xs font-extrabold text-foreground font-mono">
                      ${inv.amount?.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Recent Expenses — no link-out */}
        <Card className="bg-card border-border shadow-md overflow-hidden">
          <CardHeader className="border-b border-border py-4 px-5 bg-muted/10 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-sm font-bold text-foreground">Recent Expenses</CardTitle>
              <CardDescription className="text-[10px]">Operational bills, hardware utilities, and payrolls</CardDescription>
            </div>
            <button
              onClick={() => toggleSection("expenses")}
              className="inline-flex items-center gap-1 text-xs text-primary font-bold hover:underline"
            >
              {expandedSection === "expenses" ? "Hide" : "View All"}
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </CardHeader>
          <CardContent className="p-5">
            {expenses.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No recent expense vouchers found.
              </div>
            ) : (
              <div className="space-y-4">
                {expenses.map((exp) => (
                  <div key={exp.id} className="flex items-center justify-between border-b border-border/40 pb-3 last:border-0 last:pb-0">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-foreground font-mono">{exp.expenseNo}</span>
                        <Badge
                          variant="outline"
                          className={`text-[8px] py-0 px-1.5 capitalize font-bold ${
                            exp.paid
                              ? "bg-emerald-500/5 text-emerald-600 border-emerald-500/10"
                              : "bg-rose-500/5 text-rose-600 border-rose-500/10"
                          }`}
                        >
                          {exp.paid ? "Paid" : "Unpaid"}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground line-clamp-1" title={exp.description}>
                        {exp.description || "Utility purchase"}
                      </p>
                    </div>
                    <span className="text-xs font-extrabold text-foreground font-mono">
                      ${exp.amount?.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expanded section content area */}
      {expandedSection === "ledger" && (
        <div className="mt-4">
          <LedgerViewer />
        </div>
      )}
      {expandedSection === "royalties" && (
        <div className="mt-4">
          <RoyaltyViewer />
        </div>
      )}
      {expandedSection === "teacher-pay" && (
        <div className="mt-4">
          <TeacherPayViewer />
        </div>
      )}
      {expandedSection === "expenses" && (
        <div className="mt-4">
          <ExpenseList />
        </div>
      )}
    </div>
  );
}