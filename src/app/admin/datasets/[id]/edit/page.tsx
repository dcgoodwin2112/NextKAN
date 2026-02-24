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
import { listSeries } from "@/lib/actions/series";
import { DatasetForm } from "@/components/datasets/DatasetForm";
import { DataDictionaryEditor } from "@/components/datasets/DataDictionaryEditor";
import { ActivityFeed } from "@/components/admin/ActivityFeed";
import { WorkflowPanel } from "@/components/datasets/WorkflowPanel";
import { QualityBadge } from "@/components/datasets/QualityBadge";
import { VersionHistory } from "@/components/datasets/VersionHistory";
import { CreateVersionForm } from "@/components/datasets/CreateVersionForm";
import { prisma } from "@/lib/db";
import { updateDataDictionary } from "@/lib/services/data-dictionary";
import { isWorkflowEnabled, getAvailableTransitions, getWorkflowHistory, transitionWorkflow } from "@/lib/services/workflow";
import { calculateQualityScore } from "@/lib/services/data-quality";
import { createVersion, getVersionHistory } from "@/lib/services/versioning";
import { auth } from "@/lib/auth";
import type { DatasetCreateInput } from "@/lib/schemas/dataset";
import type { DatasetWithRelations } from "@/lib/schemas/dcat-us";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditDatasetPage({ params }: Props) {
  const { id } = await params;
  const [dataset, organizations, themes, allSeries, activities, session, versions] = await Promise.all([
    getDataset(id),
    listOrganizations(),
    listThemes(),
    listSeries(),
    prisma.activityLog.findMany({
      where: { entityType: "dataset", entityId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    auth(),
    getVersionHistory(id),
  ]);

  if (!dataset) notFound();

  const qualityScore = calculateQualityScore(dataset as unknown as DatasetWithRelations);
  const workflowEnabled = isWorkflowEnabled();
  const userRole = (session?.user as any)?.role as string || "viewer";

  let workflowTransitions: string[] = [];
  let workflowHistory: { id: string; fromStatus: string; toStatus: string; userName: string | null; note: string | null; createdAt: string }[] = [];

  if (workflowEnabled) {
    workflowTransitions = getAvailableTransitions(dataset.workflowStatus, userRole);
    const history = await getWorkflowHistory(id);
    workflowHistory = history.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
    }));
  }

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

  async function handleWorkflowTransition(toStatus: string, note?: string) {
    "use server";
    await transitionWorkflow(
      id,
      toStatus,
      session?.user?.id || "",
      (session?.user as any)?.role || "viewer",
      session?.user?.name || undefined,
      note
    );
    redirect(`/admin/datasets/${id}/edit`);
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

  async function handleCreateVersion(version: string, changelog?: string) {
    "use server";
    await createVersion(id, version, changelog, session?.user?.id || undefined);
    redirect(`/admin/datasets/${id}/edit`);
  }

  const serializedVersions = versions.map((v) => ({
    id: v.id,
    version: v.version,
    changelog: v.changelog,
    createdAt: v.createdAt.toISOString(),
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Edit Dataset</h1>
          <QualityBadge score={qualityScore.overall} />
        </div>
        <form action={handleDelete}>
          <button
            type="submit"
            className="rounded border border-red-300 px-4 py-2 text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </form>
      </div>

      {workflowEnabled && (
        <div className="mb-6">
          <WorkflowPanel
            datasetId={dataset.id}
            currentStatus={dataset.workflowStatus}
            availableTransitions={workflowTransitions}
            transitions={workflowHistory}
            onTransition={handleWorkflowTransition}
          />
        </div>
      )}

      <DatasetForm
        initialData={dataset}
        organizations={organizations}
        themes={themes}
        series={allSeries.map((s) => ({ id: s.id, title: s.title }))}
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
        <h2 className="text-lg font-semibold mb-4">Version History</h2>
        <div className="rounded-lg border p-6 space-y-4">
          <CreateVersionForm onSubmit={handleCreateVersion} />
          <VersionHistory versions={serializedVersions} />
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Activity History</h2>
        <div className="rounded-lg border p-6">
          <ActivityFeed activities={activities as any} />
        </div>
      </div>
    </div>
  );
}
