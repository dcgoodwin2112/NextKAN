import { NextRequest, NextResponse } from "next/server";
import { resolveAuth } from "@/lib/auth/resolve-auth";
import { tokenAuthContext } from "@/lib/auth/token-context";

/** Wraps handler to support bearer token auth via AsyncLocalStorage context. */
export async function withTokenAuth(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const resolved = await resolveAuth(request);
  if (resolved?.fromToken) {
    return tokenAuthContext.run(resolved.user, handler);
  }
  return handler();
}
