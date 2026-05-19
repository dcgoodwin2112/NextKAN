import { z } from "zod";

import {
  escapeSqlLiteral,
  relationForPath,
  withDuckDb,
} from "@/lib/duckdb";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { createResultCache } from "../cache";
import { cacheKey } from "../cache";
import { filterSchema, orderBySchema } from "./schemas";
import {
  loadResourceWithColumns,
  resourceParquetPath,
  withToolErrorHandling,
  type ResourceWithColumns,
} from "./helpers";
import {
  buildOrderClause,
  buildProjection,
  buildWhereClause,
  type Filter,
  type OrderBy,
} from "./sql-builder";

const inputShape = {
  resourceId: z.string().min(1),
  columns: z.array(z.string().min(1)).optional(),
  filters: z.array(filterSchema).optional(),
  orderBy: z.array(orderBySchema).optional(),
  limit: z.number().int().min(1).optional(),
  offset: z.number().int().min(0).optional(),
  includePii: z.boolean().optional(),
} as const;

const MAX_LIMIT = 10_000;
const MAX_OFFSET_PLUS_LIMIT = 100_000;

export function registerQueryDataset(
  server: McpServer,
  cache: ReturnType<typeof createResultCache>,
) {
  server.registerTool(
    "query_dataset",
    {
      title: "Query a resource",
      description:
        "Retrieve rows from a queryable resource (Parquet) with projection, filters, ordering and pagination.",
      inputSchema: inputShape,
    },
    async (args) =>
      withToolErrorHandling("query_dataset", args, () =>
        cache.through(cacheKey("query_dataset", args), () => run(args)),
      ),
  );
}

async function run(args: {
  resourceId: string;
  columns?: string[];
  filters?: Filter[];
  orderBy?: OrderBy[];
  limit?: number;
  offset?: number;
  includePii?: boolean;
}) {
  const resource = await loadResourceWithColumns(args.resourceId);
  const parquetPath = resourceParquetPath(resource);
  const includePii = args.includePii ?? false;

  const warnings: string[] = [];
  let limit = args.limit ?? 100;
  if (limit > MAX_LIMIT) {
    warnings.push(`limit clamped to ${MAX_LIMIT}`);
    limit = MAX_LIMIT;
  }
  const offset = args.offset ?? 0;
  if (offset + limit > MAX_OFFSET_PLUS_LIMIT) {
    limit = Math.max(1, MAX_OFFSET_PLUS_LIMIT - offset);
    warnings.push(`offset + limit clamped to ${MAX_OFFSET_PLUS_LIMIT}`);
  }

  const projection = buildProjection(resource, args.columns, includePii);
  const where = buildWhereClause(resource, args.filters);
  const order = buildOrderClause(resource, args.orderBy);

  const sql = assembleSql({
    projection,
    parquetPath,
    where,
    order,
    limit: limit + 1,
    offset,
  });

  const rows = await runSelect(sql);
  const truncated = rows.length > limit;
  const trimmed = truncated ? rows.slice(0, limit) : rows;

  return {
    rows: trimmed,
    rowCount: trimmed.length,
    truncated,
    ...(warnings.length ? { warnings } : {}),
  };
}

function assembleSql(parts: {
  projection: string;
  parquetPath: string;
  where: string | null;
  order: string | null;
  limit: number;
  offset: number;
}): string {
  const relation = relationForPath(parts.parquetPath);
  const clauses = [
    `SELECT ${parts.projection}`,
    `FROM ${relation}`,
  ];
  if (parts.where) clauses.push(`WHERE ${parts.where}`);
  if (parts.order) clauses.push(`ORDER BY ${parts.order}`);
  clauses.push(`LIMIT ${parts.limit} OFFSET ${parts.offset}`);
  return clauses.join(" ");
}

async function runSelect(sql: string): Promise<Record<string, unknown>[]> {
  return withDuckDb(async (conn) => {
    const result = await conn.run(sql);
    return await result.getRowObjectsJson();
  });
}

export const __test_only = {
  resourceParquetPath,
  assembleSql,
  buildWhereClause: (resource: ResourceWithColumns, filters?: Filter[]) =>
    buildWhereClause(resource, filters),
  escapeSqlLiteral,
};
