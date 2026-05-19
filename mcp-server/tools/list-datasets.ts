import { z } from "zod";

import { prisma } from "@/lib/db";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { createResultCache } from "../cache";
import { cacheKey } from "../cache";
import { withToolErrorHandling } from "./helpers";

const inputShape = {
  query: z.string().max(200).optional(),
  themes: z.array(z.string().min(1)).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).max(10_000).optional(),
} as const;

export function registerListDatasets(
  server: McpServer,
  cache: ReturnType<typeof createResultCache>,
) {
  server.registerTool(
    "list_datasets",
    {
      title: "List published datasets",
      description:
        "List published datasets with optional full-text query and theme filter.",
      inputSchema: inputShape,
    },
    async (args) =>
      withToolErrorHandling("list_datasets", args, () =>
        cache.through(cacheKey("list_datasets", args), () => run(args)),
      ),
  );
}

async function run(args: {
  query?: string;
  themes?: string[];
  limit?: number;
  offset?: number;
}) {
  const limit = args.limit ?? 20;
  const offset = args.offset ?? 0;
  const q = args.query?.trim();

  const where: Record<string, unknown> = {
    status: "published",
    deletedAt: null,
  };
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
    ];
  }
  if (args.themes && args.themes.length > 0) {
    where.themes = { some: { theme: { slug: { in: args.themes } } } };
  }

  const [rows, totalCount] = await Promise.all([
    prisma.dataset.findMany({
      where,
      orderBy: { modified: "desc" },
      skip: offset,
      take: limit,
      include: {
        publisher: { select: { name: true } },
        themes: { include: { theme: { select: { slug: true } } } },
        keywords: { select: { keyword: true } },
        _count: { select: { distributions: true } },
      },
    }),
    prisma.dataset.count({ where }),
  ]);

  return {
    datasets: rows.map((d) => ({
      id: d.id,
      identifier: d.identifier,
      title: d.title,
      description: d.description,
      themes: d.themes.map((t) => t.theme.slug),
      keywords: d.keywords.map((k) => k.keyword),
      publisher: d.publisher.name,
      modified: d.modified.toISOString(),
      resourceCount: d._count.distributions,
    })),
    totalCount,
    hasMore: offset + rows.length < totalCount,
  };
}
