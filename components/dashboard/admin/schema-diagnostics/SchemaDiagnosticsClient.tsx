"use client";

import React, { useEffect, useState, useTransition } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Shield,
  Activity,
  FileCode,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Database,
  Cloud,
  Network,
  RefreshCw,
  Search,
  Lock,
  Loader2,
  FileSpreadsheet,
} from "lucide-react";

interface SchemaDiagnosticsClientProps {
  userRole: string;
  userName: string;
}

export function SchemaDiagnosticsClient({
  userRole,
  userName,
}: SchemaDiagnosticsClientProps) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Read-only fields list search/filter state
  const [searchField, setSearchField] = useState("");
  const [selectedTable, setSelectedTable] = useState("");

  const [, startTransition] = useTransition();

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  const fetchDiagnostics = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/dashboard/admin/schema-diagnostics");
      if (!res.ok) throw new Error("Failed to load schema diagnostics");
      const json = await res.json();
      startTransition(() => {
        setData(json);
      });
    } catch (error) {
      console.error("[Schema Diagnostics Fetch Error]", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === "healthy" || status === "ready" || status === "success") {
      return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    }
    if (status === "warning" || status === "pending" || status === "not_ready") {
      return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    }
    return "text-rose-500 bg-rose-500/10 border-rose-500/20";
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground font-semibold">Running infrastructure diagnostics...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-12 text-center text-xs text-rose-500 font-bold">
        Failed to fetch diagnostics reports. Please check server configurations.
      </div>
    );
  }

  const { hashes, schemaDiff, mappingWarnings, readOnlyFields, rateLimit, health, caddyStatus, breakGlass, meta } = data;

  // Filter read-only fields list
  const filteredReadOnly = readOnlyFields.filter((f: any) => {
    const matchesSearch =
      f.fieldName.toLowerCase().includes(searchField.toLowerCase()) ||
      f.fieldId.toLowerCase().includes(searchField.toLowerCase());
    const matchesTable = !selectedTable || f.table === selectedTable;
    return matchesSearch && matchesTable;
  });

  const uniqueTables = Array.from(new Set(readOnlyFields.map((f: any) => f.table))) as string[];

  return (
    <div className="space-y-8 select-none animate-in fade-in duration-500 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5">
            <span>Admin Control</span>
            <span>/</span>
            <span className="text-foreground font-semibold">Schema Diagnostics</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground bg-linear-to-r from-foreground via-foreground/90 to-foreground/75 bg-clip-text">
            Schema Diagnostics
          </h1>
          <p className="text-muted-foreground text-xs mt-1 max-w-xl leading-relaxed font-medium">
            Monitor metadata mapping alignment, schema hashing differences, API concurrency queues, and proxy health endpoints.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchDiagnostics}
            disabled={refreshing}
            className="p-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground hover:shadow-sm active:scale-95 transition-all cursor-pointer shrink-0 disabled:opacity-50"
            title="Re-run checks"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
          </button>
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
            Role: {userRole === "owner" ? "Owner" : "Tech Administrator (Metadata Lock)"}
          </Badge>
        </div>
      </div>

      {/* Break-Glass Status Banner */}
      <div className="bg-muted/10 border border-border/40 px-5 py-3.5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Shield className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground">Tech Admin Break-Glass Status</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{breakGlass.details}</div>
          </div>
        </div>
        <div>
          <Badge variant="outline" className="bg-muted/50 border-border text-muted-foreground font-semibold px-3 py-1 text-[10px]">
            {breakGlass.status}
          </Badge>
        </div>
      </div>

      {/* Grid: Health Check Summaries */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Schema Status */}
        <Card className="bg-card border-border hover:shadow-md transition-all duration-300">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground">Schema Integrity</span>
            <FileCode className="h-4 w-4 text-muted-foreground/60" />
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div className="flex items-center gap-1.5 mt-1">
              {hashes.hashMatched ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-extrabold text-foreground">Matched (Baseline)</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-extrabold text-amber-500">Mismatched Hash</span>
                </>
              )}
            </div>
            <div className="space-y-1.5 text-[9px] font-mono leading-none">
              <div>
                <span className="text-muted-foreground">Baseline:</span>{" "}
                <span className="text-foreground/80 font-bold block truncate w-full" title={hashes.baselineHash}>
                  {hashes.baselineHash.slice(0, 16)}...
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Current:</span>{" "}
                <span className="text-foreground/80 font-bold block truncate w-full" title={hashes.currentHash}>
                  {hashes.currentHash.slice(0, 16)}...
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Database Connection */}
        <Card className="bg-card border-border hover:shadow-md transition-all duration-300">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground">Database Probe</span>
            <Database className="h-4 w-4 text-muted-foreground/60" />
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant="outline" className={`capitalize font-bold text-[9px] ${getStatusColor(health.database)}`}>
                {health.database}
              </Badge>
            </div>
            <div className="text-[9px] text-muted-foreground leading-normal">
              PostgreSQL cache connectivity via Prisma ORM pool checks is running successfully.
            </div>
          </CardContent>
        </Card>

        {/* Airtable API Connectivity */}
        <Card className="bg-card border-border hover:shadow-md transition-all duration-300">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground">Airtable API Reach</span>
            <Cloud className="h-4 w-4 text-muted-foreground/60" />
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant="outline" className={`capitalize font-bold text-[9px] ${getStatusColor(health.airtableConnection)}`}>
                {health.airtableConnection}
              </Badge>
            </div>
            <div className="text-[9px] text-muted-foreground leading-normal font-mono">
              Base: {meta.baseId.slice(0, 8)}...<br />
              Loaded Tables: {meta.totalTables} mapped
            </div>
          </CardContent>
        </Card>

        {/* Ready status summary */}
        <Card className="bg-card border-border hover:shadow-md transition-all duration-300">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground">Readiness Probe</span>
            <Activity className="h-4 w-4 text-muted-foreground/60" />
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant="outline" className={`capitalize font-bold text-[9px] ${getStatusColor(health.readyStatus)}`}>
                {health.readyStatus === "ready" ? "Operational" : "Degraded"}
              </Badge>
            </div>
            <div className="text-[9px] text-muted-foreground leading-normal">
              API liveness `/healthz` and readiness `/readyz` checkers returned successfully.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mismatch Warning Alert if schema is different */}
      {!hashes.hashMatched && hashes.currentHash !== "UNREACHABLE" && (
        <div className="bg-amber-500/5 border border-amber-500/10 p-5 rounded-2xl flex items-start gap-3.5 select-text">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-extrabold text-amber-600">Schema Mismatch Detected</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              The live Airtable base schema does not match the configured `schema-baseline.json`. This usually indicates that columns or tables were added, removed, or changed inside Airtable directly. Please review the detailed changes below.
            </p>
          </div>
        </div>
      )}

      {/* Airtable API Proxy rate limits details */}
      <Card className="bg-card border-border">
        <CardHeader className="border-b border-border/40 p-5">
          <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Network className="h-4 w-4 text-primary" />
            <span>Airtable Proxy Rate Limit & Queue Monitor</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs select-text">
            <div>
              <span className="text-muted-foreground font-semibold">Concurrency Pool</span>
              <span className="font-mono font-bold text-foreground mt-1 block">
                {rateLimit.activeCount} / {rateLimit.maxConcurrency} requests active
              </span>
            </div>
            <div>
              <span className="text-muted-foreground font-semibold">Queue Length</span>
              <span className="font-mono font-bold text-foreground mt-1 block">
                {rateLimit.queueLength} requests queued
              </span>
            </div>
            <div>
              <span className="text-muted-foreground font-semibold">Pacing Interval</span>
              <span className="font-mono font-bold text-foreground mt-1 block">
                {rateLimit.minInterval}ms between requests
              </span>
            </div>
            <div>
              <span className="text-muted-foreground font-semibold">Throttle Backoff</span>
              <span className="font-mono font-bold mt-1 block">
                {rateLimit.isPaused ? (
                  <span className="text-amber-500 font-extrabold">Active (Backing off...)</span>
                ) : (
                  <span className="text-emerald-500 font-bold">Idle (Green)</span>
                )}
              </span>
            </div>
            {rateLimit.last429Time && (
              <div className="col-span-2 md:col-span-4 border-t border-border/40 pt-4 flex flex-col md:flex-row md:items-center justify-between gap-2 text-[10px]">
                <div className="text-rose-600 font-bold flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Last 429 Throttle Event Triggered</span>
                </div>
                <div className="font-mono font-semibold text-muted-foreground">
                  Time: {new Date(rateLimit.last429Time).toLocaleTimeString()} | Cool-down Duration: {rateLimit.last429Duration}ms
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Schema comparison breakdown */}
      {hashes.currentHash !== "UNREACHABLE" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 select-text">
          {/* Added & Removed Tables */}
          <Card className="bg-card border-border p-5 space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-tight text-foreground border-b border-border/40 pb-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Added & Removed Tables</span>
            </h4>
            <div className="space-y-4 text-xs font-medium">
              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-bold block mb-1">Added Tables ({schemaDiff.addedTables.length})</span>
                {schemaDiff.addedTables.length === 0 ? (
                  <span className="text-muted-foreground/60 block italic">None</span>
                ) : (
                  <ul className="list-disc pl-4 space-y-1 text-emerald-600">
                    {schemaDiff.addedTables.map((t: string) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-bold block mb-1">Removed Tables ({schemaDiff.removedTables.length})</span>
                {schemaDiff.removedTables.length === 0 ? (
                  <span className="text-muted-foreground/60 block italic">None</span>
                ) : (
                  <ul className="list-disc pl-4 space-y-1 text-rose-600">
                    {schemaDiff.removedTables.map((t: string) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Card>

          {/* Renamed Tables & Modified fields */}
          <Card className="bg-card border-border p-5 space-y-4 lg:col-span-2">
            <h4 className="text-xs font-extrabold uppercase tracking-tight text-foreground border-b border-border/40 pb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span>Renamed & Type-Mismatched Columns</span>
            </h4>
            <div className="space-y-4 text-xs font-medium">
              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-bold block mb-1">Renamed Tables ({schemaDiff.renamedTables.length})</span>
                {schemaDiff.renamedTables.length === 0 ? (
                  <span className="text-muted-foreground/60 block italic">None</span>
                ) : (
                  <ul className="list-disc pl-4 space-y-1">
                    {schemaDiff.renamedTables.map((t: any, idx: number) => (
                      <li key={idx}>
                        <span className="text-muted-foreground font-bold">{t.oldName}</span>{" "}
                        <span className="text-amber-500 font-extrabold">→</span>{" "}
                        <span className="text-foreground font-bold">{t.newName}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-bold block mb-1">Type Mismatches ({schemaDiff.fieldTypeMismatches.length})</span>
                {schemaDiff.fieldTypeMismatches.length === 0 ? (
                  <span className="text-muted-foreground/60 block italic">None</span>
                ) : (
                  <ul className="list-disc pl-4 space-y-1.5 font-semibold">
                    {schemaDiff.fieldTypeMismatches.map((m: any, idx: number) => (
                      <li key={idx}>
                        Table: <span className="text-foreground">{m.table}</span> | Field: <span className="text-muted-foreground font-mono">{m.field}</span>
                        <div className="text-[10px] text-rose-600 font-mono mt-0.5">
                          {m.oldType} → {m.newType}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Mapped Fields Integrity Warnings */}
      {mappingWarnings.length > 0 && (
        <Card className="bg-card border-border p-5 space-y-3 select-text">
          <h4 className="text-xs font-extrabold uppercase tracking-tight text-rose-600 border-b border-border/40 pb-2 flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            <span>Mapped Fields Integrity Errors (Field Map Mismatches)</span>
          </h4>
          <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
            {mappingWarnings.map((w: string, idx: number) => (
              <div key={idx} className="flex gap-2 text-xs font-semibold text-rose-700 bg-rose-500/5 p-2 rounded border border-rose-500/10">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Read-Only Field Inventory (Searchable / Filterable table) */}
      <Card className="bg-card border-border">
        <CardHeader className="border-b border-border/40 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              Read-Only Fields Inventory
            </CardTitle>
            <Badge variant="outline" className="text-[8px] font-mono py-0 px-1.5">
              {filteredReadOnly.length} fields
            </Badge>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search filter */}
            <div className="relative w-full sm:w-48">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground/60" />
              <Input
                value={searchField}
                onChange={(e) => setSearchField(e.target.value)}
                placeholder="Search fields..."
                className="pl-9 text-xs h-9 rounded-xl focus-visible:ring-primary/20 border-border"
              />
            </div>

            {/* Table filter */}
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="bg-card border border-border px-3 py-1.5 rounded-xl text-xs font-semibold text-foreground focus:ring-0 focus:outline-none cursor-pointer h-9 shadow-sm"
            >
              <option value="">All Tables</option>
              {uniqueTables.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0 select-text">
          <div className="max-h-[350px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground select-none sticky top-0 bg-card z-10">
                  <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Field Name</th>
                  <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Airtable ID</th>
                  <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Table</th>
                  <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredReadOnly.map((f: any, idx: number) => (
                  <tr key={idx} className="hover:bg-muted/10 transition-colors">
                    <td className="p-3 font-bold text-foreground">{f.fieldName}</td>
                    <td className="p-3 font-mono text-muted-foreground">{f.fieldId}</td>
                    <td className="p-3 font-semibold">{f.table}</td>
                    <td className="p-3">
                      <Badge variant="secondary" className="text-[9px] py-0.5 px-2 bg-muted text-muted-foreground border-none capitalize font-bold">
                        {f.reason}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Caddy Proxy / TLS Status */}
      <Card className="bg-card border-border p-5 space-y-3 select-text">
        <h4 className="text-xs font-extrabold uppercase tracking-tight text-foreground border-b border-border/40 pb-2 flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" />
          <span>Caddy Reverse Proxy & TLS Configuration</span>
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-medium">
          <div>
            <span className="text-muted-foreground">Reverse Proxy</span>
            <span className="font-bold text-foreground mt-0.5 block">{caddyStatus.proxy}</span>
          </div>
          <div>
            <span className="text-muted-foreground">TLS Status</span>
            <span className="font-bold text-foreground mt-0.5 block">{caddyStatus.tlsStatus}</span>
          </div>
          <div>
            <span className="text-muted-foreground">HTTPS protocol</span>
            <span className="font-bold text-foreground mt-0.5 block">{caddyStatus.https}</span>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground leading-normal mt-2">
          {caddyStatus.details}
        </p>
      </Card>
    </div>
  );
}
