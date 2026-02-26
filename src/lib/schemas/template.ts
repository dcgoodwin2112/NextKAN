import { z } from "zod";

/** Reusable dataset field presets — all optional since templates are partial. */
export const templateFieldsSchema = z.object({
  // Publisher & Contact
  publisherId: z.string().uuid().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),

  // Keywords & Themes
  keywords: z.array(z.string().min(1)).optional(),
  themeIds: z.array(z.string().uuid()).optional(),

  // Classification
  accessLevel: z.enum(["public", "restricted public", "non-public"]).optional(),

  // Federal
  bureauCode: z.string().regex(/^\d{3}:\d{2}$/).optional().or(z.literal("")),
  programCode: z.string().regex(/^\d{3}:\d{3}$/).optional().or(z.literal("")),

  // License & Access
  license: z.string().url().optional().or(z.literal("")),
  rights: z.string().max(255).optional(),
  landingPage: z.string().url().optional().or(z.literal("")),

  // Coverage
  spatial: z.string().optional(),
  temporal: z.string().optional(),

  // Additional Metadata
  accrualPeriodicity: z.string().optional(),
  conformsTo: z.string().url().optional().or(z.literal("")),
  dataQuality: z.boolean().optional(),
  describedBy: z.string().url().optional().or(z.literal("")),
  isPartOf: z.string().optional(),
  language: z.string().optional(),

  // DCAT-US v3.0
  version: z.string().max(50).optional(),
  versionNotes: z.string().max(1000).optional(),
  seriesId: z.string().uuid().optional().or(z.literal("")),
  previousVersion: z.string().max(255).optional(),
});

export type TemplateFields = z.infer<typeof templateFieldsSchema>;

export const templateCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(1000).optional(),
  organizationId: z.string().uuid().optional().or(z.literal("")),
  fields: templateFieldsSchema,
});

export type TemplateCreateInput = z.infer<typeof templateCreateSchema>;

export const templateUpdateSchema = templateCreateSchema.partial();

export type TemplateUpdateInput = z.infer<typeof templateUpdateSchema>;
