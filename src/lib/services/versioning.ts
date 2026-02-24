import { prisma } from "@/lib/db";
import { DatasetVersion } from "@/generated/prisma/client";
import {
  transformDatasetToDCATUS,
  DatasetWithRelations,
} from "@/lib/schemas/dcat-us";
import { logActivity } from "@/lib/services/activity";

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

  if (!dataset) {
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
