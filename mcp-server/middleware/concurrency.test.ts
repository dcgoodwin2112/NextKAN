import { describe, expect, it } from "vitest";
import { Hono } from "hono";

import { createConcurrencyLimiter } from "./concurrency";

function buildApp(
  opts: Parameters<typeof createConcurrencyLimiter>[0],
  handler: () => Promise<unknown>,
) {
  const limiter = createConcurrencyLimiter(opts);
  const app = new Hono();
  app.use("*", limiter.middleware);
  app.get("/", async (c) => {
    await handler();
    return c.text("ok");
  });
  return { app, limiter };
}

describe("createConcurrencyLimiter", () => {
  it("serves requests within the queue depth", async () => {
    const { app } = buildApp({ maxConcurrent: 2, maxDepth: 4 }, async () => {});
    const responses = await Promise.all([
      app.request("/"),
      app.request("/"),
    ]);
    expect(responses.map((r) => r.status)).toEqual([200, 200]);
  });

  it("returns 503 when the queue exceeds maxDepth", async () => {
    // 2 concurrent slots, 1 queue slot → 3rd request should 503.
    let release: () => void = () => {};
    const block = new Promise<void>((resolve) => {
      release = resolve;
    });

    const { app } = buildApp({ maxConcurrent: 2, maxDepth: 1 }, () => block);

    // Two in-flight (active = 2), plus one queued (pending = 1). Fourth → 503.
    const inflight = [app.request("/"), app.request("/"), app.request("/")];
    // give the event loop a tick to let middleware acquire the limiter
    await new Promise((r) => setImmediate(r));

    const rejected = await app.request("/");
    expect(rejected.status).toBe(503);
    expect(rejected.headers.get("Retry-After")).toBe("1");

    release();
    const completed = await Promise.all(inflight);
    expect(completed.every((r) => r.status === 200)).toBe(true);
  });

  it("exposes active/pending stats", async () => {
    const { limiter } = buildApp(
      { maxConcurrent: 1, maxDepth: 4 },
      async () => {},
    );
    expect(limiter.stats()).toEqual({ active: 0, pending: 0 });
  });
});
