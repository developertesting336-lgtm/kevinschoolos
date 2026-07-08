import Link from "next/link";
import { validateSession } from "@/lib/auth";
import { apiFetch } from "@/lib/apiFetch";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Receipt, ArrowLeft, ShieldAlert, FileText, CreditCard, AlertCircle } from "lucide-react";

interface InvoiceData {
  id: string;
  invoiceNo: string;
  issueDate: string | null;
  dueDate: string | null;
  amount: number | null;
  status: string | null;
  branchIds: string[];
}

interface PaymentData {
  id: string;
  paymentRef: string;
  date: string | null;
  amount: number | null;
  method: string | null;
  branchIds: string[];
  possibleDuplicate: boolean;
  paymentType: string | null;
}

interface BranchData {
  id: string;
  name: string;
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await validateSession();
  const { tab } = await searchParams;
  const activeTab = tab || "invoices";

  let invoicesList: InvoiceData[] = [];
  let paymentsList: PaymentData[] = [];
  let branchesList: BranchData[] = [];
  let errorMsg = null;
  let isForbidden = false;

  try {
    // We always fetch branches for mapping
    branchesList = await apiFetch("/api/data/branch").catch((e) => {
      console.error("Could not fetch branches", e);
      return [];
    });

    if (activeTab === "invoices") {
      invoicesList = await apiFetch("/api/data/invoice");
    } else {
      paymentsList = await apiFetch("/api/data/payment");
    }
  } catch (error: any) {
    console.error(`[Dashboard Billing Fetch Error] Tab: ${activeTab}`, error);
    errorMsg = error.message || `Failed to load ${activeTab} data.`;
    if (error.message?.includes("403") || error.message?.includes("Forbidden")) {
      isForbidden = true;
    }
  }

  const branchIdToNameMap = new Map(branchesList.map((b) => [b.id, b.name]));

  // Handle unauthorized or RBAC restricted views
  if (isForbidden) {
    return (
      <div className="space-y-8 select-none animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
              <Link href="/dashboard" className="hover:text-foreground transition-colors">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-foreground font-medium">Billing</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
              <Receipt className="h-8 w-8 text-primary" />
              Billing
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Financial bookkeeping, client invoices, and payment receipts
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg border border-border bg-card text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back Overview
          </Link>
        </div>

        {/* Tab Selection Row */}
        <div className="flex border-b border-border">
          <Link
            href="/dashboard/billing?tab=invoices"
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "invoices"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="h-4 w-4" />
            Invoices
          </Link>
          <Link
            href="/dashboard/billing?tab=payments"
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "payments"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            Payments Log
          </Link>
        </div>

        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center px-4">
          <Card className="max-w-md w-full border-destructive/30 bg-destructive/5 shadow-lg shadow-destructive/5">
            <CardHeader className="flex flex-col items-center pb-2">
              <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-2">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl font-bold text-destructive">
                Access Restricted
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Insufficient Permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your role <span className="font-semibold text-foreground capitalize">({session?.role || "Staff"})</span> does not have access to view {activeTab === "invoices" ? "billing invoices" : "payment transactions"}.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 select-none animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
            <Link href="/dashboard" className="hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Billing</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <Receipt className="h-8 w-8 text-primary" />
            Billing
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Financial bookkeeping, client invoices, and payment receipts
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg border border-border bg-card text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back Overview
        </Link>
      </div>

      {/* Tab Selection Row */}
      <div className="flex border-b border-border">
        <Link
          href="/dashboard/billing?tab=invoices"
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "invoices"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-4 w-4" />
          Invoices
        </Link>
        <Link
          href="/dashboard/billing?tab=payments"
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "payments"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <CreditCard className="h-4 w-4" />
          Payments Log
        </Link>
      </div>

      {errorMsg ? (
        <Card className="border-destructive/20 bg-destructive/5 text-destructive p-4 text-sm font-medium">
          {errorMsg}
        </Card>
      ) : activeTab === "invoices" ? (
        /* Invoices Table */
        <Card className="bg-card border-border shadow-md overflow-hidden">
          <CardHeader className="border-b border-border py-4 px-6 bg-muted/10">
            <CardTitle className="text-sm font-bold text-foreground">
              ALL INVOICES ({invoicesList.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-muted/20 border-b border-border">
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Invoice No</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Issue Date</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Due Date</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase text-right">Amount</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Status</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Branches</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border">
                {invoicesList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                      No invoices found.
                    </TableCell>
                  </TableRow>
                ) : (
                  invoicesList.map((invoice) => {
                    const branchNames = invoice.branchIds
                      ?.map((id) => branchIdToNameMap.get(id) || id)
                      .join(", ") || "—";

                    return (
                      <TableRow key={invoice.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="px-6 py-4 text-sm font-semibold text-foreground font-mono">
                          {invoice.invoiceNo}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                          {invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                          {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-foreground font-semibold text-right font-mono">
                          {invoice.amount !== null ? `$${invoice.amount.toFixed(2)}` : "—"}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm">
                          <Badge
                            variant="outline"
                            className={
                              invoice.status?.toLowerCase() === "paid"
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 font-medium capitalize"
                                : invoice.status?.toLowerCase() === "unpaid" || invoice.status?.toLowerCase() === "overdue"
                                ? "bg-destructive/10 border-destructive/20 text-destructive font-medium capitalize"
                                : "bg-muted text-muted-foreground border-border font-medium capitalize"
                            }
                          >
                            {invoice.status || "Unpaid"}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate" title={branchNames}>
                          {branchNames}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        /* Payments Table */
        <Card className="bg-card border-border shadow-md overflow-hidden">
          <CardHeader className="border-b border-border py-4 px-6 bg-muted/10">
            <CardTitle className="text-sm font-bold text-foreground">
              ALL TRANSACTIONS ({paymentsList.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-muted/20 border-b border-border">
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Payment Ref</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Date</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase text-right">Amount</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Method</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Type</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-muted-foreground uppercase">Branches</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border">
                {paymentsList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                      No payment transactions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paymentsList.map((payment) => {
                    const branchNames = payment.branchIds
                      ?.map((id) => branchIdToNameMap.get(id) || id)
                      .join(", ") || "—";

                    return (
                      <TableRow key={payment.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="px-6 py-4 text-sm font-semibold text-foreground font-mono">
                          <div className="flex items-center gap-2">
                            {payment.paymentRef}
                            {payment.possibleDuplicate && (
                              <Badge
                                variant="outline"
                                className="bg-amber-500/10 border-amber-500/20 text-amber-600 flex items-center gap-1 text-[10px] py-0 px-1.5"
                                title="Possible Duplicate Flagged"
                              >
                                <AlertCircle className="h-2.5 w-2.5" />
                                Duplicate?
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                          {payment.date ? new Date(payment.date).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-emerald-600 font-semibold text-right font-mono">
                          {payment.amount !== null ? `$${payment.amount.toFixed(2)}` : "—"}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-muted-foreground capitalize">
                          {payment.method || "—"}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-muted-foreground capitalize">
                          {payment.paymentType || "—"}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate" title={branchNames}>
                          {branchNames}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
