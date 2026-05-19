import type { ColumnProfile } from "@/lib/profiling";

export interface DatasetDraftProfile {
  /** Original filename or a fallback label. */
  sourceName: string;
  rowCount: number;
  columns: ColumnProfile[];
}

/**
 * Schema the model must conform to when generating a dataset draft. Phase 6
 * Server Actions pass this through `generateJson()` from `@/lib/ai`.
 */
export const datasetDraftJsonSchemaShape = {
  title: "string (concise, descriptive)",
  description: "string (2-4 sentences)",
  keywords: "string[] (3-8 relevant tags, lowercase)",
} as const;

export const DATASET_DRAFT_SYSTEM_PROMPT = `You are a data catalog metadata assistant for an open-data platform.
You generate accurate, neutral metadata drafts that human catalogers will review.
Never invent facts that aren't supported by the column profile. Prefer brevity.
Always respond with a single JSON object — no prose, no markdown fences.`;

/**
 * Build the user prompt for a dataset metadata draft from a profiling result.
 * Keep deterministic — given the same profile, the prompt is identical.
 */
export function buildDatasetDraftPrompt(profile: DatasetDraftProfile): string {
  const columnLines = profile.columns
    .map((col) => formatColumnLine(col))
    .join("\n");

  return `Source filename: ${profile.sourceName}
Row count: ${profile.rowCount}

Columns:
${columnLines}

Generate a dataset metadata draft as JSON with this exact shape:
{
  "title": "${datasetDraftJsonSchemaShape.title}",
  "description": "${datasetDraftJsonSchemaShape.description}",
  "keywords": ["string", "string", ...]
}

Rules:
- title: use the actual subject suggested by column names; do not include "Dataset" or "Data" as filler.
- description: explain what the dataset records, the grain (one row per X), and the time/space scope if inferable. No speculation.
- keywords: 3-8 lowercase tags, single words or hyphenated phrases.

Respond with the JSON object only.`;
}

function formatColumnLine(col: ColumnProfile): string {
  const parts = [`- ${col.name}: ${col.type}`];
  if (col.distinctCount != null) parts.push(`distinct=${col.distinctCount}`);
  if (col.nullCount != null) parts.push(`nulls=${col.nullCount}`);
  if (col.min != null && col.max != null) {
    parts.push(`range=[${truncate(col.min, 24)} .. ${truncate(col.max, 24)}]`);
  }
  if (col.sampleValues.length > 0) {
    const samples = col.sampleValues
      .slice(0, 3)
      .map((v) => truncate(String(v), 24))
      .join(", ");
    parts.push(`samples=[${samples}]`);
  }
  if (col.isPii) parts.push("PII");
  return parts.join(" ");
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`;
}
