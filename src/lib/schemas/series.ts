import { z } from "zod";

export const seriesCreateSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  identifier: z.string().min(1, "Identifier is required").max(255),
  description: z.string().max(2000).optional(),
});

export const seriesUpdateSchema = seriesCreateSchema.partial();

export type SeriesCreateInput = z.infer<typeof seriesCreateSchema>;
export type SeriesUpdateInput = z.infer<typeof seriesUpdateSchema>;
