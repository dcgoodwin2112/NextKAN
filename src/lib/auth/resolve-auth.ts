import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { validateTokenFromHeader } from "@/lib/services/api-tokens";
import type { TokenUser } from "./token-context";

export type ResolvedAuth = {
  user: TokenUser;
  fromToken: boolean;
} | null;

export async function resolveAuth(
  request: NextRequest
): Promise<ResolvedAuth> {
  // Try bearer token first
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const tokenUser = await validateTokenFromHeader(authHeader);
    if (tokenUser) {
      return { user: tokenUser, fromToken: true };
    }
    // Invalid/expired token — don't fall back to session
    return null;
  }

  // Fall back to session auth
  const session = await auth();
  if (!session?.user) return null;

  return {
    user: {
      id: (session.user as any).id,
      email: session.user.email ?? undefined,
      name: session.user.name,
      role: (session.user as any).role,
      organizationId: (session.user as any).organizationId,
    },
    fromToken: false,
  };
}
