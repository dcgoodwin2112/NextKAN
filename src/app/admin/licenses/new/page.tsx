import { createLicense } from "@/lib/actions/licenses";
import { LicenseForm } from "@/components/admin/LicenseForm";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import type { LicenseCreateInput } from "@/lib/schemas/license";

export default function NewLicensePage() {
  async function handleCreate(data: LicenseCreateInput) {
    "use server";
    await createLicense(data);
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Licenses", href: "/admin/licenses" },
          { label: "New License" },
        ]}
      />
      <AdminPageHeader title="New License" />
      <LicenseForm onSubmit={handleCreate} />
    </div>
  );
}
