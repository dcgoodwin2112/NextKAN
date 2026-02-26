import { z } from "zod";

export const datastoreColumnSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["TEXT", "INTEGER", "REAL", "BOOLEAN"]),
});

export type DatastoreColumn = z.infer<typeof datastoreColumnSchema>;

const filterOperators = [
  "=",
  "!=",
  ">",
  "<",
  ">=",
  "<=",
  "contains",
  "starts_with",
] as const;

const filterSchema = z.object({
  column: z.string().min(1),
  operator: z.enum(filterOperators),
  value: z.union([z.string(), z.number()]),
});

export const datastoreQuerySchema = z.object({
  limit: z.coerce.number().int().min(0).max(10000).default(100),
  offset: z.coerce.number().int().min(0).default(0),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("asc"),
  filters: z
    .string()
    .transform((val, ctx) => {
      try {
        const parsed = JSON.parse(val);
        const result = z.array(filterSchema).parse(parsed);
        return result;
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid filters JSON",
        });
        return z.NEVER;
      }
    })
    .optional(),
});

export type DatastoreQuery = z.infer<typeof datastoreQuerySchema>;

export const datastoreSqlSchema = z.object({
  sql: z.string().min(1).max(10000),
});

export type DatastoreSqlInput = z.infer<typeof datastoreSqlSchema>;
