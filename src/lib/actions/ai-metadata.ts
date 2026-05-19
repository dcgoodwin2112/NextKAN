"use server";

import { z } from "zod";

import { prisma } from "@/lib/db";
import {
  AiUnavailableError,
  generateJson,
  isAiAvailable,
} from "@/lib/ai";
import {
  buildColumnAnnotationPrompt,
  buildDatasetDraftPrompt,
  COLUMN_ANNOTATION_SYSTEM_PROMPT,
  DATASET_DRAFT_SYSTEM_PROMPT,
} from "@/lib/ai/prompts";
import type { ColumnProfile } from "@/lib/profiling";

const draftSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  keywords: z.array(z.string().min(1).max(60)).min(1).max(15),
});

const annotationSchema = z.record(
  z.string(),
  z.object({
    description: z.string().min(1).max(500),
    unit: z.string().max(60).nullable(),
  }),
);

export interface DraftMetadataResult {
  title: string;
  description: string;
  keywords: string[];
}

/**
 * Generate a dataset metadata draft from a profiled distribution.
 *
 * Returns suggestions; the caller decides whether to apply them via the
 * existing dataset edit form. Throws `AiUnavailableError` when the API key is
 * absent (caller should pre-check with `isAiAvailable()`).
 */
export async function draftDatasetMetadata(
  distributionId: string,
): Promise<DraftMetadataResult> {
  if (!isAiAvailable()) throw new AiUnavailableError();

  const distribution = await prisma.distribution.findUnique({
    where: { id: distributionId },
    include: { dataDictionary: { include: { fields: true } } },
  });
  if (!distribution) {
    throw new Error(`Distribution not found: ${distributionId}`);
  }
  if (distribution.profileStatus !== "ready") {
    throw new Error(
      `Distribution is not profiled yet (status: ${distribution.profileStatus})`,
    );
  }

  const columns = (distribution.dataDictionary?.fields ?? []).map(toColumnProfile);
  const sourceName =
    distribution.fileName ?? distribution.originalPath ?? distribution.id;

  const result = await generateJson({
    system: DATASET_DRAFT_SYSTEM_PROMPT,
    prompt: buildDatasetDraftPrompt({
      sourceName,
      rowCount: distribution.rowCount ?? 0,
      columns,
    }),
    schema: draftSchema,
  });

  return result;
}

/**
 * Persist an AI-generated dataset draft. Thin wrapper around `updateDataset`
 * so the admin UI can apply suggestions in one round trip.
 */
export async function applyDatasetDraft(
  datasetId: string,
  draft: DraftMetadataResult,
): Promise<void> {
  const { updateDataset } = await import("./datasets");
  await updateDataset(datasetId, {
    title: draft.title,
    description: draft.description,
    keywords: draft.keywords,
  });
}

export interface AnnotationOutcome {
  /** Number of fields where description was updated. */
  updated: number;
  /** Number of fields the AI did not return an annotation for. */
  skipped: number;
}

/**
 * Annotate all columns of a distribution in a single batched AI call. Writes
 * descriptions to `DataDictionaryField`, sets `descriptionSource =
 * "ai_generated"` so the admin UI can distinguish AI vs manual edits.
 */
export async function annotateDistributionColumns(
  distributionId: string,
): Promise<AnnotationOutcome> {
  if (!isAiAvailable()) throw new AiUnavailableError();

  const distribution = await prisma.distribution.findUnique({
    where: { id: distributionId },
    include: {
      dataset: { select: { title: true, description: true } },
      dataDictionary: { include: { fields: { orderBy: { sortOrder: "asc" } } } },
    },
  });
  if (!distribution) {
    throw new Error(`Distribution not found: ${distributionId}`);
  }
  const dictionary = distribution.dataDictionary;
  if (!dictionary || dictionary.fields.length === 0) {
    throw new Error("Distribution has no profiled columns to annotate");
  }

  const columns = dictionary.fields.map(toColumnProfile);

  const annotations = await generateJson({
    system: COLUMN_ANNOTATION_SYSTEM_PROMPT,
    prompt: buildColumnAnnotationPrompt({
      datasetTitle: distribution.dataset.title,
      datasetDescription: distribution.dataset.description,
      columns,
    }),
    schema: annotationSchema,
  });

  let updated = 0;
  let skipped = 0;
  await prisma.$transaction(async (tx) => {
    for (const field of dictionary.fields) {
      const annotation = annotations[field.name];
      if (!annotation) {
        skipped += 1;
        continue;
      }
      const description = annotation.unit
        ? `${annotation.description} (unit: ${annotation.unit})`
        : annotation.description;
      await tx.dataDictionaryField.update({
        where: { id: field.id },
        data: {
          description,
          descriptionSource: "ai_generated",
        },
      });
      updated += 1;
    }
  });

  return { updated, skipped };
}

/**
 * Convert a persisted `DataDictionaryField` row back into a `ColumnProfile`
 * shape so prompt builders can consume it. JSON-array fields are parsed
 * defensively — malformed values fall back to empty arrays.
 */
function toColumnProfile(field: {
  name: string;
  type: string;
  duckdbType: string | null;
  rowCount: number | null;
  nullCount: number | null;
  distinctCount: number | null;
  min: string | null;
  max: string | null;
  sampleValues: string | null;
  enumValues: string | null;
  isPii: boolean;
  isGeometry: boolean;
  crs: string | null;
  filterable: boolean;
  aggregatable: boolean;
}): ColumnProfile {
  return {
    name: field.name,
    type: field.type as ColumnProfile["type"],
    duckdbType: field.duckdbType ?? "",
    rowCount: field.rowCount ?? 0,
    nullCount: field.nullCount,
    distinctCount: field.distinctCount,
    min: field.min,
    max: field.max,
    sampleValues: parseJsonArray(field.sampleValues),
    enumValues: field.enumValues ? parseJsonArray(field.enumValues) : null,
    filterable: field.filterable,
    aggregatable: field.aggregatable,
    isPii: field.isPii,
    isGeometry: field.isGeometry,
    crs: field.crs,
  };
}

function parseJsonArray(raw: string | null): unknown[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
