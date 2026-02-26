import { createDataset, addDistribution } from "@/lib/actions/datasets";
import { listOrganizations } from "@/lib/actions/organizations";
import { listThemes } from "@/lib/actions/themes";
import { listAvailableTemplates } from "@/lib/actions/templates";
import { auth } from "@/lib/auth";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { NewDatasetPageClient } from "./NewDatasetPageClient";
import type { DatasetCreateInput } from "@/lib/schemas/dataset";

export default async function NewDatasetPage() {
  const [organizations, themes, session] = await Promise.all([
    listOrganizations(),
    listThemes(),
    auth(),
  ]);

  const userOrgId = (session?.user as any)?.organizationId as string | undefined;
  const templates = await listAvailableTemplates(userOrgId);

  async function handleCreate(
    data: DatasetCreateInput & {
      distributions?: {
        title?: string | null;
        downloadURL?: string | null;
        accessURL?: string | null;
        mediaType?: string | null;
        format?: string | null;
      }[];
    }
  ) {
    "use server";
    const { distributions, ...datasetData } = data;
    const dataset = await createDataset(datasetData, session?.user?.id);

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
        onSubmit={handleCreate}
      />
    </div>
  );
}
