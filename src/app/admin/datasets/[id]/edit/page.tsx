import { notFound, redirect } from "next/navigation";
import {
  getDataset,
  updateDataset,
  deleteDataset,
  addDistribution,
  removeDistribution,
} from "@/lib/actions/datasets";
import { listOrganizations } from "@/lib/actions/organizations";
import { listThemes } from "@/lib/actions/themes";
import { DatasetForm } from "@/components/datasets/DatasetForm";
import type { DatasetCreateInput } from "@/lib/schemas/dataset";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditDatasetPage({ params }: Props) {
  const { id } = await params;
  const [dataset, organizations, themes] = await Promise.all([
    getDataset(id),
    listOrganizations(),
    listThemes(),
  ]);

  if (!dataset) notFound();

  async function handleUpdate(
    data: DatasetCreateInput & {
      distributions?: {
        id?: string;
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
    await updateDataset(id, datasetData);

    if (distributions !== undefined) {
      // Remove old distributions not in the new list
      const existingIds = dataset!.distributions.map((d) => d.id);
      const newIds = distributions.filter((d) => d.id).map((d) => d.id!);
      for (const existingId of existingIds) {
        if (!newIds.includes(existingId)) {
          await removeDistribution(existingId);
        }
      }
      // Add new distributions (ones without an id)
      for (const dist of distributions) {
        if (!dist.id) {
          await addDistribution(id, {
            title: dist.title || undefined,
            downloadURL: dist.downloadURL || undefined,
            accessURL: dist.accessURL || undefined,
            mediaType: dist.mediaType || undefined,
            format: dist.format || undefined,
          });
        }
      }
    }
  }

  async function handleDelete() {
    "use server";
    await deleteDataset(id);
    redirect("/admin/datasets");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Edit Dataset</h1>
        <form action={handleDelete}>
          <button
            type="submit"
            className="rounded border border-red-300 px-4 py-2 text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </form>
      </div>
      <DatasetForm
        initialData={dataset}
        organizations={organizations}
        themes={themes}
        onSubmit={handleUpdate}
      />
    </div>
  );
}
