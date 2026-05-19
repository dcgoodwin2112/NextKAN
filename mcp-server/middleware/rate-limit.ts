import type { Context, MiddlewareHandler } from "hono";

/**
 * Per-IP token-bucket rate limiter. Two windows are enforced:
 *   - perMinute: short-burst protection (default 60)
 *   - perHour:   sustained-load protection (default 600)
 *
 * Both buckets must have budget for a request to pass. Buckets are kept in
 * memory; restart resets them. Suitable for a single-instance deployment.
 * For multi-instance, swap in Redis (out of scope for v1).
 */
export interface RateLimitOptions {
  perMinute?: number;
  perHour?: number;
  /** Override IP resolution; defaults to x-forwarded-for or "unknown". */
  ipOf?: (c: Context) => string;
  /** Inject `Date.now` for tests. */
  now?: () => number;
}

interface Bucket {
  minuteCount: number;
  minuteResetAt: number;
  hourCount: number;
  hourResetAt: number;
}

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

export function defaultIpOf(c: Context): string {
  const fwd = c.req.header("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return c.req.header("x-real-ip") ?? "unknown";
}

export function createRateLimit(opts: RateLimitOptions = {}): {
  middleware: MiddlewareHandler;
  /** Test hook: inspect a bucket. */
  inspect: (ip: string) => Bucket | undefined;
  /** Test hook: clear all buckets. */
  reset: () => void;
} {
  const perMinute = opts.perMinute ?? 60;
  const perHour = opts.perHour ?? 600;
  const ipOf = opts.ipOf ?? defaultIpOf;
  const now = opts.now ?? Date.now;
  const buckets = new Map<string, Bucket>();

  const setBudgetHeaders = (c: Context, bucket: Bucket) => {
    c.header("X-RateLimit-Limit-Minute", String(perMinute));
    c.header(
      "X-RateLimit-Remaining-Minute",
      String(Math.max(0, perMinute - bucket.minuteCount)),
    );
    c.header("X-RateLimit-Limit-Hour", String(perHour));
    c.header(
      "X-RateLimit-Remaining-Hour",
      String(Math.max(0, perHour - bucket.hourCount)),
    );
  };

  const middleware: MiddlewareHandler = async (c, next) => {
    const ip = ipOf(c);
    const t = now();
    let bucket = buckets.get(ip);
    if (!bucket) {
      bucket = {
        minuteCount: 0,
        minuteResetAt: t + MINUTE_MS,
        hourCount: 0,
        hourResetAt: t + HOUR_MS,
      };
      buckets.set(ip, bucket);
    }

    if (t >= bucket.minuteResetAt) {
      bucket.minuteCount = 0;
      bucket.minuteResetAt = t + MINUTE_MS;
    }
    if (t >= bucket.hourResetAt) {
      bucket.hourCount = 0;
      bucket.hourResetAt = t + HOUR_MS;
    }

    if (bucket.minuteCount >= perMinute || bucket.hourCount >= perHour) {
      const retryMs = bucket.minuteCount >= perMinute
        ? bucket.minuteResetAt - t
        : bucket.hourResetAt - t;
      c.header("Retry-After", String(Math.max(1, Math.ceil(retryMs / 1000))));
      setBudgetHeaders(c, bucket);
      // JSON-RPC envelope so MCP clients parse the error consistently with
      // every other error response on /mcp. The middleware runs before the
      // JSON-RPC body is parsed, so the request id is unknown — `null` is
      // valid per JSON-RPC 2.0 in that case.
      return c.json(
        {
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32000,
            message: "Rate limit exceeded",
            data: { errorType: "RATE_LIMIT_EXCEEDED" },
          },
        },
        429,
      );
    }

    bucket.minuteCount += 1;
    bucket.hourCount += 1;
    setBudgetHeaders(c, bucket);
    await next();
  };

  return {
    middleware,
    inspect: (ip) => buckets.get(ip),
    reset: () => buckets.clear(),
  };
}
