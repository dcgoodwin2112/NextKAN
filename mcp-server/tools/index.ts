import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { createResultCache } from "../cache";

import { registerAggregateDataset } from "./aggregate-dataset";
import { registerGetDataset } from "./get-dataset";
import { registerGetSchema } from "./get-schema";
import { registerListDatasets } from "./list-datasets";
import { registerQueryDataset } from "./query-dataset";
import { registerSampleDataset } from "./sample-dataset";
import { registerUpdateDatasetDescription } from "./update-dataset-description";

type Cache = ReturnType<typeof createResultCache>;

/** Register the read-only tools that are always available, including to
 *  anonymous (unauthenticated) clients. Calling these tools never mutates
 *  state and never exposes PII unless `includePii: true` is passed. */
export function registerPublicTools(server: McpServer, cache: Cache): void {
  registerListDatasets(server, cache);
  registerGetDataset(server, cache);
  registerGetSchema(server, cache);
  registerQueryDataset(server, cache);
  registerAggregateDataset(server, cache);
  registerSampleDataset(server, cache);
}

/** Register the admin-tier tools. Only called by `createMcpServer` when the
 *  request was authenticated with an `admin`-scoped bearer token. These tools
 *  may mutate state; each one also calls `requireScope("admin")` internally
 *  as defense-in-depth. */
export function registerAdminTools(server: McpServer, cache: Cache): void {
  registerUpdateDatasetDescription(server, cache);
}
