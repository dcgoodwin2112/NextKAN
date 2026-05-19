import { z } from "zod";

export const dictionaryFieldTypes = [
  "string",
  "number",
  "integer",
  "boolean",
  "date",
  "datetime",
] as const;

export const descriptionSourceEnum = z.enum([
  "manual",
  "ai_generated",
  "imported",
]);

export type DescriptionSource = z.infer<typeof descriptionSourceEnum>;

export const dataDictionaryFieldSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  title: z.string().optional(),
  type: z.enum(dictionaryFieldTypes),
  description: z.string().optional(),
  format: z.string().optional(),
  constraints: z.string().optional(),
  sortOrder: z.number().int().min(0).default(0),

  // Profiling stats (populated by the DuckDB profiler).
  duckdbType: z.string().optional(),
  rowCount: z.number().int().nonnegative().optional(),
  nullCount: z.number().int().nonnegative().optional(),
  distinctCount: z.number().int().nonnegative().optional(),
  min: z.string().optional(),
  max: z.string().optional(),
  sampleValues: z.array(z.unknown()).optional(),
  enumValues: z.array(z.unknown()).optional(),

  // Agent-readiness flags.
  filterable: z.boolean().optional(),
  aggregatable: z.boolean().optional(),
  isPii: z.boolean().optional(),
  isGeometry: z.boolean().optional(),
  crs: z.string().optional(),

  // Provenance
  descriptionSource: descriptionSourceEnum.optional(),
  profiledAt: z.date().optional(),
  extensions: z.record(z.string(), z.unknown()).optional(),
});

export type DataDictionaryFieldInput = z.infer<typeof dataDictionaryFieldSchema>;

export const dataDictionaryUpdateSchema = z.object({
  distributionId: z.string().min(1),
  fields: z.array(dataDictionaryFieldSchema),
});

export type DataDictionaryUpdateInput = z.infer<typeof dataDictionaryUpdateSchema>;
