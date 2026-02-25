import { z } from "zod";

export const settingsUpdateSchema = z.object({
  SITE_NAME: z.string().min(1).max(200).optional(),
  SITE_DESCRIPTION: z.string().max(500).optional(),
  SITE_URL: z.string().url().optional(),
  SITE_LOGO: z.string().max(500).optional(),
  HERO_TITLE: z.string().max(200).optional(),
  HERO_DESCRIPTION: z.string().max(500).optional(),
  ENABLE_COMMENTS: z.enum(["true", "false"]).optional(),
  COMMENT_MODERATION: z.enum(["true", "false"]).optional(),
  ENABLE_WORKFLOW: z.enum(["true", "false"]).optional(),
  ENABLE_PLUGINS: z.enum(["true", "false"]).optional(),
  DCAT_US_VERSION: z.enum(["v1.1", "v3.0"]).optional(),
  HARVEST_API_KEY: z.string().max(500).optional(),
});

export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>;
