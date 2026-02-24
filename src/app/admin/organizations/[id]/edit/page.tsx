import { notFound } from "next/navigation";
import {
  getOrganization,
  updateOrganization,
  deleteOrganization,
  listOrganizations,
} from "@/lib/actions/organizations";
import { OrganizationForm } from "@/components/organizations/OrganizationForm";
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Edit Organization</h1>
        <form action={handleDelete}>
          <button
            type="submit"
            className="rounded border border-danger px-4 py-2 text-danger hover:bg-danger-subtle"
          >
            Delete
          </button>
        </form>
      </div>
      <OrganizationForm
        initialData={organization}
        organizations={organizations}
        onSubmit={handleUpdate}
      />
    </div>
  );
}
