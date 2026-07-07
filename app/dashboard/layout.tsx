import { redirect } from "next/navigation";
import { validateSession } from "@/lib/auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import prisma from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await validateSession();

  if (!session) {
    redirect("/login");
  }

  // Fetch the logged-in staff details from Postgres
  const dbUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { fullName: true, email: true },
  });

  const userProp = {
    name: dbUser?.fullName || "Active Staff",
    email: dbUser?.email || "staff@school.os",
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans">
        {/* Render AppSidebar */}
        <AppSidebar user={userProp} />

        {/* Dashboard Content Container */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Header Bar */}
          <header className="h-14 border-b border-border bg-card flex items-center px-4 justify-between shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-8 w-8 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer" />
              <div className="h-4 w-px bg-border group-data-[collapsible=icon]:hidden" />
              <span className="font-semibold text-sm tracking-tight text-foreground select-none">
                Dashboard Overview
              </span>
            </div>
          </header>

          {/* Main Scrollable Area */}
          <main className="flex-1 overflow-y-auto bg-background px-6 py-6 min-w-0">
            <div className="max-w-7xl mx-auto w-full">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
