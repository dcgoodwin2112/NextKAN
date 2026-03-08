import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateToken } from "@/lib/services/api-tokens";
import { createTokenSchema, type CreateTokenInput } from "@/lib/schemas/api-token";
import { hasPermission } from "@/lib/auth/roles";
import { logActivity } from "@/lib/services/activity";
import { silentCatch } from "@/lib/utils/log";

async function requireTokenPermission(userId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const sessionUserId = (session.user as any).id as string;
  const role = (session.user as any).role as string;

  // Self-management or user:manage permission
  if (sessionUserId !== userId && !hasPermission(role, "user:manage")) {
    throw new Error("Unauthorized");
  }

  return session;
}

export async function createToken(userId: string, input: CreateTokenInput) {
  const session = await requireTokenPermission(userId);
  const validated = createTokenSchema.parse(input);
  const { plaintext, hash, prefix } = generateToken();

  const token = await prisma.apiToken.create({
    data: {
      userId,
      name: validated.name,
      tokenHash: hash,
      prefix,
      expiresAt: validated.expiresAt || null,
    },
  });

  silentCatch(logActivity({
    action: "created",
    entityType: "api_token",
    entityId: token.id,
    entityName: validated.name,
    userId: (session.user as any).id,
    userName: session.user.name,
  }), "activity");

  return {
    id: token.id,
    name: token.name,
    prefix: token.prefix,
    expiresAt: token.expiresAt,
    createdAt: token.createdAt,
    plaintext,
  };
}

export async function listTokens(userId: string) {
  await requireTokenPermission(userId);

  return prisma.apiToken.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      prefix: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function revokeToken(tokenId: string) {
  const token = await prisma.apiToken.findUnique({
    where: { id: tokenId },
  });
  if (!token) throw new Error("Token not found");

  const session = await requireTokenPermission(token.userId);

  await prisma.apiToken.delete({ where: { id: tokenId } });

  silentCatch(logActivity({
    action: "revoked",
    entityType: "api_token",
    entityId: tokenId,
    entityName: token.name,
    userId: (session.user as any).id,
    userName: session.user.name,
  }), "activity");
}
