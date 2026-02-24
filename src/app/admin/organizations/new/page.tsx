import { createOrganization, listOrganizations } from "@/lib/actions/organizations";
import { OrganizationForm } from "@/components/organizations/OrganizationForm";

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
      <h1 className="text-2xl font-bold mb-6">New Organization</h1>
      <OrganizationForm organizations={organizations} onSubmit={handleCreate} />
    </div>
  );
}
