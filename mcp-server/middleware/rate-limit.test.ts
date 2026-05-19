import { describe, expect, it } from "vitest";
import { Hono } from "hono";

import { createRateLimit, defaultIpOf } from "./rate-limit";

function makeApp(opts: Parameters<typeof createRateLimit>[0] = {}) {
  const app = new Hono();
  const limiter = createRateLimit(opts);
  app.use("*", limiter.middleware);
  app.get("/", (c) => c.text("ok"));
  return { app, limiter };
}

describe("createRateLimit", () => {
  it("allows requests under the per-minute limit", async () => {
    const { app } = makeApp({ perMinute: 3, perHour: 100 });
    for (let i = 0; i < 3; i++) {
      const res = await app.request("/", {
        headers: { "x-forwarded-for": "1.2.3.4" },
      });
      expect(res.status).toBe(200);
    }
  });

  it("rejects once per-minute budget is exhausted", async () => {
    const { app } = makeApp({ perMinute: 2, perHour: 100 });
    const headers = { "x-forwarded-for": "1.2.3.4" };
    await app.request("/", { headers });
    await app.request("/", { headers });
    const res = await app.request("/", { headers });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });

  it("emits X-RateLimit-* headers on successful responses", async () => {
    const { app } = makeApp({ perMinute: 5, perHour: 100 });
    const headers = { "x-forwarded-for": "1.2.3.4" };
    const res = await app.request("/", { headers });
    expect(res.status).toBe(200);
    expect(res.headers.get("X-RateLimit-Limit-Minute")).toBe("5");
    // First request consumed 1 of 5 → remaining = 4.
    expect(res.headers.get("X-RateLimit-Remaining-Minute")).toBe("4");
    expect(res.headers.get("X-RateLimit-Limit-Hour")).toBe("100");
    expect(res.headers.get("X-RateLimit-Remaining-Hour")).toBe("99");
  });

  it("returns a JSON-RPC error envelope on 429", async () => {
    const { app } = makeApp({ perMinute: 1, perHour: 100 });
    const headers = { "x-forwarded-for": "9.9.9.9" };
    await app.request("/", { headers });
    const res = await app.request("/", { headers });
    expect(res.status).toBe(429);
    const body = (await res.json()) as {
      jsonrpc: string;
      id: unknown;
      error: { code: number; message: string; data?: { errorType?: string } };
    };
    expect(body.jsonrpc).toBe("2.0");
    expect(body.id).toBeNull();
    expect(body.error.code).toBe(-32000);
    expect(body.error.message).toBe("Rate limit exceeded");
    expect(body.error.data?.errorType).toBe("RATE_LIMIT_EXCEEDED");
    // Spec: headers still accompany 429s.
    expect(res.headers.get("X-RateLimit-Limit-Minute")).toBe("1");
    expect(res.headers.get("X-RateLimit-Remaining-Minute")).toBe("0");
  });

  it("counts independent buckets per IP", async () => {
    const { app } = makeApp({ perMinute: 1, perHour: 100 });
    await app.request("/", { headers: { "x-forwarded-for": "1.1.1.1" } });
    const otherIp = await app.request("/", {
      headers: { "x-forwarded-for": "2.2.2.2" },
    });
    expect(otherIp.status).toBe(200);
  });

  it("resets per-minute window after 60s elapses", async () => {
    let t = 1_000_000;
    const { app } = makeApp({ perMinute: 1, perHour: 100, now: () => t });
    const headers = { "x-forwarded-for": "1.1.1.1" };

    expect((await app.request("/", { headers })).status).toBe(200);
    expect((await app.request("/", { headers })).status).toBe(429);

    t += 60_001;
    expect((await app.request("/", { headers })).status).toBe(200);
  });

  it("rejects when per-hour budget is exhausted even within the minute window", async () => {
    const { app } = makeApp({ perMinute: 100, perHour: 2 });
    const headers = { "x-forwarded-for": "5.5.5.5" };
    expect((await app.request("/", { headers })).status).toBe(200);
    expect((await app.request("/", { headers })).status).toBe(200);
    expect((await app.request("/", { headers })).status).toBe(429);
  });

  it("falls back to 'unknown' IP when no header is present", async () => {
    const c = {
      req: { header: () => undefined },
    } as unknown as Parameters<typeof defaultIpOf>[0];
    expect(defaultIpOf(c)).toBe("unknown");
  });
});
