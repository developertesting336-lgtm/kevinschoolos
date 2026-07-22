"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectAuthRole } from "@/store/slices/authSlice";
import { fetchPaymentsData, createPaymentThunk } from "@/store/slices/paymentsSlice";
import { PaymentTable } from "./PaymentTable";
import { PaymentCard, PaymentCardSkeleton } from "./PaymentCard";
import { PaymentDrawer } from "./PaymentDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Wallet,
  Plus,
  Search,
  Filter,
  Calendar,
  X,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

interface Payment {
  id: string;
  paymentRef: string;
  date: string | null;
  amount: number | null;
  method: string | null;
  invoiceIds: string[];
  parentIds: string[];
  branchIds: string[];
  possibleDuplicate: boolean;
  paymentType: string | null;
}

interface Invoice {
  id: string;
  invoiceNo: string;
  amount: number | null;
  status: string | null;
  studentIds: string[];
  parentIds: string[];
  enrollmentIds: string[];
  dueDate?: string | null;
}

interface Enrollment {
  id: string;
  enrollmentId: string;
  status: string | null;
  studentIds: string[];
  branchIds: string[];
  tuitionPlanIds: string[];
}

interface Student {
  id: string;
  studentName: string;
}

interface Parent {
  id: string;
  parentName: string;
  studentIds: string[];
}

interface Branch {
  id: string;
  name: string;
}

interface User {
  id: string;
  fullName: string;
}

interface PaymentsClientProps {
  initialPayments: Payment[];
  invoices: Invoice[];
  enrollments: Enrollment[];
  students: Student[];
  parents: Parent[];
  branches: Branch[];
  users: User[];
  totalCount: number;
  currentPage: number;
  limit: number;
}

