"use client";

import React, { useState, useTransition, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectAuthRole, validateSessionThunk } from "@/store/slices/authSlice";
import { createTuitionPlanThunk, updateTuitionPlanThunk, fetchOwnerTableData } from "@/store/slices/ownerTableSlice";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Eye,
  FilterX,
  Lock,
  Database,
  Calculator,
  FileCheck,
  Plus,
  Pencil,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { TableConfig } from "@/lib/owner-schema";
import { PaginationControls } from "./PaginationControls";

interface OwnerTableClientProps {
  data: any[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  config: TableConfig;
  branches: any[];
  errorMsg: string | null;
}

export function OwnerTableClient({
  data,
  pagination,
  config,
  branches,
  errorMsg,
}: OwnerTableClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isPending, startTransition] = useTransition();

  // Search local state for debouncing
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [selectedRow, setSelectedRow] = useState<any | null>(null);

  const dispatch = useAppDispatch();
  const userRole = useAppSelector(selectAuthRole);
  const normRole = (userRole || "").toLowerCase().trim();
  const isManager = ["owner", "office_admin", "office/admin", "office admin"].includes(normRole);
  const [isSaving, setIsSaving] = useState(false);

  // Courses list for Tuition Plan form dropdown
  const [coursesList, setCoursesList] = useState<any[]>([]);
  useEffect(() => {
    if (config.modelName === "tuitionPlan") {
      fetch("/api/data/course")
        .then((res) => res.json())
        .then((data) => setCoursesList(Array.isArray(data) ? data : []))
        .catch((err) => console.error("Error fetching courses:", err));
    }
  }, [config.modelName]);

  // Hydrate auth session state on component mount
  useEffect(() => {
    dispatch(validateSessionThunk());
  }, [dispatch]);

  // Query parameter resolver for reload
  const getQueryParams = () => {
    const extraFilters: Record<string, string> = {};
    config.filterableFields.forEach((f) => {
      const val = searchParams.get(f.key);
      if (val !== null && val !== undefined) {
        extraFilters[f.key] = val;
      }
    });
    return {
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "10",
      search: searchParams.get("search") || "",
      sortBy: searchParams.get("sortBy") || config.defaultSortBy,
      sortOrder: (searchParams.get("sortOrder") || config.defaultSortOrder) as "asc" | "desc",
      branchId: searchParams.get("branchId") || "",
      extraFilters,
    };
  };

  // Create/Edit Tuition Plan Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);

  // Form fields state
  const [planName, setPlanName] = useState("");
  const [nameRussian, setNameRussian] = useState("");
  const [courseId, setCourseId] = useState("");
  const [amount, setAmount] = useState("");
  const [billingPeriod, setBillingPeriod] = useState("Monthly");
  const [active, setActive] = useState(true);
  const [discount, setDiscount] = useState(false);
  const [discountType, setDiscountType] = useState("Percent");
  const [discountValue, setDiscountValue] = useState("");
  const [discountReason, setDiscountReason] = useState("Sibling");

  const parsedAmount = Number(amount) || 0;
  const parsedDiscountValue = Number(discountValue) || 0;
  let computedNetAmount = parsedAmount;
  if (discount) {
    if (discountType === "Percent") {
      computedNetAmount = parsedAmount - (parsedAmount * parsedDiscountValue / 100);
    } else if (discountType === "Fixed") {
      computedNetAmount = parsedAmount - parsedDiscountValue;
    }
  }

