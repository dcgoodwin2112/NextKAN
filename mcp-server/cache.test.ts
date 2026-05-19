import { describe, expect, it, vi } from "vitest";

import { cacheKey, createResultCache } from "./cache";

describe("createResultCache", () => {
  it("returns the cached value on subsequent calls", async () => {
    const cache = createResultCache();
    const compute = vi.fn().mockResolvedValue({ rows: [1, 2, 3] });

    const first = await cache.through("k", compute);
    const second = await cache.through("k", compute);

    expect(first).toEqual({ rows: [1, 2, 3] });
    expect(second).toEqual({ rows: [1, 2, 3] });
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it("computes again after the entry expires", async () => {
    // lru-cache uses performance.now() internally; vi.useFakeTimers doesn't
    // intercept it cleanly. Use a short real-time TTL instead.
    const cache = createResultCache({ ttlMs: 10 });
    const compute = vi
      .fn()
      .mockResolvedValueOnce("v1")
      .mockResolvedValueOnce("v2");

    expect(await cache.through("k", compute)).toBe("v1");
    await new Promise((r) => setTimeout(r, 25));
    expect(await cache.through("k", compute)).toBe("v2");
  });

  it("isolates values per key", async () => {
    const cache = createResultCache();
    await cache.through("a", async () => 1);
    await cache.through("b", async () => 2);
    expect(await cache.through("a", async () => 99)).toBe(1);
    expect(await cache.through("b", async () => 99)).toBe(2);
  });

  it("reset clears the cache", async () => {
    const cache = createResultCache();
    await cache.through("a", async () => 1);
    expect(cache.stats().size).toBe(1);
    cache.reset();
    expect(cache.stats().size).toBe(0);
  });
});

describe("cacheKey", () => {
  it("includes the tool name", () => {
    expect(cacheKey("foo", { a: 1 })).toMatch(/^foo:/);
  });

  it("is stable under object key ordering", () => {
    expect(cacheKey("t", { a: 1, b: 2 })).toBe(cacheKey("t", { b: 2, a: 1 }));
  });

  it("distinguishes different argument values", () => {
    expect(cacheKey("t", { a: 1 })).not.toBe(cacheKey("t", { a: 2 }));
  });

  it("walks arrays positionally", () => {
    expect(cacheKey("t", [1, 2])).not.toBe(cacheKey("t", [2, 1]));
  });

  it("handles nested objects deterministically", () => {
    const k1 = cacheKey("t", { a: { x: 1, y: 2 }, b: [1, 2] });
    const k2 = cacheKey("t", { b: [1, 2], a: { y: 2, x: 1 } });
    expect(k1).toBe(k2);
  });
});
