import { DuckDBInstance, type DuckDBConnection } from "@duckdb/node-api";

const DEFAULT_MEMORY_LIMIT = process.env.NEXTKAN_DUCKDB_MEMORY_LIMIT ?? "2GB";

/**
 * Create a fresh in-memory DuckDB connection. Each call returns an isolated
 * instance — appropriate for one-shot profiling work and for tests. Callers
 * MUST close both the connection and the instance.
 *
 * Example:
 *   const { instance, connection } = await openDuckDb();
 *   try { ... } finally { connection.closeSync(); instance.closeSync(); }
 */
export async function openDuckDb(options?: {
  memoryLimit?: string;
}): Promise<{ instance: DuckDBInstance; connection: DuckDBConnection }> {
  const instance = await DuckDBInstance.create(":memory:", {
    memory_limit: options?.memoryLimit ?? DEFAULT_MEMORY_LIMIT,
  });
  const connection = await instance.connect();
  return { instance, connection };
}

/**
 * Convenience wrapper: open a connection, run the callback, always tear down.
 */
export async function withDuckDb<T>(
  fn: (conn: DuckDBConnection) => Promise<T>,
  options?: { memoryLimit?: string },
): Promise<T> {
  const { instance, connection } = await openDuckDb(options);
  try {
    return await fn(connection);
  } finally {
    connection.closeSync();
    instance.closeSync();
  }
}
