// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MiddlewareHandler } from "hono";

import { prismaMock } from "@/__mocks__/prisma";

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

const logActivityMock = vi.fn<(params: unknown) => Promise<void>>(async () => {});
vi.mock("@/lib/services/activity", () => ({
  logActivity: (params: unknown) => logActivityMock(params),
}));

// silentCatch lives in src/lib/utils/log; the real implementation invokes the
// promise and swallows rejection. We keep the real behavior in tests so the
// logActivity mock still runs synchronously enough to be asserted on.

import { mcpAuthContext, type McpAuthContext } from "../context";
import { buildApp } from "../transport";
import { callTool, unpack } from "./test-helpers";

function adminAuth(overrides: Partial<McpAuthContext["user"]> = {}): McpAuthContext {
  return {
    user: {
      id: "user-admin",
      email: "admin@example.com",
      name: "Admin User",
      role: "admin",
      organizationId: null,
      ...overrides,
    },
    scope: "admin",
    rateLimitMultiplier: 1,
  };
}

/** Build a middleware that drops the given auth into the AsyncLocalStorage,
 *  bypassing the real token validator. Equivalent to a successful
 *  validateMcpToken call. */
function authMiddlewareWith(auth: McpAuthContext | null): MiddlewareHandler {
  return async (_c, next) => mcpAuthContext.run(auth, () => next());
}

