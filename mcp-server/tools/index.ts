import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { createResultCache } from "../cache";

import { registerAggregateDataset } from "./aggregate-dataset";
import { registerGetDataset } from "./get-dataset";
import { registerGetSchema } from "./get-schema";
import { registerListDatasets } from "./list-datasets";
import { registerQueryDataset } from "./query-dataset";
import { registerSampleDataset } from "./sample-dataset";

/** Register all six core MCP tools on the given server. */
export function registerAllTools(
  server: McpServer,
  cache: ReturnType<typeof createResultCache>,
): void {
  registerListDatasets(server, cache);
  registerGetDataset(server, cache);
  registerGetSchema(server, cache);
  registerQueryDataset(server, cache);
  registerAggregateDataset(server, cache);
  registerSampleDataset(server, cache);
}
