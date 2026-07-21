import { validateSession } from "@/lib/auth";
import { ScheduleClient } from "@/components/dashboard/schedule/ScheduleClient";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const session = await validateSession();
  const userRole = session?.role || "staff";

  return <ScheduleClient userRole={userRole} />;
}