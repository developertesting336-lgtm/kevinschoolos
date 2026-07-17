import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { normalizeRole } from "@/lib/roles";
import { ShieldAlert } from "lucide-react";
import { redirect } from "next/navigation";
import { FinanceConsoleClient } from "../../../components/dashboard/finance/FinanceConsoleClient";

export const dynamic = "force-dynamic";

export default async function FinanceConsolePage() {
  const session = await validateSession();
  if (!session) {
    redirect("/login");
  }

  // Fetch user from DB to check role and branch permissions
  const dbUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, fullName: true, email: true, role: true, branchIds: true },
  });

  if (!dbUser) {
    redirect("/login");
  }

  const userRole = normalizeRole(dbUser.role || "staff");

  // Step 3 - RBAC: Only Finance and Owner roles may access the Finance Console.
  if (userRole !== "finance" && userRole !== "owner") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center select-none animate-in fade-in duration-300">
        <div className="h-14 w-14 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4 shadow-lg shadow-rose-500/5">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-extrabold text-rose-600 tracking-tight">Access Denied</h3>
        <p className="text-xs text-muted-foreground mt-2 max-w-sm leading-relaxed font-medium">
          Your account role ({dbUser.role || "unknown"}) is unauthorized to access the Finance Console workspace. If you require access, please contact the system owner.
        </p>
      </div>
    );
  }

  // Step 5 - Fetch branches list for selector based on role permissions
  let branches: any[] = [];
  try {
    if (userRole === "owner") {
      branches = await prisma.branch.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
    } else {
      const allowedBranchIds = dbUser.branchIds || [];
      branches = await prisma.branch.findMany({
        where: { id: { in: allowedBranchIds } },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
    }
  } catch (error) {
    console.error("[Finance Console Page Fetch Error]", error);
  }

  return (
    <FinanceConsoleClient
      initialBranches={branches}
      userRole={userRole}
      userName={dbUser.fullName}
      userEmail={dbUser.email}
    />
  );
}