export function PaymentsClient({
  initialPayments,
  invoices,
  enrollments,
  students,
  parents,
  branches,
  users,
  totalCount,
  currentPage,
  limit,
}: PaymentsClientProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();

  // Auth & RBAC
  const userRole = useAppSelector(selectAuthRole);
  const normRole = (userRole || "").toLowerCase().trim();
  const isManager = ["owner", "office_admin", "office/admin", "office admin", "finance"].includes(normRole);

  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Search and filter states (Managed locally to prevent layout re-renders)
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get("search") || "");
  const [searchVal, setSearchVal] = useState(searchParams.get("search") || "");
  const [branchFilter, setBranchFilter] = useState(searchParams.get("branch") || "");
  const [typeFilter, setTypeFilter] = useState(searchParams.get("paymentType") || "");
  const [methodFilter, setMethodFilter] = useState(searchParams.get("paymentMethod") || "");
  const [dateFilter, setDateFilter] = useState(searchParams.get("date") || "");
  const [activePage, setActivePage] = useState(parseInt(searchParams.get("page") || "1", 10));

  const [isDataLoading, setIsDataLoading] = useState(false);

  // Debounce search input
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setSearchVal(debouncedSearch);
      setActivePage(1);
    }, 450);
    return () => clearTimeout(delayDebounce);
  }, [debouncedSearch]);

  // Handle local state queries fetch
  useEffect(() => {
    setIsDataLoading(true);
    dispatch(
      fetchPaymentsData({
        page: activePage,
        search: searchVal || undefined,
        branch: branchFilter || undefined,
        paymentType: typeFilter || undefined,
        paymentMethod: methodFilter || undefined,
        date: dateFilter || undefined,
      })
    )
      .finally(() => setIsDataLoading(false));

    // Update URL silently
    const params = new URLSearchParams();
    params.set("page", String(activePage));
    if (searchVal) params.set("search", searchVal);
    if (branchFilter) params.set("branch", branchFilter);
    if (typeFilter) params.set("paymentType", typeFilter);
    if (methodFilter) params.set("paymentMethod", methodFilter);
    if (dateFilter) params.set("date", dateFilter);

    window.history.pushState(null, "", `${pathname}?${params.toString()}`);
  }, [activePage, searchVal, branchFilter, typeFilter, methodFilter, dateFilter, dispatch, pathname]);

  // Payment Intake Modal states
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [step, setStep] = useState(1); // 1: Lookup, 2: Form, 3: Receipt

  // Search invoices state
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceSearchResults, setInvoiceSearchResults] = useState<any[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  // Form inputs state
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentTypeVal, setPaymentTypeVal] = useState("Tuition / Абонемент");
  const [isSaving, setIsSaving] = useState(false);

  // Duplicate Warning Alert states
  const [isDuplicateWarningOpen, setIsDuplicateWarningOpen] = useState(false);

  // Receipt screen states
  const [receiptNo, setReceiptNo] = useState("");
  const [receiptDetails, setReceiptDetails] = useState<any | null>(null);

  // Search invoices locally on input change
  useEffect(() => {
    if (!invoiceSearch.trim()) {
      setInvoiceSearchResults([]);
      return;
    }
    const delayDebounce = setTimeout(() => {
      setIsLoadingInvoices(true);
      fetch(`/api/payments?action=searchInvoices&q=${encodeURIComponent(invoiceSearch)}`)
        .then((res) => res.json())
        .then((data) => {
          setInvoiceSearchResults(Array.isArray(data) ? data : []);
        })
        .catch((err) => console.error("Error searching invoices:", err))
        .finally(() => setIsLoadingInvoices(false));
    }, 350);
    return () => clearTimeout(delayDebounce);
  }, [invoiceSearch]);

  const invoiceMap = invoices.reduce((acc, inv) => {
    acc[inv.id] = {
      invoiceNo: inv.invoiceNo,
      studentIds: inv.studentIds,
      enrollmentIds: inv.enrollmentIds,
      amount: inv.amount,
      dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString() : null,
      status: inv.status,
    };
    return acc;
  }, {} as Record<string, { invoiceNo: string; studentIds: string[]; enrollmentIds: string[]; amount: number | null; dueDate: string | null; status: string | null }>);

  const parentMap = parents.reduce((acc, p) => {
    acc[p.id] = { parentName: p.parentName, studentIds: p.studentIds };
    return acc;
  }, {} as Record<string, { parentName: string; studentIds: string[] }>);

  const studentMap = students.reduce((acc, s) => {
    acc[s.id] = { studentName: s.studentName };
    return acc;
  }, {} as Record<string, { studentName: string }>);

  const enrollmentMap = enrollments.reduce((acc, e) => {
    acc[e.id] = {
      enrollmentId: e.enrollmentId,
      status: e.status,
      branchIds: e.branchIds,
      tuitionPlanIds: e.tuitionPlanIds,
    };
    return acc;
  }, {} as Record<string, { enrollmentId: string; status: string | null; branchIds: string[]; tuitionPlanIds: string[] }>);

  const branchMap = branches.reduce((acc, b) => {
    acc[b.id] = { name: b.name };
    return acc;
  }, {} as Record<string, { name: string }>);

  const invoicesWithNames = invoices.map((inv) => ({
    id: inv.id,
    invoiceNo: inv.invoiceNo,
    amount: inv.amount,
    status: inv.status,
    studentName: inv.studentIds[0] ? studentMap[inv.studentIds[0]]?.studentName : undefined,
    parentName: inv.parentIds[0] ? parentMap[inv.parentIds[0]]?.parentName : undefined,
  }));

  const enrollmentsWithNames = enrollments.map((enr) => ({
    id: enr.id,
    enrollmentId: enr.enrollmentId,
    status: enr.status,
    studentName: enr.studentIds[0] ? studentMap[enr.studentIds[0]]?.studentName : undefined,
    courseName: "English Course",
    branchName: enr.branchIds[0] ? branchMap[enr.branchIds[0]]?.name : undefined,
  }));

  const handleSelectPayment = async (payment: Payment) => {
    setSelectedPayment(payment);
    setIsDrawerOpen(true);

    try {
      await fetch("/api/payments/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: payment.id,
          action: "VIEW_PAYMENT_DETAILS",
        }),
      });
    } catch (err) {
      console.error("Failed to audit view request:", err);
    }
  };

  const handleClearFilters = () => {
    setDebouncedSearch("");
    setSearchVal("");
    setBranchFilter("");
    setTypeFilter("");
    setMethodFilter("");
    setDateFilter("");
    setActivePage(1);
  };

  const handleSelectInvoice = (inv: any) => {
    setSelectedInvoice(inv);
    setPaymentAmount(String(inv.outstandingBalance || ""));
    setStep(2);
  };

  // Submit payment handler
  const handleIntakeSubmit = async (e: React.FormEvent, force: boolean = false) => {
    e.preventDefault();
    if (!paymentRef.trim()) {
      toast.error("Payment Reference is required.");
      return;
    }
    if (!paymentDate) {
      toast.error("Date is required.");
      return;
    }
    if (Number(paymentAmount) <= 0) {
      toast.error("Amount must be greater than zero.");
      return;
    }

    try {
      setIsSaving(true);
      const resultAction = await dispatch(
        createPaymentThunk({
          paymentRef,
          date: paymentDate,
          amount: Number(paymentAmount),
          method: paymentMethod,
          paymentType: paymentTypeVal,
          invoiceIds: [selectedInvoice.id],
          parentIds: selectedInvoice.parentIds,
          branchIds: selectedInvoice.branchIds,
          force,
        })
      );

      if (createPaymentThunk.fulfilled.match(resultAction)) {
        const createdPayment = resultAction.payload;
        toast.success("Payment recorded successfully!");
        setReceiptNo(createdPayment.paymentRef);
        setReceiptDetails({
          invoiceNo: selectedInvoice.invoiceNo,
          studentName: selectedInvoice.studentName,
          parentName: selectedInvoice.parentName,
          amount: Number(paymentAmount),
          method: paymentMethod,
          paymentType: paymentTypeVal,
          date: paymentDate,
          branchName: selectedInvoice.branchName,
        });
        setIsDuplicateWarningOpen(false);
        setStep(3);

        // Reload data list
        dispatch(
          fetchPaymentsData({
            page: activePage,
            search: searchVal || undefined,
            branch: branchFilter || undefined,
            paymentType: typeFilter || undefined,
            paymentMethod: methodFilter || undefined,
            date: dateFilter || undefined,
          })
        );
      } else {
        const payload = resultAction.payload as any;
        if (payload?.possibleDuplicate) {
          setIsDuplicateWarningOpen(true);
        } else {
          toast.error(payload || "Failed to record payment.");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadReceipt = () => {
    const content = `
=========================================
          HELEN DORON SCHOOL OS
             PAYMENT RECEIPT
=========================================
Receipt Number: ${receiptNo || "N/A"}
Date:           ${receiptDetails?.date || "N/A"}
Branch:         ${receiptDetails?.branchName || "N/A"}
-----------------------------------------
Student Name:   ${receiptDetails?.studentName || "N/A"}
Parent Name:    ${receiptDetails?.parentName || "N/A"}
-----------------------------------------
Invoice Number: ${receiptDetails?.invoiceNo || "N/A"}
Payment Amount: ${receiptDetails?.amount || "0"} KGS
Payment Method: ${receiptDetails?.method || "N/A"}
Payment Type:   ${receiptDetails?.paymentType || "N/A"}
=========================================
Thank you for your payment!
`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `receipt-${receiptNo || "payment"}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Receipt downloaded successfully!");
  };

  const totalPages = Math.ceil(totalCount / limit);
  const startRow = (currentPage - 1) * limit + 1;
  const endRow = Math.min(currentPage * limit, totalCount);

  const hasActiveFilters = !!searchVal || !!branchFilter || !!typeFilter || !!methodFilter || !!dateFilter;
  const paymentTypes = ["Tuition / Абонемент", "Play room / Игровая", "Masterclass / Мастер-класс", "Merchandise / Товары", "Other / Прочее"];
  const paymentMethods = ["Cash", "Card", "Bank Transfer"];

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Wallet className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-black text-foreground">Payments & Receipts</h2>
          </div>
          <p className="text-xs text-muted-foreground font-semibold">
            Track transactions, confirm reconciliation status, and preview audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {isManager && (
            <Button
              onClick={() => {
                setStep(1);
                setInvoiceSearch("");
                setInvoiceSearchResults([]);
                setSelectedInvoice(null);
                setPaymentRef("");
                setPaymentDate(new Date().toISOString().split("T")[0]);
                setPaymentAmount("");
                setPaymentMethod("Cash");
                setPaymentTypeVal("Tuition / Абонемент");
                setIsReceiveOpen(true);
              }}
              className="h-9 text-xs font-bold gap-1 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm cursor-pointer ml-auto"
            >
              <Plus className="h-4 w-4" />
              Receive Payment
            </Button>
          )}

          {/* Quick Search */}
          <div className="relative flex-1 sm:w-64 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={debouncedSearch}
              onChange={(e) => setDebouncedSearch(e.target.value)}
              placeholder="Search payment reference..."
              className="pl-9 h-9 text-xs rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Local Filter Bar */}
      <div className="flex flex-col xl:flex-row gap-4 items-center justify-between bg-card border border-border p-4 rounded-xl shadow-xs select-none">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground shrink-0">
          {isDataLoading ? (
            <Spinner className="h-4 w-4 text-primary" />
          ) : (
            <Filter className="h-4 w-4 text-primary" />
          )}
          <span>Filter transactions:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto">
          {/* Branch Filter */}
          <NativeSelect
            value={branchFilter}
            onChange={(e) => {
              setBranchFilter(e.target.value);
              setActivePage(1);
            }}
            className="w-full sm:w-32"
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </NativeSelect>

          {/* Type Filter */}
          <NativeSelect
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setActivePage(1);
            }}
            className="w-full sm:w-36"
          >
            <option value="">All Types</option>
            {paymentTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </NativeSelect>

          {/* Method Filter */}
          <NativeSelect
            value={methodFilter}
            onChange={(e) => {
              setMethodFilter(e.target.value);
              setActivePage(1);
            }}
            className="w-full sm:w-32"
          >
            <option value="">All Methods</option>
            {paymentMethods.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </NativeSelect>

          {/* Date Filter */}
          <div className="relative w-full sm:w-36">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setActivePage(1);
              }}
              className="h-8 w-full appearance-none rounded-lg border border-input bg-transparent py-1 pr-2.5 pl-8 text-[11px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring dark:bg-input/30"
            />
            <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button
              onClick={handleClearFilters}
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 px-2 cursor-pointer font-semibold"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Main Table Card (Desktop) */}
      <div className="hidden lg:block">
        <PaymentTable
          payments={initialPayments}
          invoiceMap={invoiceMap}
          parentMap={parentMap}
          studentMap={studentMap}
          enrollmentMap={enrollmentMap}
          branchMap={branchMap}
          selectedPaymentId={selectedPayment?.id}
          onSelectPayment={handleSelectPayment}
          isLoading={isDataLoading}
        />
      </div>

      {/* Main Cards Layout (Mobile) */}
      <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
        {isDataLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <PaymentCardSkeleton key={i} />
          ))
        ) : initialPayments.length === 0 ? (
          <p className="col-span-full text-center py-6 text-xs text-muted-foreground italic bg-card border border-dashed rounded-xl">
            No payments found matching the selected search or filter criteria.
          </p>
        ) : (
          initialPayments.map((p) => (
            <PaymentCard
              key={p.id}
              payment={p}
              invoiceMap={invoiceMap}
              parentMap={parentMap}
              studentMap={studentMap}
              enrollmentMap={enrollmentMap}
              isSelected={p.id === selectedPayment?.id}
              onSelect={() => handleSelectPayment(p)}
            />
          ))
        )}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card border border-border/60 p-4 rounded-xl shadow-xs select-none">
          <p className="text-xs text-muted-foreground font-medium">
            Showing <span className="font-extrabold text-foreground">{startRow}</span> to{" "}
            <span className="font-extrabold text-foreground">{endRow}</span> of{" "}
            <span className="font-extrabold text-foreground">{totalCount}</span> transactions
          </p>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => activePage > 1 && setActivePage(activePage - 1)}
              disabled={activePage === 1}
              variant="outline"
              size="icon-sm"
              className="rounded-lg cursor-pointer border-border hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-bold text-muted-foreground px-2">
              Page {activePage} of {totalPages}
            </span>
            <Button
              onClick={() => activePage < totalPages && setActivePage(activePage + 1)}
              disabled={activePage === totalPages}
              variant="outline"
              size="icon-sm"
              className="rounded-lg cursor-pointer border-border hover:bg-muted"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Payment Drawer details panel */}
      {selectedPayment && (
        <PaymentDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          payment={selectedPayment}
          invoiceMap={invoiceMap}
          parentMap={parentMap}
          studentMap={studentMap}
          enrollmentMap={enrollmentMap}
          branchMap={branchMap}
          invoices={invoicesWithNames}
          enrollments={enrollmentsWithNames}
        />
      )}

      {/* Receive Payment Dialog Modal */}
      <Dialog open={isReceiveOpen} onOpenChange={(open) => !open && setIsReceiveOpen(false)}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              {step === 1 && "Step 1: Invoice Lookup"}
              {step === 2 && "Step 2: Payment Details"}
              {step === 3 && "Step 3: Receipt Confirmation"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {step === 1 && "Search and select the invoice you are receiving a payment for."}
              {step === 2 && "Record payment parameters against selected invoice."}
              {step === 3 && "Review confirmed payment receipt details."}
            </DialogDescription>
          </DialogHeader>

          {/* STEP 1: Invoice Lookup */}
          {step === 1 && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5 relative">
                <Label className="text-xs font-semibold text-muted-foreground">Invoice Search</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={invoiceSearch}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                    placeholder="Search by Invoice No, Student Name, Parent Name..."
                    className="pl-9 h-9 text-xs rounded-lg"
                  />
                </div>
              </div>

              {isLoadingInvoices ? (
                <div className="border border-border/60 rounded-lg divide-y divide-border/40 overflow-hidden">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-3 space-y-2">
                      {/* Invoice No + Amount row */}
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-3.5 w-28 rounded" />
                        <Skeleton className="h-3.5 w-20 rounded" />
                      </div>
                      {/* Student + Branch row */}
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-2.5 w-36 rounded" />
                        <Skeleton className="h-2.5 w-24 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : invoiceSearchResults.length > 0 ? (
                <div className="max-h-48 overflow-y-auto border border-border/60 rounded-lg divide-y divide-border/40 scrollbar-thin">
                  {invoiceSearchResults.map((inv) => (
                    <div
                      key={inv.id}
                      onClick={() => handleSelectInvoice(inv)}
                      className="p-3 hover:bg-muted/30 cursor-pointer transition-colors text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-bold text-foreground">
                        <span>Invoice #{inv.invoiceNo}</span>
                        <span className="text-primary font-mono">{inv.outstandingBalance.toLocaleString()} KGS</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground flex items-center justify-between font-semibold">
                        <span>Student: {inv.studentName}</span>
                        <span>Branch: {inv.branchName}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : invoiceSearch.trim() ? (
                <p className="text-center py-6 text-xs text-muted-foreground italic">No matching invoices found.</p>
              ) : null}
            </div>
          )}

          {/* STEP 2: Payment Form */}
          {step === 2 && selectedInvoice && (
            <form onSubmit={(e) => handleIntakeSubmit(e, false)} className="space-y-4 py-2">
              {/* Auto-populated Invoice Metadata */}
              <div className="p-3 rounded-lg border border-border/40 bg-muted/10 grid grid-cols-2 gap-3 text-xs">
                <div className="col-span-2 flex items-center justify-between font-bold">
                  <span className="text-muted-foreground">Invoice Selected:</span>
                  <span className="text-foreground">#{selectedInvoice.invoiceNo}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Student:</span>
                  <span className="font-semibold text-foreground">{selectedInvoice.studentName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Parent:</span>
                  <span className="font-semibold text-foreground">{selectedInvoice.parentName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Branch:</span>
                  <span className="font-semibold text-foreground">{selectedInvoice.branchName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Outstanding Balance:</span>
                  <span className="font-bold text-primary font-mono">{selectedInvoice.outstandingBalance.toLocaleString()} KGS</span>
                </div>
              </div>

              {/* Editable Fields */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Payment Reference (Ref No) *</Label>
                <Input
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="e.g. TXN-10045"
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Date *</Label>
                  <Input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Amount (KGS) *</Label>
                  <Input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Amount"
                    required
                    min="0.01"
                    step="0.01"
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Method *</Label>
                  <NativeSelect
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    size="sm"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Card">Card</option>
                  </NativeSelect>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Payment Type *</Label>
                  <NativeSelect
                    value={paymentTypeVal}
                    onChange={(e) => setPaymentTypeVal(e.target.value)}
                    size="sm"
                  >
                    <option value="Tuition / Абонемент">Tuition / Абонемент</option>
                    <option value="Play room / Игровая">Play room / Игровая</option>
                    <option value="Masterclass / Мастер-класс">Masterclass / Мастер-класс</option>
                    <option value="Merchandise / Товары">Merchandise / Товары</option>
                    <option value="Other / Прочее">Other / Прочее</option>
                  </NativeSelect>
                </div>
              </div>

              <DialogFooter className="border-t border-border pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="text-xs cursor-pointer"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="text-xs cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground font-bold flex items-center gap-1.5"
                >
                  {isSaving && <Spinner className="size-3 text-primary-foreground" />}
                  {isSaving ? "Processing..." : "Create Payment"}
                </Button>
              </DialogFooter>
            </form>
          )}

          {/* STEP 3: Receipt Screen */}
          {step === 3 && receiptDetails && (
            <div className="space-y-4 py-2">
              <div className="flex flex-col items-center justify-center text-center space-y-2 py-4">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 animate-bounce" />
                <h3 className="text-sm font-extrabold text-foreground">Payment Processed Successfully</h3>
                <span className="text-[10px] text-muted-foreground/60 font-mono">ID: {receiptNo}</span>
              </div>

              <div className="p-3 border border-border bg-muted/10 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground font-semibold">Receipt Number:</span>
                  <span className="font-bold text-foreground font-mono">{receiptNo}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground font-semibold">Invoice Ref:</span>
                  <span className="font-bold text-foreground">#{receiptDetails.invoiceNo}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground font-semibold">Student Name:</span>
                  <span className="font-bold text-foreground">{receiptDetails.studentName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground font-semibold">Parent Name:</span>
                  <span className="font-bold text-foreground">{receiptDetails.parentName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground font-semibold">Branch:</span>
                  <span className="font-bold text-foreground">{receiptDetails.branchName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground font-semibold">Date Received:</span>
                  <span className="font-bold text-foreground font-mono">{receiptDetails.date}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground font-semibold">Payment Type:</span>
                  <span className="font-bold text-foreground">{receiptDetails.paymentType}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground font-semibold">Method:</span>
                  <span className="font-bold text-foreground">{receiptDetails.method}</span>
                </div>
                <div className="flex justify-between py-1 font-bold text-primary text-sm pt-2">
                  <span>Amount Paid:</span>
                  <span className="font-mono">{receiptDetails.amount.toLocaleString()} KGS</span>
                </div>
              </div>

              <DialogFooter className="border-t border-border pt-3 gap-2">
                <Button
                  onClick={handleDownloadReceipt}
                  className="text-xs bg-slate-700 hover:bg-slate-800 text-white font-bold cursor-pointer"
                >
                  Download Receipt
                </Button>
                <Button
                  onClick={() => setIsReceiveOpen(false)}
                  className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-bold cursor-pointer"
                >
                  Done
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Duplicate Payment Warning Dialog */}
      <Dialog open={isDuplicateWarningOpen} onOpenChange={setIsDuplicateWarningOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader className="flex flex-col items-center text-center space-y-2">
            <div className="h-10 w-10 bg-amber-500/10 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <DialogTitle className="text-sm font-extrabold text-foreground">
              Possible Duplicate Payment
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              A payment already exists with the same:<br />
              • <strong>Payment Reference</strong>: {paymentRef}<br />
              • <strong>Date</strong>: {paymentDate}<br />
              • <strong>Amount</strong>: {paymentAmount} KGS<br /><br />
              Do you want to continue recording this payment anyway?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="grid grid-cols-2 gap-3 pt-3 border-t border-border/40">
            <Button
              variant="outline"
              onClick={() => setIsDuplicateWarningOpen(false)}
              className="text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={(e) => handleIntakeSubmit(e, true)}
              className="text-xs bg-amber-500 hover:bg-amber-600 text-white font-bold cursor-pointer"
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
