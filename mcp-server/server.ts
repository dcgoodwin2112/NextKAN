import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { createResultCache } from "./cache";
import type { McpAuthContext } from "./context";
import { logger } from "./logger";
import { registerAdminTools, registerPublicTools } from "./tools";

const SERVER_NAME = "nextkan-mcp";
const SERVER_VERSION = "0.1.0";

/**
 * Build a fresh `McpServer` for one request. Stateless mode: a new instance
 * is created per HTTP call so concurrent requests don't share session state.
 * The shared result cache is injected so cached responses span requests.
 *
 * `auth` is the per-request auth context resolved by the auth middleware
 * (`null` for anonymous requests). Public tools are always registered. Admin
 * tools are only registered when `auth.scope === "admin"` — anonymous and
 * `read`-scoped clients do not see admin tools in `tools/list` and cannot
 * invoke them via `tools/call` (the SDK rejects unknown tool names).
 */
export function createMcpServer(
  cache: ReturnType<typeof createResultCache>,
  auth: McpAuthContext | null = null,
): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  registerPublicTools(server, cache);
  if (auth?.scope === "admin") {
    registerAdminTools(server, cache);
  }

  logger.debug(
    { server: SERVER_NAME, scope: auth?.scope ?? "anonymous" },
    "mcp server constructed",
  );
  return server;
}

export { SERVER_NAME, SERVER_VERSION };
