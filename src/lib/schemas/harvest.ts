import { z } from "zod";

export const harvestSourceCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  url: z.string().url("Valid URL is required"),
  type: z.enum(["dcat-us", "ckan"]).default("dcat-us"),
  schedule: z.string().optional(),
  organizationId: z.string().uuid("Organization is required"),
  enabled: z.boolean().default(true),
});

export type HarvestSourceCreateInput = z.infer<typeof harvestSourceCreateSchema>;

export const harvestSourceUpdateSchema = harvestSourceCreateSchema.partial();

export type HarvestSourceUpdateInput = z.infer<typeof harvestSourceUpdateSchema>;
