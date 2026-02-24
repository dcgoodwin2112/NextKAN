import { z } from "zod";

export const datasetStatusEnum = z.enum(["draft", "published", "archived"]);

export const datasetCreateSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().min(1, "Description is required"),
  identifier: z.string().max(255).optional(),
  accessLevel: z
    .enum(["public", "restricted public", "non-public"])
    .default("public"),
  status: datasetStatusEnum.default("draft"),
  publisherId: z.string().uuid("Publisher is required"),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  keywords: z.array(z.string().min(1)).min(1, "At least one keyword is required"),

  bureauCode: z
    .string()
    .regex(/^\d{3}:\d{2}$/)
    .optional()
    .or(z.literal("")),
  programCode: z
    .string()
    .regex(/^\d{3}:\d{3}$/)
    .optional()
    .or(z.literal("")),

  license: z.string().url().optional().or(z.literal("")),
  rights: z.string().max(255).optional(),
  spatial: z.string().optional(),
  temporal: z.string().optional(),

  issued: z.string().datetime().optional().or(z.literal("")),
  accrualPeriodicity: z.string().optional(),
  conformsTo: z.string().url().optional().or(z.literal("")),
  dataQuality: z.boolean().optional(),
  describedBy: z.string().url().optional().or(z.literal("")),
  isPartOf: z.string().optional(),
  landingPage: z.string().url().optional().or(z.literal("")),
  language: z.string().optional().default("en-us"),
  themeIds: z.array(z.string().uuid()).optional(),
  references: z.array(z.string().url()).optional(),
});

export const datasetUpdateSchema = datasetCreateSchema.partial();

export type DatasetCreateInput = z.infer<typeof datasetCreateSchema>;
export type DatasetUpdateInput = z.infer<typeof datasetUpdateSchema>;
