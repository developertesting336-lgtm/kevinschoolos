import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { normalizeRole } from "@/lib/roles";
import { ShieldAlert } from "lucide-react";
import { redirect } from "next/navigation";
import { SchemaDiagnosticsClient } from "../../../../components/dashboard/admin/schema-diagnostics/SchemaDiagnosticsClient";

export const dynamic = "force-dynamic";

export default async function SchemaDiagnosticsPage() {
  const session = await validateSession();
  if (!session) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, fullName: true, email: true, role: true },
  });

  if (!dbUser) {
    redirect("/login");
  }

  const userRole = normalizeRole(dbUser.role || "staff");

  // RBAC protection check: only Owner and Tech Admin allowed.
  if (userRole !== "owner" && userRole !== "tech_admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center select-none animate-in fade-in duration-300">
        <div className="h-14 w-14 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4 shadow-lg shadow-rose-500/5">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-extrabold text-rose-600 tracking-tight">Access Restricted</h3>
        <p className="text-xs text-muted-foreground mt-2 max-w-sm leading-relaxed font-medium">
          Your account role ({dbUser.role || "unknown"}) is unauthorized to view system schema or diagnostics interfaces.
        </p>
      </div>
    );
  }

  return (
    <SchemaDiagnosticsClient
      userRole={userRole}
      userName={dbUser.fullName}
    />
  );
}