function makeDataset(overrides: Record<string, unknown> = {}) {
  return {
    id: "ds-1",
    title: "Sales 2024",
    description: "Old description.",
    publisherId: "org-1",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("update_dataset_description tool", () => {
  it("updates the description, logs the activity, and resets the cache (admin role)", async () => {
    prismaMock.dataset.findFirst.mockResolvedValue(makeDataset() as any);
    prismaMock.dataset.update.mockResolvedValue({
      id: "ds-1",
      modified: new Date("2026-05-20T12:00:00Z"),
    } as any);

    // Inject a cache spy so we can prove `reset()` ran exactly once.
    const cacheReset = vi.fn();
    const cache = {
      through: async <T,>(_k: string, run: () => Promise<T>) => run(),
      reset: cacheReset,
      stats: () => ({ size: 0, calculatedSize: 0 }),
    };

    const { app } = buildApp({
      cache: cache as never,
      authMiddleware: authMiddlewareWith(adminAuth()),
    });

    const envelope = await callTool<{
      ok: boolean;
      datasetId: string;
      modified: string;
      before: string;
    }>(app, "update_dataset_description", {
      datasetId: "ds-1",
      description: "New description.",
    });

    expect(envelope.result?.isError).toBeFalsy();
    const body = unpack<{
      ok: boolean;
      datasetId: string;
      modified: string;
      before: string;
    }>(envelope);
    expect(body).toEqual({
      ok: true,
      datasetId: "ds-1",
      modified: "2026-05-20T12:00:00.000Z",
      before: "Old description.",
    });

    expect(prismaMock.dataset.update).toHaveBeenCalledWith({
      where: { id: "ds-1" },
      data: { description: "New description.", modified: expect.any(Date) },
      select: { id: true, modified: true },
    });

    // Wait a tick so the fire-and-forget logActivity promise resolves before
    // we assert on it.
    await new Promise((r) => setImmediate(r));
    expect(logActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "dataset:updated",
        entityType: "dataset",
        entityId: "ds-1",
        entityName: "Sales 2024",
        userId: "user-admin",
        details: expect.objectContaining({
          source: "mcp",
          field: "description",
          from: "Old description.",
          to: "New description.",
        }),
      }),
    );
    expect(cacheReset).toHaveBeenCalledTimes(1);
  });

  it("returns DATASET_NOT_FOUND when the dataset doesn't exist", async () => {
    prismaMock.dataset.findFirst.mockResolvedValue(null);

    const { app } = buildApp({
      authMiddleware: authMiddlewareWith(adminAuth()),
    });

    const envelope = await callTool(app, "update_dataset_description", {
      datasetId: "missing",
      description: "anything",
    });
    expect(envelope.result?.isError).toBe(true);
    const body = unpack<{ errorType: string }>(envelope);
    expect(body.errorType).toBe("DATASET_NOT_FOUND");
    expect(prismaMock.dataset.update).not.toHaveBeenCalled();
  });

  it("returns FORBIDDEN when an orgAdmin's org does not match the publisher", async () => {
    prismaMock.dataset.findFirst.mockResolvedValue(makeDataset({ publisherId: "org-other" }) as any);

    const { app } = buildApp({
      authMiddleware: authMiddlewareWith(
        adminAuth({ role: "orgAdmin", organizationId: "org-1" }),
      ),
    });

    const envelope = await callTool(app, "update_dataset_description", {
      datasetId: "ds-1",
      description: "Different org's dataset.",
    });
    expect(envelope.result?.isError).toBe(true);
    const body = unpack<{ errorType: string }>(envelope);
    expect(body.errorType).toBe("FORBIDDEN");
    expect(prismaMock.dataset.update).not.toHaveBeenCalled();
  });

  it("allows orgAdmin when their organizationId matches the publisher", async () => {
    prismaMock.dataset.findFirst.mockResolvedValue(makeDataset({ publisherId: "org-1" }) as any);
    prismaMock.dataset.update.mockResolvedValue({
      id: "ds-1",
      modified: new Date("2026-05-20T12:00:00Z"),
    } as any);

    const { app } = buildApp({
      authMiddleware: authMiddlewareWith(
        adminAuth({ role: "orgAdmin", organizationId: "org-1" }),
      ),
    });

    const envelope = await callTool(app, "update_dataset_description", {
      datasetId: "ds-1",
      description: "Within org.",
    });
    expect(envelope.result?.isError).toBeFalsy();
  });

  it("skips the write and the activity log when the description is unchanged", async () => {
    prismaMock.dataset.findFirst.mockResolvedValue(
      makeDataset({ description: "Same description." }) as any,
    );

    const cacheReset = vi.fn();
    const cache = {
      through: async <T,>(_k: string, run: () => Promise<T>) => run(),
      reset: cacheReset,
      stats: () => ({ size: 0, calculatedSize: 0 }),
    };

    const { app } = buildApp({
      cache: cache as never,
      authMiddleware: authMiddlewareWith(adminAuth()),
    });

    const envelope = await callTool<{ ok: boolean; modified: false | string }>(
      app,
      "update_dataset_description",
      { datasetId: "ds-1", description: "Same description." },
    );
    const body = unpack<{ ok: boolean; modified: false | string }>(envelope);
    expect(body.modified).toBe(false);
    expect(prismaMock.dataset.update).not.toHaveBeenCalled();
    expect(logActivityMock).not.toHaveBeenCalled();
    expect(cacheReset).not.toHaveBeenCalled();
  });

  it("rejects calls without an admin scope (defense in depth)", async () => {
    // This branch should be unreachable in practice — anonymous and `read`-
    // scoped clients don't see this tool in tools/list, so calling it by
    // name fails earlier inside the MCP SDK with "Method not found". The
    // test here just confirms the tool itself does not register for non-
    // admin scopes.
    prismaMock.dataset.findFirst.mockResolvedValue(makeDataset() as any);

    const { app } = buildApp({
      authMiddleware: authMiddlewareWith(null),
    });

    const envelope = await callTool(app, "update_dataset_description", {
      datasetId: "ds-1",
      description: "Should not get through.",
    });
    // Anonymous clients see only public tools, so the MCP SDK returns a
    // JSON-RPC "method/tool not found" error at the envelope level, not a
    // wrapped isError tool response. Either is acceptable; assert no write.
    expect(prismaMock.dataset.update).not.toHaveBeenCalled();
  });
});
