import { z } from "zod";

import { escapeSqlIdentifier, relationForPath, withDuckDb } from "@/lib/duckdb";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { createResultCache } from "../cache";
import { cacheKey } from "../cache";
import {
  defaultProjectionColumns,
  loadResourceWithColumns,
  resourceParquetPath,
  withToolErrorHandling,
} from "./helpers";

const inputShape = {
  resourceId: z.string().min(1),
  n: z.number().int().min(1).max(100).optional(),
  includePii: z.boolean().optional(),
} as const;

export function registerSampleDataset(
  server: McpServer,
  cache: ReturnType<typeof createResultCache>,
) {
  server.registerTool(
    "sample_dataset",
    {
      title: "Sample N random rows",
      description:
        "Random sample of rows from a queryable resource. Useful for 'what does this data look like' exploration.",
      inputSchema: inputShape,
    },
    async (args) =>
      withToolErrorHandling("sample_dataset", args, () =>
        cache.through(cacheKey("sample_dataset", args), () => run(args)),
      ),
  );
}

async function run(args: { resourceId: string; n?: number; includePii?: boolean }) {
  const resource = await loadResourceWithColumns(args.resourceId);
  const parquetPath = resourceParquetPath(resource);
  const n = args.n ?? 10;
  const includePii = args.includePii ?? false;

  const visible = defaultProjectionColumns(resource, includePii);
  const projection =
    visible.length === 0
      ? "*"
      : visible.map((c) => escapeSqlIdentifier(c.name)).join(", ");

  const sql = `SELECT ${projection} FROM ${relationForPath(parquetPath)} USING SAMPLE ${n} ROWS`;
  const rows = await withDuckDb(async (conn) => {
    const result = await conn.run(sql);
    return await result.getRowObjectsJson();
  });

  return { rows };
}
