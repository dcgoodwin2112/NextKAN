import { redirect } from "next/navigation";
import { createCustomFieldDefinition } from "@/lib/actions/custom-fields";
import { listOrganizations } from "@/lib/actions/organizations";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { CustomFieldForm } from "@/components/admin/CustomFieldForm";

export default async function NewCustomFieldPage() {
  const organizations = await listOrganizations();

  async function handleCreate(data: {
    name: string;
    label: string;
    type: string;
    required: boolean;
    options?: string[];
    sortOrder: number;
    organizationId?: string;
  }) {
    "use server";
    await createCustomFieldDefinition(data as any);
    redirect("/admin/custom-fields");
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Custom Fields", href: "/admin/custom-fields" },
          { label: "New Custom Field" },
        ]}
      />
      <AdminPageHeader title="New Custom Field" />
      <CustomFieldForm organizations={organizations} onSubmit={handleCreate} />
    </div>
  );
}
