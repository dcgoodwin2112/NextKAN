import { z } from "zod";

export const organizationSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  parentId: z.string().uuid().optional().or(z.literal("")),
});

export type OrganizationInput = z.infer<typeof organizationSchema>;
