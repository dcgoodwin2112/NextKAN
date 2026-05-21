import { z } from "zod";

/** Maximum allowed token lifetime. Tokens with no expiry are explicit
 *  opt-ins; tokens that do specify an expiry are bounded to a year so a
 *  forgotten token can't live forever. */
const MAX_TOKEN_LIFETIME_MS = 365 * 24 * 60 * 60 * 1000;

export const createTokenSchema = z
  .object({
    name: z.string().min(1).max(100).trim(),
    // "read" — anonymous-equivalent access; safe default. Required for
    // admin-tier MCP tools is "admin".
    scope: z.enum(["read", "admin"]).default("read"),
    expiresAt: z.coerce.date().optional(),
  })
  .refine(
    (data) =>
      !data.expiresAt ||
      data.expiresAt.getTime() - Date.now() <= MAX_TOKEN_LIFETIME_MS,
    {
      path: ["expiresAt"],
      message: "Token expiry must be no more than 1 year from now.",
    },
  );

/** Input shape callers pass *before* parsing — `scope` may be omitted and
 *  defaults to `"read"`. Use `z.output<typeof createTokenSchema>` if you
 *  need the post-parse shape with defaults filled in. */
export type CreateTokenInput = z.input<typeof createTokenSchema>;
