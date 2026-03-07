import { z } from "zod";

export const createTokenSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  expiresAt: z.coerce.date().optional(),
});

export type CreateTokenInput = z.infer<typeof createTokenSchema>;
