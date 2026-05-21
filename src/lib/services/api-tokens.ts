import crypto from "crypto";
import { prisma } from "@/lib/db";
import { silentCatch } from "@/lib/utils/log";

const TOKEN_PREFIX = "nkan_";

export type TokenUserShape = {
  id: string;
  email?: string;
  name?: string | null;
  role: string;
  organizationId?: string | null;
};

/** Result of an MCP-side bearer token lookup. Carries the token-level
 *  attributes (`scope`, `rateLimitMultiplier`) that the MCP middleware needs
 *  to gate admin tools and meter requests. Admin-REST callers continue to use
 *  `validateTokenFromHeader`, which intentionally hides these fields. */
export type McpTokenAuth = {
  user: TokenUserShape;
  scope: string;
  rateLimitMultiplier: number;
};

export function generateToken(): {
  plaintext: string;
  hash: string;
  prefix: string;
} {
  const random = crypto.randomBytes(32).toString("hex");
  const plaintext = TOKEN_PREFIX + random;
  const hash = hashToken(plaintext);
  const prefix = plaintext.slice(0, 9); // "nkan_" + first 4 hex chars
  return { plaintext, hash, prefix };
}

export function hashToken(plaintext: string): string {
  return crypto.createHash("sha256").update(plaintext).digest("hex");
}

/** Look up a bearer token and return the owning user. Used by the admin REST
 *  surface via `resolveAuth`. Returns null for missing, malformed, unknown,
 *  or expired tokens. */
export async function validateTokenFromHeader(
  authHeader: string | null
): Promise<TokenUserShape | null> {
  const result = await lookupBearerToken(authHeader);
  if (!result) return null;
  return shapeUser(result.token.user);
}

/** MCP-side token lookup. Returns the user plus token-level `scope` and
 *  `rateLimitMultiplier`. Returns null for missing, malformed, unknown, or
 *  expired tokens — the MCP middleware treats null as "anonymous" for tools
 *  that allow it and as 401 for tools that require auth. */
export async function validateMcpToken(
  authHeader: string | null
): Promise<McpTokenAuth | null> {
  const result = await lookupBearerToken(authHeader);
  if (!result) return null;
  return {
    user: shapeUser(result.token.user),
    scope: result.token.scope,
    rateLimitMultiplier: result.token.rateLimitMultiplier,
  };
}

/** Shared lookup. Validates header format, looks the hash up, checks expiry,
 *  and fire-and-forgets the `lastUsedAt` update. Returns the raw token row
 *  (with `user` included) so callers can pick fields. */
async function lookupBearerToken(
  authHeader: string | null,
): Promise<{ token: Awaited<ReturnType<typeof findToken>> & object } | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;

  const plaintext = authHeader.slice(7);
  if (!plaintext.startsWith(TOKEN_PREFIX)) return null;

  const hash = hashToken(plaintext);
  const token = await findToken(hash);
  if (!token) return null;
  if (token.expiresAt && token.expiresAt < new Date()) return null;

  silentCatch(
    prisma.apiToken.update({
      where: { id: token.id },
      data: { lastUsedAt: new Date() },
    }),
    "api-token:lastUsedAt",
  );

  return { token };
}

function findToken(hash: string) {
  return prisma.apiToken.findUnique({
    where: { tokenHash: hash },
    include: { user: true },
  });
}

function shapeUser(user: {
  id: string;
  email: string;
  name: string | null;
  role: string;
  organizationId: string | null;
}): TokenUserShape {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organizationId: user.organizationId,
  };
}
