import crypto from "crypto";
import { prisma } from "@/lib/db";
import { silentCatch } from "@/lib/utils/log";

const TOKEN_PREFIX = "nkan_";

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

export async function validateTokenFromHeader(
  authHeader: string | null
): Promise<{
  id: string;
  email?: string;
  name?: string | null;
  role: string;
  organizationId?: string | null;
} | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;

  const plaintext = authHeader.slice(7);
  if (!plaintext.startsWith(TOKEN_PREFIX)) return null;

  const hash = hashToken(plaintext);
  const token = await prisma.apiToken.findUnique({
    where: { tokenHash: hash },
    include: { user: true },
  });

  if (!token) return null;

  // Check expiry
  if (token.expiresAt && token.expiresAt < new Date()) return null;

  // Update lastUsedAt (fire-and-forget)
  silentCatch(prisma.apiToken
    .update({
      where: { id: token.id },
      data: { lastUsedAt: new Date() },
    }), "api-token:lastUsedAt");

  return {
    id: token.user.id,
    email: token.user.email,
    name: token.user.name,
    role: token.user.role,
    organizationId: token.user.organizationId,
  };
}
