import { LRUCache } from "lru-cache";

/**
 * Per-process LRU cache for MCP tool results.
 *
 * Sized by byte length of the serialized payload (default ~100 MB) with a
 * default TTL of 60 seconds. Keys are stable hashes over (tool name + args).
 *
 * Phase 8 tools wrap their DuckDB calls with `cached(key, async () => ...)`
 * so repeat queries return without re-running the query.
 */
export interface ResultCacheOptions {
  /** Max payload bytes retained. Default 100 MB. */
  maxBytes?: number;
  /** TTL in milliseconds. Default 60 000. */
  ttlMs?: number;
}

export function createResultCache(opts: ResultCacheOptions = {}): {
  /** Get-or-set helper; computes on miss, returns cached value on hit. */
  through: <T>(key: string, compute: () => Promise<T>) => Promise<T>;
  /** Drop everything (used by tests). */
  reset: () => void;
  /** Inspect; used by tests. */
  stats: () => { size: number; calculatedSize: number };
} {
  const cache = new LRUCache<string, { json: string }>({
    maxSize: opts.maxBytes ?? 100 * 1024 * 1024,
    ttl: opts.ttlMs ?? 60_000,
    sizeCalculation: (value) => Buffer.byteLength(value.json, "utf8"),
  });

  async function through<T>(key: string, compute: () => Promise<T>): Promise<T> {
    const hit = cache.get(key);
    if (hit) return JSON.parse(hit.json) as T;

    const value = await compute();
    const json = JSON.stringify(value);
    cache.set(key, { json });
    return value;
  }

  return {
    through,
    reset: () => cache.clear(),
    stats: () => ({
      size: cache.size,
      calculatedSize: cache.calculatedSize ?? 0,
    }),
  };
}

/**
 * Build a deterministic cache key from a tool name and an argument object.
 * Object keys are sorted so `{a:1,b:2}` and `{b:2,a:1}` collide as intended.
 */
export function cacheKey(tool: string, args: unknown): string {
  return `${tool}:${stableStringify(args)}`;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`)
    .join(",")}}`;
}
