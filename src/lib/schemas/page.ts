import { z } from "zod";

export const NAV_LOCATIONS = ["header", "footer", "both", "none"] as const;
export const PAGE_TEMPLATES = ["default", "full-width", "sidebar"] as const;

export const pageCreateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1).optional(),
  content: z.string().min(1, "Content is required"),
  published: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
  navLocation: z.enum(NAV_LOCATIONS).default("header"),
  parentId: z.string().nullable().optional(),
  metaTitle: z.string().max(70, "Meta title must be 70 characters or less").optional(),
  metaDescription: z.string().max(160, "Meta description must be 160 characters or less").optional(),
  imageUrl: z.union([z.string().url(), z.literal("")]).optional(),
  template: z.enum(PAGE_TEMPLATES).default("default"),
});

export type PageCreateInput = z.infer<typeof pageCreateSchema>;

export const pageUpdateSchema = pageCreateSchema.partial();

export type PageUpdateInput = z.infer<typeof pageUpdateSchema>;
