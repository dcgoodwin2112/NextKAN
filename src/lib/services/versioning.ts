import { prisma } from "@/lib/db";
import { DatasetVersion } from "@/generated/prisma/client";
import {
  transformDatasetToDCATUS,
  reverseDCATUSToDatasetInput,
  DatasetWithRelations,
  DCATUSDataset,
} from "@/lib/schemas/dcat-us";
import { logActivity } from "@/lib/services/activity";
import { updateDataset } from "@/lib/actions/datasets";

/** Creates a versioned snapshot of a dataset's current metadata. */
export async function createVersion(
  datasetId: string,
  version: string,
  changelog?: string,
  userId?: string
): Promise<DatasetVersion> {
  const dataset = await prisma.dataset.findUnique({
    where: { id: datasetId },
    include: {
      publisher: { include: { parent: true } },
      distributions: true,
      keywords: true,
      themes: { include: { theme: true } },
    },
  });

  if (!dataset || dataset.deletedAt) {
    throw new Error("Dataset not found");
  }

  const dcatSnapshot = transformDatasetToDCATUS(
    dataset as unknown as DatasetWithRelations
  );
  const snapshot = JSON.stringify(dcatSnapshot);

  const record = await prisma.datasetVersion.create({
    data: {
      datasetId,
      version,
      snapshot,
      changelog: changelog || null,
      createdById: userId || null,
    },
  });

  // Fire-and-forget activity logging
  logActivity({
    action: "version_created",
    entityType: "dataset",
    entityId: datasetId,
    entityName: dataset.title,
    userId,
    details: { version, changelog },
  }).catch(() => {});

  return record;
}

/** Returns all versions for a dataset, newest first. */
export async function getVersionHistory(
  datasetId: string
): Promise<DatasetVersion[]> {
  return prisma.datasetVersion.findMany({
    where: { datasetId },
    orderBy: { createdAt: "desc" },
  });
}

/** Returns a specific version by dataset ID and version string. */
export async function getVersion(
  datasetId: string,
  version: string
): Promise<DatasetVersion | null> {
  return prisma.datasetVersion.findUnique({
    where: { datasetId_version: { datasetId, version } },
  });
}

export interface FieldDiff {
  field: string;
  from: unknown;
  to: unknown;
}

/** Compares two JSON snapshots and returns an array of field-level diffs. */
export function compareVersions(
  snapshotA: string,
  snapshotB: string
): FieldDiff[] {
  const a = JSON.parse(snapshotA);
  const b = JSON.parse(snapshotB);

  const diffs: FieldDiff[] = [];
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);

  for (const key of allKeys) {
    const valA = a[key];
    const valB = b[key];

    if (JSON.stringify(valA) !== JSON.stringify(valB)) {
      diffs.push({ field: key, from: valA, to: valB });
    }
  }

  return diffs;
}

/** Fetches a version by its primary key ID. */
export async function getVersionById(
  id: string
): Promise<DatasetVersion | null> {
  return prisma.datasetVersion.findUnique({ where: { id } });
}

/**
 * Reverts a dataset's metadata to a prior version snapshot.
 * Restores: title, description, keywords, themes, all DCAT-US metadata fields.
 * Does NOT restore: distributions, datastore tables, data dictionaries.
 */
export async function revertToVersion(
  datasetId: string,
  versionId: string,
  userId?: string
): Promise<void> {
  const version = await prisma.datasetVersion.findUnique({
    where: { id: versionId },
  });

  if (!version || version.datasetId !== datasetId) {
    throw new Error("Version not found");
  }

  const snapshot = JSON.parse(version.snapshot) as DCATUSDataset;

  // Look up publisher by name to get publisherId
  const publisherName = snapshot.publisher?.name;
  let publisherId: string | undefined;
  if (publisherName) {
    const org = await prisma.organization.findFirst({
      where: { name: publisherName },
    });
    if (org) publisherId = org.id;
  }

  if (!publisherId) {
    // Fall back to current dataset's publisher
    const current = await prisma.dataset.findUnique({
      where: { id: datasetId },
      select: { publisherId: true },
    });
    publisherId = current?.publisherId;
  }

  const reversed = reverseDCATUSToDatasetInput(snapshot, publisherId || "");

  // Look up theme IDs by name
  let themeIds: string[] | undefined;
  if (snapshot.theme && snapshot.theme.length > 0) {
    const themes = await prisma.theme.findMany({
      where: { name: { in: snapshot.theme } },
    });
    themeIds = themes.map((t) => t.id);
  }

  // Build update input (exclude distributions — revert is metadata-only)
  const { distributions: _distributions, ...updateInput } = reversed;
  await updateDataset(datasetId, {
    ...updateInput,
    ...(themeIds !== undefined ? { themeIds } : {}),
  });

  // Auto-create a new version recording the revert
  await createVersion(
    datasetId,
    `revert-${Date.now()}`,
    `Reverted to v${version.version}`,
    userId
  );

  // Log activity
  logActivity({
    action: "version_reverted",
    entityType: "dataset",
    entityId: datasetId,
    entityName: snapshot.title,
    userId,
    details: { revertedToVersion: version.version },
  }).catch(() => {});
}
