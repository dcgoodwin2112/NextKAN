import { z } from "zod";

export const licenseCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  url: z.string().url().optional().or(z.literal("")),
  description: z.string().max(1000).optional(),
  isDefault: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export type LicenseCreateInput = z.infer<typeof licenseCreateSchema>;

export const licenseUpdateSchema = licenseCreateSchema.partial();

export type LicenseUpdateInput = z.infer<typeof licenseUpdateSchema>;
