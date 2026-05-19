import { z } from "zod";

import { escapeSqlIdentifier, relationForPath, withDuckDb } from "@/lib/duckdb";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { createResultCache } from "../cache";
import { cacheKey } from "../cache";
import { toolError } from "./errors";
import { filterSchema, orderBySchema } from "./schemas";
import {
  loadResourceWithColumns,
  requireAggregatable,
  requireFilterable,
  requireNonPii,
  resourceParquetPath,
  withToolErrorHandling,
  type ColumnView,
  type ResourceWithColumns,
} from "./helpers";
import {
  buildOrderClause,
  buildWhereClause,
  type Filter,
  type OrderBy,
} from "./sql-builder";

const NUMERIC_FUNCTIONS = new Set(["sum", "avg", "median", "stddev"]);
const aggregateFunctionEnum = z.enum([
  "count",
  "count_all",
  "count_distinct",
  "sum",
  "avg",
  "min",
  "max",
  "median",
  "stddev",
]);

const metricSchema = z.object({
  column: z.string().min(1).optional(),
  function: aggregateFunctionEnum,
  alias: z.string().min(1).max(60).optional(),
});

const inputShape = {
  resourceId: z.string().min(1),
  groupBy: z.array(z.string().min(1)).min(1).max(5),
  metrics: z.array(metricSchema).min(1),
  filters: z.array(filterSchema).optional(),
  orderBy: z.array(orderBySchema).optional(),
  limit: z.number().int().min(1).optional(),
  includePii: z.boolean().optional(),
} as const;

const MAX_LIMIT = 10_000;

export function registerAggregateDataset(
  server: McpServer,
  cache: ReturnType<typeof createResultCache>,
) {
  server.registerTool(
    "aggregate_dataset",
    {
      title: "Aggregate a resource",
      description:
        "GROUP BY aggregation against a queryable resource. Preferred over query_dataset for analytical questions.",
      inputSchema: inputShape,
    },
    async (args) =>
      withToolErrorHandling("aggregate_dataset", args, () =>
        cache.through(cacheKey("aggregate_dataset", args), () => run(args)),
      ),
  );
}

interface Metric {
  column?: string;
  function:
    | "count"
    | "count_all"
    | "count_distinct"
    | "sum"
    | "avg"
    | "min"
    | "max"
    | "median"
    | "stddev";
  alias?: string;
}

async function run(args: {
  resourceId: string;
  groupBy: string[];
  metrics: Metric[];
  filters?: Filter[];
  orderBy?: OrderBy[];
  limit?: number;
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

  const groupByCols = args.groupBy.map((name) => {
    requireNonPii(resource, name, includePii);
    return requireFilterable(resource, name);
  });
  const metricExprs = args.metrics.map((m) => renderMetric(resource, m, includePii));

  const where = buildWhereClause(resource, args.filters, includePii);
  const order = buildOrderClause(resource, args.orderBy, new Set(metricExprs.map((m) => m.alias)));

  const projectionParts = [
    ...groupByCols.map((c) => escapeSqlIdentifier(c.name)),
    ...metricExprs.map((e) => `${e.expr} AS ${escapeSqlIdentifier(e.alias)}`),
  ];

  const clauses = [
    `SELECT ${projectionParts.join(", ")}`,
    `FROM ${relationForPath(parquetPath)}`,
  ];
  if (where) clauses.push(`WHERE ${where}`);
  clauses.push(
    `GROUP BY ${groupByCols.map((c) => escapeSqlIdentifier(c.name)).join(", ")}`,
  );
  if (order) clauses.push(`ORDER BY ${order}`);
  clauses.push(`LIMIT ${limit}`);

  const sql = clauses.join(" ");

  const rows = await withDuckDb(async (conn) => {
    const result = await conn.run(sql);
    return await result.getRowObjectsJson();
  });

  return {
    groups: rows,
    rowCount: rows.length,
    ...(warnings.length ? { warnings } : {}),
  };
}

function renderMetric(
  resource: ResourceWithColumns,
  metric: Metric,
  includePii: boolean,
): { expr: string; alias: string } {
  if (metric.function === "count_all") {
    const alias = metric.alias ?? "count_all";
    return { expr: "COUNT(*)", alias };
  }

  if (!metric.column) {
    throw toolError({
      errorType: "INVALID_INPUT",
      message: `Metric '${metric.function}' requires a column`,
    });
  }
  requireNonPii(resource, metric.column, includePii);
  const col = requireAggregatable(resource, metric.column);
  assertMetricCompatible(col, metric.function);

  const ident = escapeSqlIdentifier(col.name);
  const alias = metric.alias ?? `${metric.function}_${col.name}`;

  switch (metric.function) {
    case "count":
      return { expr: `COUNT(${ident})`, alias };
    case "count_distinct":
      return { expr: `COUNT(DISTINCT ${ident})`, alias };
    case "sum":
      return { expr: `SUM(${ident})`, alias };
    case "avg":
      return { expr: `AVG(${ident})`, alias };
    case "min":
      return { expr: `MIN(${ident})`, alias };
    case "max":
      return { expr: `MAX(${ident})`, alias };
    case "median":
      return { expr: `MEDIAN(${ident})`, alias };
    case "stddev":
      return { expr: `STDDEV(${ident})`, alias };
  }
}

function assertMetricCompatible(col: ColumnView, fn: Metric["function"]): void {
  if (NUMERIC_FUNCTIONS.has(fn) && col.type !== "integer" && col.type !== "number") {
    throw toolError({
      errorType: "INVALID_INPUT",
      message: `Aggregate function '${fn}' is only valid on numeric columns (got ${col.type} for \`${col.name}\`).`,
    });
  }
}
