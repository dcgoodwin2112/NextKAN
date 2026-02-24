import { z } from "zod";

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
  })
  .refine((data) => data.downloadURL || data.accessURL, {
    message: "Either downloadURL or accessURL is required",
  });

export type DistributionInput = z.infer<typeof distributionSchema>;
