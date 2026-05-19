import { serve } from "@hono/node-server";

import { logger } from "./logger";
import { buildApp } from "./transport";

const PORT = parseInt(process.env.NEXTKAN_MCP_PORT ?? "3001", 10);

const { app } = buildApp();

serve(
  {
    fetch: app.fetch,
    port: PORT,
  },
  ({ port }) => {
    logger.info({ port }, "nextkan mcp server listening");
  },
);
