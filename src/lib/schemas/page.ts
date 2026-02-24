import { z } from "zod";

export const pageCreateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1).optional(),
  content: z.string().min(1, "Content is required"),
  published: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
});

export type PageCreateInput = z.infer<typeof pageCreateSchema>;

export const pageUpdateSchema = pageCreateSchema.partial();

export type PageUpdateInput = z.infer<typeof pageUpdateSchema>;
