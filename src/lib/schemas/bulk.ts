import { z } from "zod";

export const bulkIdsSchema = z.array(z.string().uuid()).min(1).max(100);

export const bulkDatasetUpdateSchema = z.object({
  ids: bulkIdsSchema,
  update: z
    .object({
      status: z.enum(["draft", "published", "archived"]).optional(),
      publisherId: z.string().uuid().optional(),
    })
    .refine(
      (obj) => Object.values(obj).some((v) => v !== undefined),
      "At least one field required"
    ),
});

export const bulkUserUpdateSchema = z.object({
  ids: bulkIdsSchema,
  update: z.object({
    role: z.enum(["admin", "orgAdmin", "editor", "viewer"]).optional(),
  }).refine(
    (obj) => Object.values(obj).some((v) => v !== undefined),
    "At least one field required"
  ),
});

export const bulkPageUpdateSchema = z.object({
  ids: bulkIdsSchema,
  update: z.object({
    published: z.boolean().optional(),
  }).refine(
    (obj) => Object.values(obj).some((v) => v !== undefined),
    "At least one field required"
  ),
});

export type BulkDatasetUpdate = z.infer<typeof bulkDatasetUpdateSchema>;
export type BulkUserUpdate = z.infer<typeof bulkUserUpdateSchema>;
export type BulkPageUpdate = z.infer<typeof bulkPageUpdateSchema>;
