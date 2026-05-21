import type { MiddlewareHandler } from "hono";

import { validateMcpToken } from "@/lib/services/api-tokens";

import { mcpAuthContext, type McpAuthContext } from "../context";
import { logger } from "../logger";

/** JSON-RPC error code for authentication failures on the `/mcp` endpoint.
 *  Sits in the JSON-RPC "Server error" range (-32000..-32099), which is
 *  reserved for implementation-defined errors. `-32003` is free in the
 *  NextKAN error table (see `docs/mcp-server-spec.md` → Error response
 *  format); `-32001` and `-32002` are taken by `QUERY_TIMEOUT` and
 *  `MEMORY_LIMIT_EXCEEDED`. */
const ERROR_CODE_UNAUTHORIZED = -32003;

export interface AuthMiddlewareOptions {
  /** Override token validator for tests. Default: `validateMcpToken` from the
   *  shared service. */
  validate?: typeof validateMcpToken;
}

/** Hono middleware that resolves a bearer token from the `Authorization`
 *  header and populates the request-scoped `mcpAuthContext`.
 *
 *  Behavior:
 *  - No `Authorization` header (or empty value): context = `null`, request
 *    proceeds as anonymous. Downstream tools that require auth must check.
 *  - Header present and resolves to a valid token: context = `{ user, scope,
 *    rateLimitMultiplier }`, request proceeds.
 *  - Header present but does not resolve: 401 with a JSON-RPC `-32001`
 *    error envelope. Do not downgrade to anonymous — partial auth is a bug
 *    on the caller's side and should surface loudly.
 *
 *  Wraps `next()` in `mcpAuthContext.run()` so subsequent middleware (rate
 *  limit) and MCP tool handlers read a consistent value via
 *  `mcpAuthContext.getStore()`. */
export function createAuthMiddleware(
  opts: AuthMiddlewareOptions = {},
): MiddlewareHandler {
  const validate = opts.validate ?? validateMcpToken;

  return async (c, next) => {
    const header = c.req.header("authorization");
    const trimmed = header?.trim();

    if (!trimmed) {
      // Anonymous. Subsequent middleware and the tool registry will gate
      // admin tools out for this request.
      return mcpAuthContext.run(null, async () => {
        await next();
      });
    }

    const auth = await validate(trimmed);
    if (!auth) {
      // Never log the token plaintext, hash, or even prefix — a leak in logs
      // is as bad as a leak in transport. The header *length* is the only
      // diagnostic worth keeping; correlate failures with client behavior.
      logger.warn(
        { headerLength: trimmed.length, ip: clientIp(c) },
        "mcp auth: rejected bearer",
      );
      return c.json(
        {
          jsonrpc: "2.0",
          id: null,
          error: {
            code: ERROR_CODE_UNAUTHORIZED,
            message: "Invalid bearer token",
            data: { errorType: "UNAUTHORIZED" },
          },
        },
        401,
      );
    }

    logger.info(
      {
        userId: auth.user.id,
        scope: auth.scope,
        rateLimitMultiplier: auth.rateLimitMultiplier,
      },
      "mcp auth: bearer accepted",
    );

    return mcpAuthContext.run(auth satisfies McpAuthContext, async () => {
      await next();
    });
  };
}

/** Best-effort client IP for log correlation. Mirrors the rate limiter's
 *  resolution so the same IP appears in both signals. */
function clientIp(c: Parameters<MiddlewareHandler>[0]): string {
  const fwd = c.req.header("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return c.req.header("x-real-ip") ?? "unknown";
}
