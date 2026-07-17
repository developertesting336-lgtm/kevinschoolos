import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { normalizeRole } from "@/lib/roles";
import { ShieldAlert } from "lucide-react";
import { redirect } from "next/navigation";
import { NotificationsCenterClient } from "../../../components/dashboard/notifications/NotificationsCenterClient";

export const dynamic = "force-dynamic";

export default async function NotificationsCenterPage() {
  const session = await validateSession();
  if (!session) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, fullName: true, email: true, role: true, branchIds: true },
  });

  if (!dbUser) {
    redirect("/login");
  }

  const userRole = normalizeRole(dbUser.role || "staff");

  // RBAC Gate: Only Owner and Office Admin roles may access the Notifications Center.
  if (userRole !== "owner" && userRole !== "office_admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center select-none animate-in fade-in duration-300">
        <div className="h-14 w-14 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4 shadow-lg shadow-rose-500/5">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-extrabold text-rose-600 tracking-tight">Access Restricted</h3>
        <p className="text-xs text-muted-foreground mt-2 max-w-sm leading-relaxed font-medium">
          Your account role ({dbUser.role || "unknown"}) is unauthorized to view the Notifications Center. If you require access, please contact the system owner.
        </p>
      </div>
    );
  }

  // Fetch branches based on role scoping for the filter selector
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
    console.error("[Notifications Page Fetch Branches Error]", error);
  }

  return (
    <NotificationsCenterClient
      initialBranches={branches}
      userRole={userRole}
      userName={dbUser.fullName}
    />
  );
}
