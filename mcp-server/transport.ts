import { Hono } from "hono";
import { cors } from "hono/cors";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { createResultCache } from "./cache";
import { logger } from "./logger";
import { createConcurrencyLimiter } from "./middleware/concurrency";
import { createRateLimit } from "./middleware/rate-limit";
import { createMcpServer, SERVER_NAME, SERVER_VERSION } from "./server";

export interface BuildAppOptions {
  rateLimit?: ReturnType<typeof createRateLimit>;
  concurrency?: ReturnType<typeof createConcurrencyLimiter>;
  cache?: ReturnType<typeof createResultCache>;
}

/**
 * Construct the Hono application. Singletons (rate limiter, concurrency
 * limiter, result cache) can be injected for tests; otherwise sensible
 * defaults are wired up. The `/mcp` route runs the Streamable HTTP transport
 * in stateless mode — every request creates its own `McpServer` + transport
 * pair, so no per-session state is retained.
 */
export function buildApp(opts: BuildAppOptions = {}) {
  const rateLimit = opts.rateLimit ?? createRateLimit();
  const concurrency = opts.concurrency ?? createConcurrencyLimiter();
  const cache = opts.cache ?? createResultCache();

  const app = new Hono();

  // Open data + anonymous-read agent endpoints can be called from any origin
  // (including the admin "Agent preview" panel running on a different port).
  app.use(
    "*",
    cors({
      origin: "*",
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: [
        "Content-Type",
        "Accept",
        "MCP-Protocol-Version",
        "Authorization",
      ],
      exposeHeaders: ["MCP-Session-Id"],
      maxAge: 600,
    }),
  );

  app.get("/health", (c) =>
    c.json({
      status: "ok",
      service: SERVER_NAME,
      version: SERVER_VERSION,
    }),
  );

  app.use("/mcp", rateLimit.middleware);
  app.use("/mcp", concurrency.middleware);

  app.all("/mcp", async (c) => {
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      // Stateless single-shot mode: agents make one request and expect a
      // single JSON-RPC response. JSON responses are simpler than SSE here.
      enableJsonResponse: true,
    });

    const server = createMcpServer(cache);
    try {
      await server.connect(transport);
      const response = await transport.handleRequest(c.req.raw);
      return response;
    } catch (err) {
      logger.error({ err }, "mcp request handler failed");
      return c.json(
        {
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        },
        500,
      );
    } finally {
      await transport.close().catch(() => {});
      await server.close().catch(() => {});
    }
  });

  return { app, rateLimit, concurrency, cache };
}
