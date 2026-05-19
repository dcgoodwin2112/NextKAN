// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { prismaMock } from "@/__mocks__/prisma";

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

import { createResultCache } from "./cache";
import { createConcurrencyLimiter } from "./middleware/concurrency";
import { createRateLimit } from "./middleware/rate-limit";
import { buildApp } from "./transport";

const MCP_PROTOCOL_VERSION = "2025-11-25";

function toolsListBody(id: number) {
  return JSON.stringify({
    jsonrpc: "2.0",
    id,
    method: "tools/list",
    params: {},
  });
}

function toolsCallBody(id: number, name: string, args: Record<string, unknown>) {
  return JSON.stringify({
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: { name, arguments: args },
  });
}

function mcpHeaders() {
  return {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    "MCP-Protocol-Version": MCP_PROTOCOL_VERSION,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: list_datasets returns no rows, so any /mcp tools/call we don't
  // explicitly mock won't crash on missing fixtures.
  prismaMock.dataset.findMany.mockResolvedValue([] as any);
  prismaMock.dataset.count.mockResolvedValue(0 as any);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("rate-limit middleware (live)", () => {
  it("returns 429 with Retry-After once perMinute budget is exhausted", async () => {
    const rateLimit = createRateLimit({
      perMinute: 3,
      perHour: 100,
      ipOf: () => "1.2.3.4",
    });
    const { app } = buildApp({ rateLimit });

    // Three permitted requests…
    for (let i = 0; i < 3; i++) {
      const res = await app.request("/mcp", {
        method: "POST",
        headers: mcpHeaders(),
        body: toolsListBody(i + 1),
      });
      expect(res.status).toBe(200);
    }

    // …fourth gets the limiter.
    const res = await app.request("/mcp", {
      method: "POST",
      headers: mcpHeaders(),
      body: toolsListBody(4),
    });
    expect(res.status).toBe(429);
    const retryAfter = res.headers.get("Retry-After");
    expect(retryAfter).not.toBeNull();
    expect(Number(retryAfter)).toBeGreaterThan(0);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("rate_limit_exceeded");
  });

  it("isolates buckets per IP", async () => {
    let ip = "10.0.0.1";
    const rateLimit = createRateLimit({
      perMinute: 1,
      perHour: 100,
      ipOf: () => ip,
    });
    const { app } = buildApp({ rateLimit });

    const first = await app.request("/mcp", {
      method: "POST",
      headers: mcpHeaders(),
      body: toolsListBody(1),
    });
    expect(first.status).toBe(200);

    // Same IP - second hits the limit.
    const second = await app.request("/mcp", {
      method: "POST",
      headers: mcpHeaders(),
      body: toolsListBody(2),
    });
    expect(second.status).toBe(429);

    // Different IP gets its own budget.
    ip = "10.0.0.2";
    const third = await app.request("/mcp", {
      method: "POST",
      headers: mcpHeaders(),
      body: toolsListBody(3),
    });
    expect(third.status).toBe(200);
  });
});

describe("concurrency middleware (live)", () => {
  it("returns 503 with Retry-After once queue depth is exceeded", async () => {
    const concurrency = createConcurrencyLimiter({
      maxConcurrent: 2,
      maxDepth: 2,
    });

    // Hold list_datasets in-flight so slots fill. The mocked Prisma call
    // resolves after this barrier flips.
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    prismaMock.dataset.findMany.mockImplementation((async () => {
      await barrier;
      return [];
    }) as any);
    prismaMock.dataset.count.mockResolvedValue(0 as any);

    const { app } = buildApp({ concurrency });

    // Fire 5 concurrent in-flight requests. Active=2, pending=2 (filling the
    // queue), 5th should be rejected immediately.
    const pending = Array.from({ length: 5 }, (_, i) =>
      app.request("/mcp", {
        method: "POST",
        headers: mcpHeaders(),
        body: toolsCallBody(i + 1, "list_datasets", {}),
      }),
    );

    // Wait a tick so the limiter has a chance to slot them.
    await new Promise((r) => setImmediate(r));

    // Release the barrier so all queued + active requests can finish.
    release();

    const responses = await Promise.all(pending);
    const statuses = responses.map((r) => r.status).sort((a, b) => a - b);
    const okCount = statuses.filter((s) => s === 200).length;
    const busyCount = statuses.filter((s) => s === 503).length;

    // At least one request must have been rejected with 503; the rest 200.
    expect(busyCount).toBeGreaterThanOrEqual(1);
    expect(okCount + busyCount).toBe(5);

    // The 503 response carries the Retry-After: 1 header.
    const busyResponse = responses.find((r) => r.status === 503)!;
    expect(busyResponse.headers.get("Retry-After")).toBe("1");
    const body = (await busyResponse.json()) as { code: string };
    expect(body.code).toBe("concurrency_queue_full");
  });
});

describe("result cache (live)", () => {
  it("serves the second identical tool call from cache", async () => {
    const cache = createResultCache({ ttlMs: 60_000 });
    const { app } = buildApp({ cache });

    const first = await app.request("/mcp", {
      method: "POST",
      headers: mcpHeaders(),
      body: toolsCallBody(1, "list_datasets", { limit: 5 }),
    });
    expect(first.status).toBe(200);
    expect(prismaMock.dataset.findMany).toHaveBeenCalledTimes(1);

    const second = await app.request("/mcp", {
      method: "POST",
      headers: mcpHeaders(),
      body: toolsCallBody(2, "list_datasets", { limit: 5 }),
    });
    expect(second.status).toBe(200);
    // Cache hit -> Prisma not invoked again.
    expect(prismaMock.dataset.findMany).toHaveBeenCalledTimes(1);
  });

  it("re-runs Prisma when arguments differ", async () => {
    const cache = createResultCache({ ttlMs: 60_000 });
    const { app } = buildApp({ cache });

    await app.request("/mcp", {
      method: "POST",
      headers: mcpHeaders(),
      body: toolsCallBody(1, "list_datasets", { limit: 5 }),
    });
    await app.request("/mcp", {
      method: "POST",
      headers: mcpHeaders(),
      body: toolsCallBody(2, "list_datasets", { limit: 10 }),
    });

    expect(prismaMock.dataset.findMany).toHaveBeenCalledTimes(2);
  });
});
