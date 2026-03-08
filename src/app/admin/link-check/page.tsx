import { requirePermission } from "@/lib/auth/check-permission";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { LinkCheckClient } from "./LinkCheckClient";

export default async function LinkCheckPage() {
  await requirePermission("admin:access");

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Link Checker" },
        ]}
      />
      <AdminPageHeader
        title="Resource Link Checker"
        description="Verify that distribution download and access URLs are reachable."
      />
      <LinkCheckClient />
    </div>
  );
}
