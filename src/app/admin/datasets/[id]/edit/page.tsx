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
import { DataDictionaryEditor } from "@/components/datasets/DataDictionaryEditor";
import { ActivityFeed } from "@/components/admin/ActivityFeed";
import { prisma } from "@/lib/db";
import { updateDataDictionary } from "@/lib/services/data-dictionary";
import type { DatasetCreateInput } from "@/lib/schemas/dataset";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditDatasetPage({ params }: Props) {
  const { id } = await params;
  const [dataset, organizations, themes, activities] = await Promise.all([
    getDataset(id),
    listOrganizations(),
    listThemes(),
    prisma.activityLog.findMany({
      where: { entityType: "dataset", entityId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  if (!dataset) notFound();

  // Load data dictionaries for each distribution
  const dictionaries = await Promise.all(
    dataset.distributions.map(async (dist) => {
      const dict = await prisma.dataDictionary.findUnique({
        where: { distributionId: dist.id },
        include: { fields: { orderBy: { sortOrder: "asc" } } },
      });
      return { distributionId: dist.id, title: dist.title, dictionary: dict };
    })
  );

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
      const existingIds = dataset!.distributions.map((d) => d.id);
      const newIds = distributions.filter((d) => d.id).map((d) => d.id!);
      for (const existingId of existingIds) {
        if (!newIds.includes(existingId)) {
          await removeDistribution(existingId);
        }
      }
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

  async function handleSaveDictionary(
    distributionId: string,
    fields: {
      name: string;
      title?: string;
      type: string;
      description?: string;
      format?: string;
      sortOrder: number;
    }[]
  ) {
    "use server";
    await updateDataDictionary(
      distributionId,
      fields.map((f) => ({
        ...f,
        type: f.type as "string" | "number" | "integer" | "boolean" | "date" | "datetime",
      }))
    );
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

      {dictionaries.some((d) => d.dictionary) && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Data Dictionaries</h2>
          {dictionaries
            .filter((d) => d.dictionary)
            .map((d) => (
              <div key={d.distributionId} className="mb-4 rounded-lg border p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  {d.title || d.distributionId}
                </h3>
                <DataDictionaryEditor
                  distributionId={d.distributionId}
                  fields={d.dictionary!.fields}
                  onSave={handleSaveDictionary}
                />
              </div>
            ))}
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Activity History</h2>
        <div className="rounded-lg border p-6">
          <ActivityFeed activities={activities as any} />
        </div>
      </div>
    </div>
  );
}
