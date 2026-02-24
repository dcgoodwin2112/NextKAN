import { z } from "zod";

export const dictionaryFieldTypes = [
  "string",
  "number",
  "integer",
  "boolean",
  "date",
  "datetime",
] as const;

export const dataDictionaryFieldSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  title: z.string().optional(),
  type: z.enum(dictionaryFieldTypes),
  description: z.string().optional(),
  format: z.string().optional(),
  constraints: z.string().optional(),
  sortOrder: z.number().int().min(0).default(0),
});

export type DataDictionaryFieldInput = z.infer<typeof dataDictionaryFieldSchema>;

export const dataDictionaryUpdateSchema = z.object({
  distributionId: z.string().min(1),
  fields: z.array(dataDictionaryFieldSchema),
});

export type DataDictionaryUpdateInput = z.infer<typeof dataDictionaryUpdateSchema>;
