import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { createResultCache } from "./cache";
import { logger } from "./logger";
import { registerAllTools } from "./tools";

const SERVER_NAME = "nextkan-mcp";
const SERVER_VERSION = "0.1.0";

/**
 * Build a fresh `McpServer` for one request. Stateless mode: a new instance
 * is created per HTTP call so concurrent requests don't share session state.
 * The shared result cache is injected so cached responses span requests.
 */
export function createMcpServer(
  cache: ReturnType<typeof createResultCache>,
): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  registerAllTools(server, cache);
  logger.debug({ server: SERVER_NAME }, "mcp server constructed");
  return server;
}

export { SERVER_NAME, SERVER_VERSION };
