"use client";

import { useState } from "react";
import { SearchBar } from "./SearchBar";
import { Filters } from "./Filters";
import { PaymentTable } from "./PaymentTable";
import { PaymentCard } from "./PaymentCard";
import { PaymentDrawer } from "./PaymentDrawer";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Wallet, HelpCircle, Users } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // 1. Build lookup dictionaries
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

  // Lookups helper lists for disabled intake form selectors
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
    courseName: "English Course", // Placeholder for courses
    branchName: enr.branchIds[0] ? branchMap[enr.branchIds[0]]?.name : undefined,
  }));

  const handleSelectPayment = async (payment: Payment) => {
    setSelectedPayment(payment);
    setIsDrawerOpen(true);

    // POST PII-free access event to audit log endpoint
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

  // Pagination handler
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const totalPages = Math.ceil(totalCount / limit);
  const startRow = (currentPage - 1) * limit + 1;
  const endRow = Math.min(currentPage * limit, totalCount);

  return (
    <div className="space-y-6">
      
      {/* Header and Search control */}
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
        <SearchBar />
      </div>

      {/* Filters bar */}
      <Filters branches={branches.map((b) => ({ id: b.id, name: b.name }))} />

      {/* Main List Layout: Table for Desktop, Cards for Mobile */}
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
        />
      </div>

      <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
        {initialPayments.length === 0 ? (
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
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(currentPage - 1)}
              variant="outline"
              size="sm"
              className="h-8 text-xs font-semibold px-2.5 inline-flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </Button>
            <Button
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              variant="outline"
              size="sm"
              className="h-8 text-xs font-semibold px-2.5 inline-flex items-center gap-1 cursor-pointer"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Slide-out details drawer */}
      <PaymentDrawer
        payment={selectedPayment}
        isOpen={isDrawerOpen}
        onClose={() => {
          setSelectedPayment(null);
          setIsDrawerOpen(false);
        }}
        invoices={invoicesWithNames}
        enrollments={enrollmentsWithNames}
        invoiceMap={invoiceMap}
        parentMap={parentMap}
        studentMap={studentMap}
        enrollmentMap={enrollmentMap}
        branchMap={branchMap}
      />
    </div>
  );
}
