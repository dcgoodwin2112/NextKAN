import { notFound } from "next/navigation";
import {
  getOrganization,
  updateOrganization,
  deleteOrganization,
  listOrganizations,
} from "@/lib/actions/organizations";
import { OrganizationForm } from "@/components/organizations/OrganizationForm";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { OrgDeleteButton } from "./OrgDeleteButton";
import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditOrganizationPage({ params }: Props) {
  const { id } = await params;
  const [organization, organizations] = await Promise.all([
    getOrganization(id),
    listOrganizations(),
  ]);

  if (!organization) notFound();

  async function handleUpdate(data: {
    name: string;
    description?: string;
    imageUrl?: string;
    parentId?: string;
  }) {
    "use server";
    await updateOrganization(id, data);
  }

  async function handleDelete() {
    "use server";
    await deleteOrganization(id);
    redirect("/admin/organizations");
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Organizations", href: "/admin/organizations" },
          { label: "Edit Organization" },
        ]}
      />
      <AdminPageHeader title="Edit Organization">
        <OrgDeleteButton onDelete={handleDelete} />
      </AdminPageHeader>
      <OrganizationForm
        initialData={organization}
        organizations={organizations}
        onSubmit={handleUpdate}
      />
    </div>
  );
}
