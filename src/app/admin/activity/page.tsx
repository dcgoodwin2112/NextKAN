import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/auth/roles";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ActivityTable } from "@/components/admin/ActivityTable";

export default async function ActivityLogPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;

  if (!session?.user || !hasPermission(role, "admin:access")) {
    redirect("/login");
  }

  return (
    <div>
      <AdminPageHeader
        title="Activity Log"
        description="View all system activity"
      />
      <ActivityTable />
    </div>
  );
}
