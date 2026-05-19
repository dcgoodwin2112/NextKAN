import type { MiddlewareHandler } from "hono";
import pLimit from "p-limit";

/**
 * Global concurrency limiter. Backed by `p-limit`. When the queue depth
 * exceeds `maxDepth`, requests are short-circuited with 503 to prevent the
 * server from accumulating unbounded pending DuckDB work.
 */
export interface ConcurrencyOptions {
  /** Concurrent in-flight requests. Default 4. */
  maxConcurrent?: number;
  /** Maximum queued (waiting) requests before rejecting. Default 20. */
  maxDepth?: number;
}

export function createConcurrencyLimiter(opts: ConcurrencyOptions = {}): {
  middleware: MiddlewareHandler;
  /** Test hook: number of currently queued + active tasks. */
  stats: () => { active: number; pending: number };
} {
  const maxConcurrent = opts.maxConcurrent ?? 4;
  const maxDepth = opts.maxDepth ?? 20;
  const limit = pLimit(maxConcurrent);

  const middleware: MiddlewareHandler = async (c, next) => {
    if (limit.pendingCount >= maxDepth) {
      c.header("Retry-After", "1");
      return c.json(
        { error: "Server is busy", code: "concurrency_queue_full" },
        503,
      );
    }
    await limit(async () => {
      await next();
    });
  };

  return {
    middleware,
    stats: () => ({ active: limit.activeCount, pending: limit.pendingCount }),
  };
}
