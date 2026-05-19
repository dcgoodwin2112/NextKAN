import { serve } from "@hono/node-server";

import { withDuckDb } from "@/lib/duckdb";

import { logger } from "./logger";
import { buildApp } from "./transport";

const PORT = parseInt(process.env.NEXTKAN_MCP_PORT ?? "3001", 10);

// One-shot startup readiness probe. We don't crash on failure — the operator
// gets a 503 from `/health` instead, which a load balancer can act on. If
// DuckDB recovers (e.g. transient resource issue), the next process restart
// re-probes. Keeping this as a single check avoids per-request probe cost.
let duckDbReady = false;
async function probeDuckDb(): Promise<void> {
  try {
    await withDuckDb(async (conn) => {
      await conn.run("SELECT 1");
    });
    duckDbReady = true;
    logger.info("duckdb readiness probe ok");
  } catch (err) {
    duckDbReady = false;
    logger.warn({ err }, "duckdb readiness probe failed; /health will return 503");
  }
}

const { app } = buildApp({ getDuckDbReady: () => duckDbReady });

void probeDuckDb();

serve(
  {
    fetch: app.fetch,
    port: PORT,
  },
  ({ port }) => {
    logger.info({ port }, "nextkan mcp server listening");
  },
);
