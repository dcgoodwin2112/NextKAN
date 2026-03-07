import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/roles";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { ApiTokenSection } from "@/components/admin/ApiTokenSection";

export default async function AccountPage() {
  const session = await auth();
  const role = (session?.user as any)?.role as string;

  if (!hasPermission(role, "admin:access")) {
    redirect("/admin");
  }

  const userId = (session?.user as any)?.id as string;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Account" },
        ]}
      />
      <AdminPageHeader title="My Account" />
      <ApiTokenSection userId={userId} />
    </div>
  );
}
