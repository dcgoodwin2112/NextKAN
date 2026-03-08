import { notFound, redirect } from "next/navigation";
import { getLicense, updateLicense, deleteLicense } from "@/lib/actions/licenses";
import { LicenseForm } from "@/components/admin/LicenseForm";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { LicenseDeleteButton } from "../../LicenseDeleteButton";
import type { LicenseCreateInput } from "@/lib/schemas/license";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditLicensePage({ params }: Props) {
  const { id } = await params;
  const license = await getLicense(id);

  if (!license) notFound();

  async function handleUpdate(data: LicenseCreateInput) {
    "use server";
    await updateLicense(id, data);
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Licenses", href: "/admin/licenses" },
          { label: "Edit License" },
        ]}
      />
      <AdminPageHeader title="Edit License">
        <LicenseDeleteButton licenseId={license.id} />
      </AdminPageHeader>
      <LicenseForm initialData={license} onSubmit={handleUpdate} />
    </div>
  );
}
