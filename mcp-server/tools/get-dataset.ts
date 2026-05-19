import { z } from "zod";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { createResultCache } from "../cache";
import { cacheKey } from "../cache";
import { loadPublishedDataset, withToolErrorHandling } from "./helpers";

const inputShape = {
  datasetId: z.string().min(1),
} as const;

export function registerGetDataset(
  server: McpServer,
  cache: ReturnType<typeof createResultCache>,
) {
  server.registerTool(
    "get_dataset",
    {
      title: "Get a dataset",
      description:
        "Full metadata for one published dataset, including all resources and per-column flags.",
      inputSchema: inputShape,
    },
    async (args) =>
      withToolErrorHandling("get_dataset", args, () =>
        cache.through(cacheKey("get_dataset", args), () => run(args.datasetId)),
      ),
  );
}

async function run(idOrSlug: string) {
  const dataset = await loadPublishedDataset(idOrSlug);

  return {
    id: dataset.id,
    identifier: dataset.identifier,
    title: dataset.title,
    description: dataset.description,
    themes: dataset.themes.map((t) => t.theme.slug),
    keywords: dataset.keywords.map((k) => k.keyword),
    publisher: dataset.publisher.name,
    contactPoint: {
      name: dataset.contactName ?? dataset.publisher.name,
      ...(dataset.contactEmail ? { email: dataset.contactEmail } : {}),
    },
    license: dataset.license ?? "",
    ...(dataset.temporal ? { temporal: dataset.temporal } : {}),
    ...(dataset.spatial ? { spatial: dataset.spatial } : {}),
    modified: dataset.modified.toISOString(),
    resources: dataset.distributions.map((dist) => ({
      id: dist.id,
      name: dist.title ?? dist.fileName ?? dist.id,
      ...(dist.description ? { description: dist.description } : {}),
      mediaType: dist.mediaType ?? "",
      ...(dist.rowCount != null ? { rowCount: dist.rowCount } : {}),
      ...(dist.downloadURL ? { downloadUrl: dist.downloadURL } : {}),
      queryable: dist.parquetPath != null,
      columns: (dist.dataDictionary?.fields ?? []).map((f) => ({
        name: f.name,
        type: f.type,
        ...(f.title ? { title: f.title } : {}),
        ...(f.description ? { description: f.description } : {}),
        filterable: f.filterable,
        aggregatable: f.aggregatable,
        isPii: f.isPii,
        isGeometry: f.isGeometry,
      })),
    })),
  };
}
