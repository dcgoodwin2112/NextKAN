import { z } from "zod";

export const profileStatusEnum = z.enum([
  "none",
  "pending",
  "processing",
  "ready",
  "failed",
]);

export type ProfileStatus = z.infer<typeof profileStatusEnum>;

export const distributionSchema = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
    downloadURL: z.string().url().optional().or(z.literal("")),
    accessURL: z.string().url().optional().or(z.literal("")),
    mediaType: z.string().optional(),
    format: z.string().optional(),
    conformsTo: z.string().url().optional().or(z.literal("")),
    describedBy: z.string().url().optional().or(z.literal("")),
    fileName: z.string().optional(),
    filePath: z.string().optional(),
    fileSize: z.number().int().positive().optional(),

    // Agent-first additions. All optional — pre-pivot distributions never set these.
    originalPath: z.string().optional(),
    parquetPath: z.string().optional(),
    rowCount: z.number().int().nonnegative().optional(),
    profiledAt: z.date().optional(),
    profileStatus: profileStatusEnum.optional(),
    profileError: z.string().optional(),
  })
  .refine((data) => data.downloadURL || data.accessURL, {
    message: "Either downloadURL or accessURL is required",
  });

export type DistributionInput = z.infer<typeof distributionSchema>;
