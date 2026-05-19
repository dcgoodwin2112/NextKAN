import { z } from "zod";

import { prisma } from "@/lib/db";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { createResultCache } from "../cache";
import { cacheKey } from "../cache";
import { parseJsonArray, withToolErrorHandling } from "./helpers";
import { toolError } from "./errors";

const inputShape = {
  resourceId: z.string().min(1),
} as const;

export function registerGetSchema(
  server: McpServer,
  cache: ReturnType<typeof createResultCache>,
) {
  server.registerTool(
    "get_schema",
    {
      title: "Get column schema for a resource",
      description:
        "Returns the column-by-column schema and statistics for a single resource (Distribution).",
      inputSchema: inputShape,
    },
    async (args) =>
      withToolErrorHandling("get_schema", args, () =>
        cache.through(cacheKey("get_schema", args), () => run(args.resourceId)),
      ),
  );
}

async function run(resourceId: string) {
  const distribution = await prisma.distribution.findUnique({
    where: { id: resourceId },
    include: {
      dataset: { select: { status: true, deletedAt: true } },
      dataDictionary: {
        include: { fields: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });
  if (
    !distribution ||
    distribution.dataset.status !== "published" ||
    distribution.dataset.deletedAt
  ) {
    throw toolError({
      errorType: "RESOURCE_NOT_FOUND",
      message: `Resource not found: ${resourceId}`,
    });
  }

  const fields = distribution.dataDictionary?.fields ?? [];

  return {
    resourceId: distribution.id,
    ...(distribution.rowCount != null ? { rowCount: distribution.rowCount } : {}),
    columns: fields.map((f, i) => ({
      name: f.name,
      position: f.sortOrder ?? i,
      type: f.type,
      ...(f.title ? { title: f.title } : {}),
      ...(f.description ? { description: f.description } : {}),
      nullable: (f.nullCount ?? 0) > 0,
      ...(f.distinctCount != null ? { distinctCount: f.distinctCount } : {}),
      ...(f.min != null ? { min: f.min } : {}),
      ...(f.max != null ? { max: f.max } : {}),
      ...(parseJsonArray(f.sampleValues) ? { sampleValues: parseJsonArray(f.sampleValues) } : {}),
      ...(parseJsonArray(f.enumValues) ? { enumValues: parseJsonArray(f.enumValues) } : {}),
      filterable: f.filterable,
      aggregatable: f.aggregatable,
      isPii: f.isPii,
      isGeometry: f.isGeometry,
      ...(f.crs ? { crs: f.crs } : {}),
    })),
  };
}
