import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/roles";
import { getSettings } from "@/lib/actions/settings";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SettingsForm } from "./SettingsForm";

export default async function AdminSettingsPage() {
  const session = await auth();
  const role = (session?.user as any)?.role as string;

  if (!hasPermission(role, "user:manage")) {
    redirect("/admin");
  }

  const settings = await getSettings();

  return (
    <div>
      <AdminPageHeader title="Settings" />
      <SettingsForm initialSettings={settings} />
    </div>
  );
}