  // Submit handlers
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planName.trim()) {
      toast.error("Plan Name is required.");
      return;
    }
    if (!courseId) {
      toast.error("Course is required.");
      return;
    }
    if (Number(amount) <= 0) {
      toast.error("Amount must be greater than zero.");
      return;
    }
    if (!billingPeriod) {
      toast.error("Billing Period is required.");
      return;
    }
    if (discount) {
      if (Number(discountValue) <= 0) {
        toast.error("Discount Value must be greater than zero.");
        return;
      }
      if (!discountReason) {
        toast.error("Discount Reason is required.");
        return;
      }
    }
    if (computedNetAmount < 0) {
      toast.error("Net Amount cannot be negative.");
      return;
    }

    try {
      setIsSaving(true);
      const resultAction = await dispatch(createTuitionPlanThunk({
        planName,
        courseId,
        amount: Number(amount),
        billingPeriod,
        active,
        nameRussian,
        discount,
        discountType: discount ? discountType : null,
        discountValue: discount ? Number(discountValue) : null,
        discountReason: discount ? discountReason : null
      }));

      if (createTuitionPlanThunk.fulfilled.match(resultAction)) {
        toast.success("Tuition Plan created successfully!");
        setIsCreateOpen(false);
        // Clear fields
        setPlanName("");
        setNameRussian("");
        setCourseId("");
        setAmount("");
        setBillingPeriod("Monthly");
        setActive(true);
        setDiscount(false);
        setDiscountType("Percent");
        setDiscountValue("");
        setDiscountReason("Sibling");
        dispatch(fetchOwnerTableData({ table: "tuitionplan", ...getQueryParams() }));
      } else {
        toast.error((resultAction.payload as string) || "Failed to create plan");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create plan");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEdit = (plan: any) => {
    setEditingPlan(plan);
    setPlanName(plan.planName || "");
    setNameRussian(plan.nameRussian || "");
    setCourseId(plan.courseIds?.[0] || "");
    setAmount(String(plan.amount || ""));
    setBillingPeriod(plan.billingPeriod || "Monthly");
    setActive(plan.active !== false);
    setDiscount(plan.discount === true);
    setDiscountType(plan.discountType || "Percent");
    setDiscountValue(String(plan.discountValue || ""));
    setDiscountReason(plan.discountReason || "Sibling");
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planName.trim()) {
      toast.error("Plan Name cannot be empty.");
      return;
    }
    if (Number(amount) <= 0) {
      toast.error("Amount must be greater than zero.");
      return;
    }
    if (discount) {
      if (Number(discountValue) <= 0) {
        toast.error("Discount Value must be greater than zero.");
        return;
      }
      if (!discountReason) {
        toast.error("Discount Reason is required.");
        return;
      }
    }
    if (computedNetAmount < 0) {
      toast.error("Net Amount cannot be negative.");
      return;
    }

    try {
      setIsSaving(true);
      const resultAction = await dispatch(updateTuitionPlanThunk({
        id: editingPlan.id,
        planData: {
          planName,
          amount: Number(amount),
          billingPeriod,
          active,
          nameRussian,
          discount,
          discountType: discount ? discountType : null,
          discountValue: discount ? Number(discountValue) : null,
          discountReason: discount ? discountReason : null
        }
      }));

      if (updateTuitionPlanThunk.fulfilled.match(resultAction)) {
        toast.success("Tuition Plan updated successfully!");
        setIsEditOpen(false);
        dispatch(fetchOwnerTableData({ table: "tuitionplan", ...getQueryParams() }));
      } else {
        toast.error((resultAction.payload as string) || "Failed to update plan");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update plan");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (plan: any) => {
    try {
      setIsSaving(true);
      const resultAction = await dispatch(updateTuitionPlanThunk({
        id: plan.id,
        planData: {
          active: !plan.active
        }
      }));

      if (updateTuitionPlanThunk.fulfilled.match(resultAction)) {
        toast.success(`Plan ${!plan.active ? "activated" : "deactivated"} successfully!`);
        dispatch(fetchOwnerTableData({ table: "tuitionplan", ...getQueryParams() }));
      } else {
        toast.error((resultAction.payload as string) || "Failed to toggle status");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle status");
    } finally {
      setIsSaving(false);
    }
  };

  // Debounce search input
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      const currentVal = searchParams.get("search") || "";
      if (searchTerm === currentVal) return;

      const params = new URLSearchParams(searchParams.toString());
      if (searchTerm) {
        params.set("search", searchTerm);
        params.set("page", "1"); // reset to page 1 on search
      } else {
        params.delete("search");
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    }, 450);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm, pathname, router, searchParams]);

  // Sync search input with searchParams changes (e.g. on reset)
  useEffect(() => {
    setSearchTerm(searchParams.get("search") || "");
  }, [searchParams]);

  // General helper to update query parameters
  const updateQueryParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
      params.set("page", "1"); // reset to page 1
    } else {
      params.delete(key);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleSort = (columnKey: string) => {
    const currentSortBy = searchParams.get("sortBy") || config.defaultSortBy;
    const currentSortOrder = searchParams.get("sortOrder") || config.defaultSortOrder;

    let nextOrder: "asc" | "desc" = "asc";
    if (currentSortBy === columnKey) {
      nextOrder = currentSortOrder === "asc" ? "desc" : "asc";
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("sortBy", columnKey);
    params.set("sortOrder", nextOrder);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    startTransition(() => {
      router.push(pathname); // push with empty search query
    });
  };

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  // Determine if sorting is applied to column
  const getSortIcon = (columnKey: string) => {
    const currentSortBy = searchParams.get("sortBy") || config.defaultSortBy;
    const currentSortOrder = searchParams.get("sortOrder") || config.defaultSortOrder;

    if (currentSortBy !== columnKey) {
      return <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-40 shrink-0" />;
    }
    return currentSortOrder === "asc" ? (
      <ArrowUp className="ml-1 h-3.5 w-3.5 text-primary shrink-0 animate-in fade-in" />
    ) : (
      <ArrowDown className="ml-1 h-3.5 w-3.5 text-primary shrink-0 animate-in fade-in" />
    );
  };

  // Check if any filters are active
  const hasActiveFilters =
    searchParams.has("search") ||
    searchParams.has("branchId") ||
    searchParams.has("sortBy") ||
    searchParams.has("sortOrder") ||
    searchParams.has("limit") ||
    config.filterableFields.some((f) => searchParams.has(f.key));

  // Helper to format values in the table cells
  const renderCellValue = (row: any, col: any) => {
    const val = row[col.key];

    if (val === undefined || val === null) return <span className="text-muted-foreground/60">—</span>;

    if (col.type === "date") {
      try {
        return <span className="font-mono text-xs">{new Date(val).toLocaleDateString("en-US")}</span>;
      } catch {
        return <span className="text-xs">{String(val)}</span>;
      }
    }

    if (col.type === "boolean") {
      return (
        <Badge
          variant="outline"
          className={
            val
              ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 font-semibold"
              : "bg-muted text-muted-foreground border-border font-medium"
          }
        >
          {val ? "Yes" : "No"}
        </Badge>
      );
    }

    if (col.type === "array") {
      if (!Array.isArray(val) || val.length === 0) {
        return <span className="text-muted-foreground/60">—</span>;
      }
      const displayItems = col.key === "courseIds" && config.modelName === "tuitionPlan"
        ? val.map((id: string) => coursesList.find((c) => c.id === id)?.courseName || id)
        : val;
      return (
        <div className="flex flex-wrap gap-1 max-w-50">
          {displayItems.slice(0, 3).map((item: any, idx: number) => (
            <Badge key={idx} variant="secondary" className="text-[10px] py-0 px-1 font-medium bg-muted border border-border">
              {item}
            </Badge>
          ))}
          {displayItems.length > 3 && (
            <Badge variant="outline" className="text-[10px] py-0 px-1 border-dashed">
              +{displayItems.length - 3} more
            </Badge>
          )}
        </div>
      );
    }

    if (col.type === "number") {
      const isMonetary =
        ["amount", "grossPay", "rate", "debit", "credit", "revenueBase"].includes(col.key);
      if (isMonetary) {
        return <span className="font-mono font-semibold text-foreground">${val.toLocaleString("en-US")}</span>;
      }
      return <span className="font-mono text-foreground">{val.toString()}</span>;
    }

    // Default string rendering
    return <span className="text-foreground truncate max-w-xs">{val.toString()}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Constraints Alerts / Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {config.isReadOnlyTable && (
            <Badge className="bg-purple-500/10 border-purple-500/20 text-purple-600 flex items-center gap-1.5 font-bold uppercase tracking-wider py-1 text-[10px]">
              <Lock className="h-3 w-3" />
              Read-Only Administration Schema
            </Badge>
          )}
          {config.isAppendOnlyTable && (
            <Badge className="bg-amber-500/10 border-amber-500/20 text-amber-600 flex items-center gap-1.5 font-bold uppercase tracking-wider py-1 text-[10px]">
              <Database className="h-3 w-3" />
              Append-Only Financial Ledger (Locked)
            </Badge>
          )}
          {config.columns.some((c) => c.isComputed) && (
            <Badge className="bg-blue-500/10 border-blue-500/20 text-blue-600 flex items-center gap-1.5 font-bold uppercase tracking-wider py-1 text-[10px]">
              <Calculator className="h-3 w-3" />
              Includes Computed Values
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
          {isPending && (
            <>
              <Spinner className="text-primary size-4" />
              <span className="text-primary animate-pulse">Syncing...</span>
            </>
          )}
        </div>
      </div>

      {/* Filter and Search Panel */}
      <Card className="bg-card border-border shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: Search input */}
          <div className="relative flex-1 max-w-sm min-w-55">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search ${config.label.toLowerCase()}...`}
              className="pl-9 h-9 text-sm rounded-lg"
            />
          </div>

          {/* Right: Select filters & reset */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Branch Filter (if applicable) */}
            {(config.columns.some((c) => c.key === "branchIds") ||
              config.modelName === "branch" ||
              config.modelName === "tuitionPlan") &&
              branches.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Branch:</span>
                  <NativeSelect
                    value={searchParams.get("branchId") || ""}
                    onChange={(e) => updateQueryParam("branchId", e.target.value)}
                    size="sm"
                  >
                    <NativeSelectOption value="">All Branches</NativeSelectOption>
                    {branches.map((b) => (
                      <NativeSelectOption key={b.id} value={b.id}>
                        {b.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>
              )}

            {/* Course Filter for Tuition Plans */}
            {config.modelName === "tuitionPlan" && coursesList.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Course:</span>
                <NativeSelect
                  value={searchParams.get("courseId") || ""}
                  onChange={(e) => updateQueryParam("courseId", e.target.value)}
                  size="sm"
                >
                  <NativeSelectOption value="">All Courses</NativeSelectOption>
                  {coursesList.map((c) => (
                    <NativeSelectOption key={c.id} value={c.id}>
                      {c.courseName}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            )}

            {/* Dynamic Column Filters */}
            {config.filterableFields.map((filter) => (
              <div key={filter.key} className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {filter.label}:
                </span>
                <NativeSelect
                  value={searchParams.get(filter.key) || ""}
                  onChange={(e) => updateQueryParam(filter.key, e.target.value)}
                  size="sm"
                >
                  <NativeSelectOption value="">All</NativeSelectOption>
                  {filter.type === "boolean" ? (
                    <>
                      <NativeSelectOption value="true">Yes</NativeSelectOption>
                      <NativeSelectOption value="false">No</NativeSelectOption>
                    </>
                  ) : (
                    filter.options?.map((opt) => (
                      <NativeSelectOption key={opt} value={opt}>
                        {opt}
                      </NativeSelectOption>
                    ))
                  )}
                </NativeSelect>
              </div>
            ))}

            {/* Controls */}
            <div className="flex items-center gap-1.5 ml-auto md:ml-0 border-l border-border pl-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                title="Refresh Table"
                className="h-8 w-8 p-0 rounded-lg hover:bg-muted border border-border cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${isPending ? "animate-spin" : ""}`} />
              </Button>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-8 text-xs font-medium text-destructive hover:bg-destructive/10 hover:text-destructive flex items-center gap-1 rounded-lg cursor-pointer"
                >
                  <FilterX className="h-3.5 w-3.5" />
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table Card */}
      {errorMsg ? (
        <Card className="border-destructive/20 bg-destructive/5 text-destructive p-8 text-center text-sm font-semibold rounded-xl flex flex-col items-center gap-3">
          <span>Error loading data: {errorMsg}</span>
          <Button variant="outline" className="border-destructive/30 hover:bg-destructive/10 text-destructive text-xs cursor-pointer" onClick={handleRefresh}>
            Retry
          </Button>
        </Card>
      ) : (
        <Card className="bg-card border-border shadow-md overflow-hidden rounded-xl">
          <CardHeader className="border-b border-border py-4 px-6 bg-muted/10 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              {config.label.toUpperCase()} RECORDS ({pagination.total})
            </CardTitle>
            <div className="flex items-center gap-4">
              {config.modelName === "tuitionPlan" && isManager && (
                <Button
                  onClick={() => {
                    setPlanName("");
                    setNameRussian("");
                    setCourseId("");
                    setAmount("");
                    setBillingPeriod("Monthly");
                    setActive(true);
                    setDiscount(false);
                    setDiscountType("Percent");
                    setDiscountValue("");
                    setDiscountReason("Sibling");
                    setIsCreateOpen(true);
                  }}
                  className="h-8 text-xs font-bold gap-1 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create Tuition Plan
                </Button>
              )}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Page size:</span>
                <NativeSelect
                  value={searchParams.get("limit") || "10"}
                  onChange={(e) => updateQueryParam("limit", e.target.value)}
                  size="sm"
                  className="w-16"
                >
                  <NativeSelectOption value="10">10</NativeSelectOption>
                  <NativeSelectOption value="25">25</NativeSelectOption>
                  <NativeSelectOption value="50">50</NativeSelectOption>
                  <NativeSelectOption value="100">100</NativeSelectOption>
                </NativeSelect>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto relative">
              <Table className="min-w-full">
                <TableHeader className="sticky top-0 bg-card z-10 border-b border-border shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                  <TableRow className="hover:bg-transparent">
                    {config.columns.map((col) => (
                      <TableHead
                        key={col.key}
                        className={`px-5 py-3.5 font-bold text-xs text-muted-foreground uppercase select-none ${
                          col.sortable ? "cursor-pointer hover:bg-muted/30 hover:text-foreground" : ""
                        }`}
                        onClick={() => col.sortable && handleSort(col.key)}
                      >
                        <div className="flex items-center">
                          <span>{col.label}</span>
                          {col.sortable && getSortIcon(col.key)}
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="px-5 py-3.5 font-bold text-xs text-muted-foreground uppercase text-right w-16">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border">
                  {data.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={config.columns.length + 1}
                        className="h-48 text-center text-sm text-muted-foreground leading-relaxed"
                      >
                        No records found matching filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.map((row) => (
                      <TableRow key={row.id} className="hover:bg-muted/20 transition-colors border-b border-border/40">
                        {config.columns.map((col) => (
                          <TableCell key={col.key} className="px-5 py-4 text-sm font-medium">
                            <div className="flex items-center gap-1.5">
                              {renderCellValue(row, col)}
                              {col.isComputed && (
                                <span title="Computed Column" className="cursor-help shrink-0">
                                  <Calculator className="h-3 w-3 text-blue-500 opacity-80" />
                                </span>
                              )}
                              {col.isReadOnly && (
                                <span title="Read-Only Field" className="cursor-help shrink-0">
                                  <Lock className="h-3 w-3 text-amber-500 opacity-80" />
                                </span>
                              )}
                            </div>
                          </TableCell>
                        ))}
                        <TableCell className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="hover:bg-primary/10 hover:text-primary rounded-lg cursor-pointer"
                              onClick={() => setSelectedRow(row)}
                              title="Inspect Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {config.modelName === "tuitionPlan" && isManager && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="hover:bg-amber-500/10 hover:text-amber-500 rounded-lg cursor-pointer"
                                  onClick={() => handleStartEdit(row)}
                                  title="Edit Tuition Plan"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className={row.active ? "hover:bg-rose-500/10 hover:text-rose-500 rounded-lg cursor-pointer text-emerald-600" : "hover:bg-emerald-500/10 hover:text-emerald-500 rounded-lg cursor-pointer text-muted-foreground"}
                                  onClick={() => handleToggleActive(row)}
                                  title={row.active ? "Deactivate Plan" : "Activate Plan"}
                                >
                                  {row.active ? <ToggleRight className="h-5.5 w-5.5" /> : <ToggleLeft className="h-5.5 w-5.5" />}
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {/* Pagination bar */}
            <div className="px-6 py-4 border-t border-border bg-muted/5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">
                Showing {data.length} of {pagination.total} records
              </span>
              <PaginationControls
                totalPages={pagination.totalPages}
                currentPage={pagination.page}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Row Inspect Dialog (radix primitive based Dialog) */}
      <Dialog open={!!selectedRow} onOpenChange={(open) => !open && setSelectedRow(null)}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col justify-between">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" />
              Record Inspector
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Reviewing entry details under System Owner clearance.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 scrollbar-thin">
            <div className="grid grid-cols-2 gap-4">
              {config.columns.map((col) => {
                const isArray = col.type === "array";
                const isObjVal = selectedRow ? selectedRow[col.key] : null;

                return (
                  <div
                    key={col.key}
                    className={`space-y-1.5 p-2.5 rounded-lg border border-border/30 bg-muted/20 ${
                      isArray || col.key === "notes" || col.key === "medicalNotes" || col.key === "address"
                        ? "col-span-2"
                        : "col-span-1"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/90">
                      <span>{col.label}</span>
                      {col.isComputed && <span className="text-blue-500 font-medium text-[8px] bg-blue-500/10 px-1 rounded uppercase">Computed</span>}
                      {col.isReadOnly && <span className="text-amber-500 font-medium text-[8px] bg-amber-500/10 px-1 rounded uppercase">Locked</span>}
                    </div>

                    <div className="text-sm font-semibold text-foreground break-all select-all font-mono leading-relaxed">
                      {selectedRow ? (
                        isArray ? (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Array.isArray(isObjVal) && isObjVal.length > 0 ? (
                              isObjVal.map((item: any, idx: number) => (
                                <Badge key={idx} variant="secondary" className="text-[10px] font-medium py-0.5 px-2 bg-muted text-foreground border border-border">
                                  {String(item)}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground/60">—</span>
                            )}
                          </div>
                        ) : col.type === "date" ? (
                          isObjVal ? (
                            new Date(isObjVal).toLocaleString("en-US")
                          ) : (
                            "—"
                          )
                        ) : col.type === "boolean" ? (
                          <Badge
                            variant="outline"
                            className={
                              isObjVal
                                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 font-semibold"
                                : "bg-muted text-muted-foreground border-border font-medium"
                            }
                          >
                            {isObjVal ? "True" : "False"}
                          </Badge>
                        ) : col.type === "number" && ["amount", "grossPay", "rate", "debit", "credit", "revenueBase"].includes(col.key) ? (
                          `$${Number(isObjVal).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                        ) : isObjVal !== null && isObjVal !== undefined ? (
                          String(isObjVal)
                        ) : (
                          "—"
                        )
                      ) : (
                        "—"
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="border-t border-border pt-3">
            <Button
              variant="outline"
              onClick={() => setSelectedRow(null)}
              className="text-xs cursor-pointer"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Tuition Plan Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => !open && setIsCreateOpen(false)}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Create Tuition Plan
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure a new tuition plan for course enrollments.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Plan Name *</Label>
              <Input
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="e.g. Standard Monthly Course Plan"
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Name (Russian)</Label>
              <Input
                value={nameRussian}
                onChange={(e) => setNameRussian(e.target.value)}
                placeholder="e.g. Стандартный ежемесячный тариф"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Course *</Label>
              <NativeSelect
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                required
                size="sm"
              >
                <option value="">Select a course...</option>
                {coursesList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.courseName}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Amount (KGS) *</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  required
                  className="h-9 text-xs font-mono"
                  min="0.01"
                  step="0.01"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Billing Period *</Label>
                <NativeSelect
                  value={billingPeriod}
                  onChange={(e) => setBillingPeriod(e.target.value)}
                  required
                  size="sm"
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Term">Term</option>
                  <option value="Annual">Annual</option>
                </NativeSelect>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/10">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold text-muted-foreground cursor-pointer" htmlFor="active-create">
                  Active
                </Label>
                <p className="text-[10px] text-muted-foreground/60">Allow selection in enrollment forms</p>
              </div>
              <input
                id="active-create"
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
              />
            </div>

            {/* Discount Fields */}
            <div className="p-3 rounded-lg border border-border/40 bg-muted/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold text-muted-foreground cursor-pointer" htmlFor="discount-create">
                    Enable Discount
                  </Label>
                  <p className="text-[10px] text-muted-foreground/60">Apply tuition discount to this plan</p>
                </div>
                <input
                  id="discount-create"
                  type="checkbox"
                  checked={discount}
                  onChange={(e) => setDiscount(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                />
              </div>

              {discount && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40 animate-in slide-in-from-top-2 duration-200">
                  <div className="space-y-1.5 col-span-1">
                    <Label className="text-xs font-semibold text-muted-foreground">Discount Type</Label>
                    <NativeSelect
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value)}
                      size="sm"
                    >
                      <option value="Percent">Percent</option>
                      <option value="Fixed">Fixed</option>
                    </NativeSelect>
                  </div>

                  <div className="space-y-1.5 col-span-1">
                    <Label className="text-xs font-semibold text-muted-foreground">Discount Value *</Label>
                    <Input
                      type="number"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder={discountType === "Percent" ? "e.g. 10 (%)" : "e.g. 500 (KGS)"}
                      required={discount}
                      min="0.01"
                      step="0.01"
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs font-semibold text-muted-foreground">Discount Reason *</Label>
                    <NativeSelect
                      value={discountReason}
                      onChange={(e) => setDiscountReason(e.target.value)}
                      required={discount}
                      size="sm"
                    >
                      <option value="Sibling">Sibling</option>
                      <option value="Referral">Referral</option>
                      <option value="Early Payment">Early Payment</option>
                      <option value="Financial Hardship">Financial Hardship</option>
                      <option value="Promotion">Promotion</option>
                      <option value="Staff">Staff</option>
                      <option value="Other">Other</option>
                    </NativeSelect>
                  </div>
                </div>
              )}
            </div>

            {/* Net Amount Preview */}
            <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground">Net Amount (Preview)</Label>
              <span className={`font-mono text-sm font-extrabold ${computedNetAmount < 0 ? "text-rose-600" : "text-primary"}`}>
                {computedNetAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} KGS
              </span>
            </div>

            <DialogFooter className="border-t border-border pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving || computedNetAmount < 0}
                className="text-xs cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground font-bold flex items-center gap-1.5"
              >
                {isSaving && <Spinner className="size-3 text-primary-foreground" />}
                {isSaving ? "Creating..." : "Create Plan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Tuition Plan Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => !open && setIsEditOpen(false)}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Edit Tuition Plan
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Modify the configuration parameters of the tuition plan.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Plan Name *</Label>
              <Input
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="e.g. Standard Monthly Course Plan"
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Name (Russian)</Label>
              <Input
                value={nameRussian}
                onChange={(e) => setNameRussian(e.target.value)}
                placeholder="e.g. Стандартный ежемесячный тариф"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Course (Read-Only)</Label>
              <Input
                value={coursesList.find(c => c.id === courseId)?.courseName || "Unknown Course"}
                disabled
                className="h-9 text-xs bg-muted/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Amount (KGS) *</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  required
                  className="h-9 text-xs font-mono"
                  min="0.01"
                  step="0.01"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Billing Period *</Label>
                <NativeSelect
                  value={billingPeriod}
                  onChange={(e) => setBillingPeriod(e.target.value)}
                  required
                  size="sm"
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Term">Term</option>
                  <option value="Annual">Annual</option>
                </NativeSelect>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/10">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold text-muted-foreground cursor-pointer" htmlFor="active-edit">
                  Active
                </Label>
                <p className="text-[10px] text-muted-foreground/60">Allow selection in enrollment forms</p>
              </div>
              <input
                id="active-edit"
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
              />
            </div>

            {/* Discount Fields */}
            <div className="p-3 rounded-lg border border-border/40 bg-muted/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold text-muted-foreground cursor-pointer" htmlFor="discount-edit">
                    Enable Discount
                  </Label>
                  <p className="text-[10px] text-muted-foreground/60">Apply tuition discount to this plan</p>
                </div>
                <input
                  id="discount-edit"
                  type="checkbox"
                  checked={discount}
                  onChange={(e) => setDiscount(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                />
              </div>

              {discount && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40 animate-in slide-in-from-top-2 duration-200">
                  <div className="space-y-1.5 col-span-1">
                    <Label className="text-xs font-semibold text-muted-foreground">Discount Type</Label>
                    <NativeSelect
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value)}
                      size="sm"
                    >
                      <option value="Percent">Percent</option>
                      <option value="Fixed">Fixed</option>
                    </NativeSelect>
                  </div>

                  <div className="space-y-1.5 col-span-1">
                    <Label className="text-xs font-semibold text-muted-foreground">Discount Value *</Label>
                    <Input
                      type="number"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder={discountType === "Percent" ? "e.g. 10 (%)" : "e.g. 500 (KGS)"}
                      required={discount}
                      min="0.01"
                      step="0.01"
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs font-semibold text-muted-foreground">Discount Reason *</Label>
                    <NativeSelect
                      value={discountReason}
                      onChange={(e) => setDiscountReason(e.target.value)}
                      required={discount}
                      size="sm"
                    >
                      <option value="Sibling">Sibling</option>
                      <option value="Referral">Referral</option>
                      <option value="Early Payment">Early Payment</option>
                      <option value="Financial Hardship">Financial Hardship</option>
                      <option value="Promotion">Promotion</option>
                      <option value="Staff">Staff</option>
                      <option value="Other">Other</option>
                    </NativeSelect>
                  </div>
                </div>
              )}
            </div>

            {/* Net Amount Preview */}
            <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground">Net Amount (Preview)</Label>
              <span className={`font-mono text-sm font-extrabold ${computedNetAmount < 0 ? "text-rose-600" : "text-primary"}`}>
                {computedNetAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} KGS
              </span>
            </div>

            <DialogFooter className="border-t border-border pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                className="text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving || computedNetAmount < 0}
                className="text-xs cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground font-bold flex items-center gap-1.5"
              >
                {isSaving && <Spinner className="size-3 text-primary-foreground" />}
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
