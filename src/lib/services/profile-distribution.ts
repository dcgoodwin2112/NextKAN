import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { prisma } from "@/lib/db";
import type { Distribution } from "@/generated/prisma/client";
import type { ColumnProfile, ProfileResult } from "@/lib/profiling";

/** Default storage root, relative to cwd. Override via NEXTKAN_STORAGE_PATH. */
const DEFAULT_STORAGE_ROOT = "./storage";

/** Hard ceiling on worker execution (ms). Profiling a 100MB CSV should take well under this. */
const DEFAULT_PROFILE_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Injectable profiler. In production this resolves to `profileInWorker` from
 * `@/lib/profiling/worker`. Tests pass a stub to avoid spawning workers.
 */
export type ProfilerFn = (opts: {
  sourcePath: string;
  parquetTargetPath: string;
  mediaType?: string;
  timeoutMs?: number;
}) => Promise<ProfileResult>;

export interface ProfileDistributionOptions {
  /** Override storage root for tests. */
  storageRoot?: string;
  /** Inject a profiler for tests. */
  profiler?: ProfilerFn;
  /** Override timeout. */
  timeoutMs?: number;
}

/**
 * Run the agent-first profiling sidecar for a distribution that already has
 * a source file on disk (typically populated by the SQLite import path).
 *
 * On success: writes a Parquet copy under `storage/resources/<id>/`, updates
 * `Distribution` agent-first fields, and replaces the `DataDictionary` with
 * profiler-enriched fields. On failure: sets `profileStatus = "failed"` and
 * `profileError`. Never throws — callers can run this alongside the SQLite
 * import and survive its failure independently.
 */
export async function profileDistribution(
  distributionId: string,
  options: ProfileDistributionOptions = {},
): Promise<void> {
  const distribution = await prisma.distribution.findUnique({
    where: { id: distributionId },
  });
  if (!distribution) return;
  if (!distribution.filePath) return;

  const storageRoot = options.storageRoot ?? resolveStorageRoot();
  const ext = pickExtension(distribution);
  const relDir = path.join("resources", distributionId);
  const relOriginal = path.join(relDir, `original${ext}`);
  const relParquet = path.join(relDir, "data.parquet");
  const absDir = path.join(storageRoot, relDir);
  const absOriginal = path.join(storageRoot, relOriginal);
  const absParquet = path.join(storageRoot, relParquet);

  try {
    await prisma.distribution.update({
      where: { id: distributionId },
      data: { profileStatus: "processing", profileError: null },
    });

    await mkdir(absDir, { recursive: true });
    await copyFile(distribution.filePath, absOriginal);

    const profiler = options.profiler ?? (await loadDefaultProfiler());
    const result = await profiler({
      sourcePath: absOriginal,
      parquetTargetPath: absParquet,
      mediaType: distribution.mediaType ?? undefined,
      timeoutMs: options.timeoutMs ?? DEFAULT_PROFILE_TIMEOUT_MS,
    });

    await persistProfileResult(distributionId, relOriginal, relParquet, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.distribution.update({
      where: { id: distributionId },
      data: {
        profileStatus: "failed",
        profileError: message.slice(0, 1000),
      },
    });
  }
}

async function persistProfileResult(
  distributionId: string,
  relOriginalPath: string,
  relParquetPath: string,
  result: ProfileResult,
): Promise<void> {
  await prisma.distribution.update({
    where: { id: distributionId },
    data: {
      originalPath: relOriginalPath,
      parquetPath: result.parquetPath ? relParquetPath : null,
      rowCount: result.rowCount,
      profiledAt: new Date(),
      profileStatus: "ready",
      profileError: null,
    },
  });

  await replaceDataDictionary(distributionId, result.columns);
}

async function replaceDataDictionary(
  distributionId: string,
  columns: ColumnProfile[],
): Promise<void> {
  const existing = await prisma.dataDictionary.findUnique({
    where: { distributionId },
  });
  if (existing) {
    await prisma.dataDictionary.delete({ where: { id: existing.id } });
  }

  if (columns.length === 0) {
    await prisma.dataDictionary.create({ data: { distributionId } });
    return;
  }

  const now = new Date();
  await prisma.dataDictionary.create({
    data: {
      distributionId,
      fields: {
        create: columns.map((col, index) => ({
          name: col.name,
          type: col.type,
          sortOrder: index,
          duckdbType: col.duckdbType,
          rowCount: col.rowCount,
          nullCount: col.nullCount,
          distinctCount: col.distinctCount,
          min: col.min,
          max: col.max,
          sampleValues: serializeJson(col.sampleValues),
          enumValues: col.enumValues ? serializeJson(col.enumValues) : null,
          filterable: col.filterable,
          aggregatable: col.aggregatable,
          isPii: col.isPii,
          isGeometry: col.isGeometry,
          crs: col.crs,
          descriptionSource: null,
          profiledAt: now,
        })),
      },
    },
  });
}

function serializeJson(value: unknown): string {
  return JSON.stringify(value, (_, v) =>
    typeof v === "bigint" ? v.toString() : v,
  );
}

function resolveStorageRoot(): string {
  const raw = process.env.NEXTKAN_STORAGE_PATH ?? DEFAULT_STORAGE_ROOT;
  return path.resolve(raw);
}

function pickExtension(distribution: Distribution): string {
  if (distribution.fileName) {
    const ext = path.extname(distribution.fileName);
    if (ext) return ext;
  }
  if (distribution.filePath) {
    const ext = path.extname(distribution.filePath);
    if (ext) return ext;
  }
  if (distribution.mediaType) {
    return mediaTypeExtension(distribution.mediaType);
  }
  return "";
}

function mediaTypeExtension(mediaType: string): string {
  switch (mediaType) {
    case "text/csv":
      return ".csv";
    case "application/json":
      return ".json";
    case "application/geo+json":
      return ".geojson";
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return ".xlsx";
    case "application/vnd.ms-excel":
      return ".xls";
    default:
      return "";
  }
}

async function loadDefaultProfiler(): Promise<ProfilerFn> {
  const mod = await import("@/lib/profiling/worker");
  return (opts) => mod.profileInWorker(opts);
}
