import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { apiFetch } from "@/lib/apiFetch";
import { PaymentsClient } from "@/components/dashboard/payments/PaymentsClient";
import { ShieldAlert } from "lucide-react";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface SearchParams {
  page?: string;
  search?: string;
  branch?: string;
  paymentType?: string;
  paymentMethod?: string;
  date?: string;
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await validateSession();
  if (!session) {
    redirect("/login");
  }

  // Fetch dbUser to inspect actual user role
  const dbUser = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (!dbUser) {
    redirect("/login");
  }

  const userRole = (dbUser.role || "").toLowerCase().trim();
  const allowedRoles = ["owner", "office_admin", "office/admin", "office-admin", "finance"];

  if (!allowedRoles.includes(userRole)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center select-none">
        <div className="h-12 w-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-3">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h3 className="text-base font-extrabold text-rose-600">Access Restricted</h3>
        <p className="text-xs text-muted-foreground mt-1.5 max-w-sm leading-normal font-medium">
          Your account role ({dbUser.role || "unknown"}) is unauthorized to view payments or receipts ledger records. Please contact administration.
        </p>
      </div>
    );
  }

  // 1. Await search params Promise
  const params = await searchParams;
  const currentPage = params.page || "1";
  const search = params.search || "";
  const branch = params.branch || "";
  const paymentType = params.paymentType || "";
  const paymentMethod = params.paymentMethod || "";
  const date = params.date || "";

  // 2. Build payment API URL with query filters
  let paymentUrl = `/api/data/payment?page=${currentPage}&limit=20`;
  if (search) paymentUrl += `&search=${encodeURIComponent(search)}`;
  if (branch) paymentUrl += `&branch=${encodeURIComponent(branch)}`;
  if (paymentType) paymentUrl += `&paymentType=${encodeURIComponent(paymentType)}`;
  if (paymentMethod) paymentUrl += `&paymentMethod=${encodeURIComponent(paymentMethod)}`;
  if (date) paymentUrl += `&date=${encodeURIComponent(date)}`;

  // 3. Parallel fetching of related data
  const [
    paymentsRes,
    invoices,
    enrollments,
    students,
    parents,
    branches,
    users,
  ] = await Promise.all([
    apiFetch(paymentUrl),
    apiFetch("/api/data/invoice"),
    apiFetch("/api/data/enrollment"),
    apiFetch("/api/data/student"),
    apiFetch("/api/data/parent"),
    apiFetch("/api/data/branch"),
    apiFetch("/api/data/user"),
  ]);

  const initialPayments = paymentsRes.data || [];
  const totalCount = paymentsRes.pagination?.total || 0;
  const limit = paymentsRes.pagination?.limit || 20;

  return (
    <div className="p-6">
      <PaymentsClient
        initialPayments={initialPayments}
        invoices={invoices || []}
        enrollments={enrollments || []}
        students={students || []}
        parents={parents || []}
        branches={branches || []}
        users={users || []}
        totalCount={totalCount}
        currentPage={parseInt(currentPage, 10)}
        limit={limit}
      />
    </div>
  );
}
