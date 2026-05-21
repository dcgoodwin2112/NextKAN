import { AsyncLocalStorage } from "async_hooks";

import type { McpTokenAuth } from "@/lib/services/api-tokens";

/** Per-request auth context. `null` means the request was anonymous (no
 *  Authorization header). Populated by `mcp-server/middleware/auth.ts` and
 *  consumed by the rate-limit middleware, the tool registry (to decide which
 *  tools to register for this request), and individual admin tool handlers. */
export type McpAuthContext = McpTokenAuth;

export const mcpAuthContext = new AsyncLocalStorage<McpAuthContext | null>();

/** Resolve the current request's auth context. Returns `null` if the request
 *  is anonymous or if called outside of a request scope (e.g. in test setup). */
export function currentAuth(): McpAuthContext | null {
  return mcpAuthContext.getStore() ?? null;
}
