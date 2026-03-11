import { createOrganization, listOrganizations } from "@/lib/actions/organizations";
import { OrganizationForm } from "@/components/organizations/OrganizationForm";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";

export default async function NewOrganizationPage() {
  const organizations = await listOrganizations();

  async function handleCreate(data: {
    name: string;
    description?: string;
    imageUrl?: string;
    parentId?: string;
  }) {
    "use server";
    await createOrganization(data);
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Organizations", href: "/admin/organizations" },
          { label: "New" },
        ]}
      />
      <AdminPageHeader title="New Organization" />
      <OrganizationForm organizations={organizations} onSubmit={handleCreate} />
    </div>
  );
}
