import { createDataset, addDistribution } from "@/lib/actions/datasets";
import { listOrganizations } from "@/lib/actions/organizations";
import { listThemes } from "@/lib/actions/themes";
import { listAvailableTemplates } from "@/lib/actions/templates";
import { listCustomFieldDefinitions } from "@/lib/actions/custom-fields";
import { auth } from "@/lib/auth";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { NewDatasetPageClient } from "./NewDatasetPageClient";
import type { DatasetCreateInput } from "@/lib/schemas/dataset";

export default async function NewDatasetPage() {
  const [organizations, themes, session, allCustomFields] = await Promise.all([
    listOrganizations(),
    listThemes(),
    auth(),
    listCustomFieldDefinitions(),
  ]);

  const userOrgId = (session?.user as any)?.organizationId as string | undefined;
  const templates = await listAvailableTemplates(userOrgId);

  const customFieldDefs = allCustomFields.map((d) => ({
    id: d.id,
    name: d.name,
    label: d.label,
    type: d.type,
    required: d.required,
    options: d.options ? JSON.parse(d.options) : null,
    sortOrder: d.sortOrder,
  }));

  async function handleCreate(
    data: DatasetCreateInput & {
      distributions?: {
        title?: string | null;
        downloadURL?: string | null;
        accessURL?: string | null;
        mediaType?: string | null;
        format?: string | null;
      }[];
      customFields?: Record<string, string>;
    }
  ) {
    "use server";
    const { distributions, customFields, ...datasetData } = data;
    const dataset = await createDataset(datasetData, session?.user?.id, customFields);

    if (distributions?.length) {
      for (const dist of distributions) {
        await addDistribution(dataset.id, {
          title: dist.title || undefined,
          downloadURL: dist.downloadURL || undefined,
          accessURL: dist.accessURL || undefined,
          mediaType: dist.mediaType || undefined,
          format: dist.format || undefined,
        });
      }
    }
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Datasets", href: "/admin/datasets" },
          { label: "New Dataset" },
        ]}
      />
      <AdminPageHeader title="New Dataset" />
      <NewDatasetPageClient
        organizations={organizations}
        themes={themes}
        templates={templates}
        customFieldDefinitions={customFieldDefs}
        onSubmit={handleCreate}
      />
    </div>
  );
}
