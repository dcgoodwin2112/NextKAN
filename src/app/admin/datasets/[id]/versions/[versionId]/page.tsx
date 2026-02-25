import { notFound, redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { VersionDetail } from "@/components/datasets/VersionDetail";
import { VersionDiff } from "@/components/datasets/VersionDiff";
import { VersionActions } from "@/components/datasets/VersionActions";
import { getVersionById, revertToVersion, compareVersions } from "@/lib/services/versioning";
import { getDataset } from "@/lib/actions/datasets";
import { transformDatasetToDCATUS, DatasetWithRelations } from "@/lib/schemas/dcat-us";
import { auth } from "@/lib/auth";

interface Props {
  params: Promise<{ id: string; versionId: string }>;
  searchParams: Promise<{ compare?: string }>;
}

export default async function VersionDetailPage({ params, searchParams }: Props) {
  const { id, versionId } = await params;
  const { compare } = await searchParams;

  const [version, dataset] = await Promise.all([
    getVersionById(versionId),
    getDataset(id),
  ]);

  if (!version || version.datasetId !== id || !dataset) {
    notFound();
  }

  const snapshot = JSON.parse(version.snapshot);

  // Compare mode: diff snapshot against current dataset state
  let diffs: { field: string; from: unknown; to: unknown }[] | null = null;
  if (compare === "current") {
    const currentSnapshot = JSON.stringify(
      transformDatasetToDCATUS(dataset as unknown as DatasetWithRelations)
    );
    diffs = compareVersions(version.snapshot, currentSnapshot);
  }

  async function handleRevert() {
    "use server";
    const sess = await auth();
    await revertToVersion(id, versionId, sess?.user?.id || undefined);
    redirect(`/admin/datasets/${id}/edit`);
  }

  async function handleCompare() {
    "use server";
    redirect(`/admin/datasets/${id}/versions/${versionId}?compare=current`);
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Datasets", href: "/admin/datasets" },
          { label: "Edit Dataset", href: `/admin/datasets/${id}/edit` },
          { label: `Version v${version.version}` },
        ]}
      />
      <AdminPageHeader title={`Version v${version.version}`} />

      <div className="rounded-lg border p-6 mb-6">
        <dl className="text-sm space-y-1 mb-4">
          <div className="flex gap-2">
            <dt className="font-medium text-text-muted">Created:</dt>
            <dd>{new Date(version.createdAt).toLocaleString()}</dd>
          </div>
          {version.changelog && (
            <div className="flex gap-2">
              <dt className="font-medium text-text-muted">Changelog:</dt>
              <dd>{version.changelog}</dd>
            </div>
          )}
        </dl>
        <VersionActions
          versionLabel={version.version}
          onRevert={handleRevert}
          onCompare={handleCompare}
        />
      </div>

      {diffs !== null && (
        <div className="rounded-lg border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">
            Comparison with Current State
          </h2>
          <VersionDiff diffs={diffs} />
        </div>
      )}

      <div className="rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Snapshot Contents</h2>
        <VersionDetail snapshot={snapshot} />
      </div>
    </div>
  );
}
