import { notFound, redirect } from "next/navigation";
import { getCustomFieldDefinition, updateCustomFieldDefinition } from "@/lib/actions/custom-fields";
import { listOrganizations } from "@/lib/actions/organizations";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { CustomFieldForm } from "@/components/admin/CustomFieldForm";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditCustomFieldPage({ params }: Props) {
  const { id } = await params;
  const [definition, organizations] = await Promise.all([
    getCustomFieldDefinition(id),
    listOrganizations(),
  ]);

  if (!definition) notFound();

  async function handleUpdate(data: {
    name: string;
    label: string;
    type: string;
    required: boolean;
    options?: string[];
    sortOrder: number;
    organizationId?: string;
  }) {
    "use server";
    await updateCustomFieldDefinition(id, data as any);
    redirect("/admin/custom-fields");
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Custom Fields", href: "/admin/custom-fields" },
          { label: `Edit: ${definition.label}` },
        ]}
      />
      <AdminPageHeader title={`Edit: ${definition.label}`} />
      <CustomFieldForm
        initialData={definition}
        organizations={organizations}
        onSubmit={handleUpdate}
      />
    </div>
  );
}
