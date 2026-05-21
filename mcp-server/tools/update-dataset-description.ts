import { ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/services/activity";
import { silentCatch } from "@/lib/utils/log";

import type { createResultCache } from "../cache";
import { toolError } from "./errors";
import { requireScope, withToolErrorHandling } from "./helpers";

const inputShape = {
  datasetId: z.string().min(1),
  description: z.string().min(1).max(10_000),
} as const;

/** First admin-tier tool. Updates a single dataset's `description` field.
 *  Smallest realistic mutation: one column, one table, no file I/O, no
 *  cache-invalidation complexity beyond a global reset. Exercises the full
 *  auth → context → scope check → Prisma write → activity log → cache
 *  invalidation → response path so the rest of Phase 4 has a working
 *  template. */
export function registerUpdateDatasetDescription(
  server: McpServer,
  cache: ReturnType<typeof createResultCache>,
) {
  server.registerTool(
    "update_dataset_description",
    {
      title: "Update a dataset's description",
      description:
        "Replace the description of one dataset. Requires an `admin`-scoped bearer token. Returns the previous description so the caller can confirm what changed.",
      inputSchema: inputShape,
    },
    async (args) =>
      withToolErrorHandling("update_dataset_description", args, () =>
        run(args.datasetId, args.description, cache),
      ),
  );
}

async function run(
  datasetId: string,
  description: string,
  cache: ReturnType<typeof createResultCache>,
) {
  const auth = requireScope("admin");

  // Look up the dataset directly rather than via `loadPublishedDataset` so
  // admins can edit drafts too. Skip soft-deleted rows.
  const dataset = await prisma.dataset.findFirst({
    where: {
      OR: [{ id: datasetId }, { slug: datasetId }, { identifier: datasetId }],
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      description: true,
      publisherId: true,
    },
  });

  if (!dataset) {
    throw toolError({
      errorType: "DATASET_NOT_FOUND",
      message: `Dataset not found: ${datasetId}`,
    });
  }

  // Org-scoping: global `admin` role bypasses the org check; everyone else
  // can only edit datasets whose publisher matches their organization. The
  // user's role + organizationId come from the User row (resolved by the
  // auth middleware via `validateMcpToken`).
  if (auth.user.role !== "admin") {
    if (!auth.user.organizationId || auth.user.organizationId !== dataset.publisherId) {
      throw toolError({
        errorType: "FORBIDDEN",
        message:
          "Your token's organization does not match this dataset's publisher.",
        code: ErrorCode.InvalidRequest,
      });
    }
  }

  // No-op short-circuit: identical description means we skip the write,
  // the activity log entry, and the cache reset. Saves a churned cache
  // when an agent issues an idempotent update.
  if (dataset.description === description) {
    return {
      ok: true,
      datasetId: dataset.id,
      modified: false as const,
      before: dataset.description,
    };
  }

  const updated = await prisma.dataset.update({
    where: { id: dataset.id },
    data: {
      description,
      modified: new Date(),
    },
    select: { id: true, modified: true },
  });

  // Fire-and-forget activity log so a logging failure never breaks the
  // mutation response. Uses the same convention as Server Action callers
  // (`dataset:updated`, entityType `dataset`, JSON `details`).
  silentCatch(
    logActivity({
      action: "dataset:updated",
      entityType: "dataset",
      entityId: dataset.id,
      entityName: dataset.title,
      userId: auth.user.id,
      userName: auth.user.name ?? auth.user.email ?? null,
      details: {
        source: "mcp",
        field: "description",
        from: dataset.description,
        to: description,
      },
    }),
    "update_dataset_description:activity-log",
  );

  // Flush the per-process result cache so cached `get_dataset` /
  // `list_datasets` payloads from before the write don't survive. Whole-
  // cache reset is acceptable for v1 — mutations are rare and the TTL is
  // 60 s anyway. A per-key `deleteByPrefix` is tracked as follow-up.
  cache.reset();

  return {
    ok: true,
    datasetId: updated.id,
    modified: updated.modified.toISOString(),
    before: dataset.description,
  };
}
