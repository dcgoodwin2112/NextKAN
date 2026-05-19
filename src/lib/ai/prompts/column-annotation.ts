import type { ColumnProfile } from "@/lib/profiling";

export interface ColumnAnnotationContext {
  /** Dataset title for grounding column descriptions. */
  datasetTitle: string;
  /** Dataset description; may be a generated draft. */
  datasetDescription: string;
  /** All columns to annotate, batched into a single request. */
  columns: ColumnProfile[];
}

export const COLUMN_ANNOTATION_SYSTEM_PROMPT = `You are a data catalog assistant.
You annotate columns with concise descriptions and unit hints based on the
dataset context and the column's profile (type, distinct count, samples).
Do not invent units that aren't suggested by the values. Prefer "unknown" over guessing.
Always respond with a single JSON object — no prose, no markdown fences.`;

/**
 * Build a single-batch user prompt that annotates all columns of a dataset.
 * The response must be an object keyed by column name with description + unit.
 */
export function buildColumnAnnotationPrompt(ctx: ColumnAnnotationContext): string {
  const columnLines = ctx.columns
    .map((col) => formatColumnLine(col))
    .join("\n");

  return `Dataset: ${ctx.datasetTitle}
Description: ${ctx.datasetDescription}

Columns to annotate:
${columnLines}

For each column, generate a short description (1 sentence, max ~120 chars) and
a unit hint when applicable (e.g., "USD", "%", "ms", "count", "ISO-8601 date").
If no unit applies (e.g., names, categorical strings), set "unit" to null.

Respond with this exact JSON shape:
{
  "<columnName>": { "description": "...", "unit": "..." | null },
  ...
}

Include every column from the list. Do not add columns that weren't requested.`;
}

function formatColumnLine(col: ColumnProfile): string {
  const parts = [`- ${col.name} (${col.type})`];
  if (col.distinctCount != null) parts.push(`distinct=${col.distinctCount}`);
  if (col.min != null && col.max != null) {
    parts.push(`range=[${truncate(col.min, 20)} .. ${truncate(col.max, 20)}]`);
  }
  if (col.sampleValues.length > 0) {
    const samples = col.sampleValues
      .slice(0, 3)
      .map((v) => truncate(String(v), 20))
      .join(", ");
    parts.push(`samples=[${samples}]`);
  }
  if (col.isPii) parts.push("PII");
  return parts.join(" ");
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`;
}
