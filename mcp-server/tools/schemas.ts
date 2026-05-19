import { z } from "zod";

export const filterOperatorEnum = z.enum([
  "=",
  "!=",
  "<",
  "<=",
  ">",
  ">=",
  "in",
  "contains",
  "starts_with",
  "is_null",
  "is_not_null",
]);

export const filterSchema = z.object({
  column: z.string().min(1),
  operator: filterOperatorEnum,
  value: z.unknown().optional(),
});

export const orderBySchema = z.object({
  column: z.string().min(1),
  direction: z.enum(["asc", "desc"]),
});

export type FilterInput = z.infer<typeof filterSchema>;
export type OrderByInput = z.infer<typeof orderBySchema>;
