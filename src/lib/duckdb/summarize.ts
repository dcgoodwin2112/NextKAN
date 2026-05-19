import type { DuckDBConnection } from "@duckdb/node-api";

import { escapeSqlIdentifier, escapeSqlLiteral } from "./escape";

export interface ColumnSummary {
  name: string;
  duckdbType: string;
  min: string | null;
  max: string | null;
  approxUnique: number | null;
  nonNullCount: number | null;
  nullPercentage: number | null;
}

const toNumber = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

const toText = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  return String(v);
};

/**
 * Run DuckDB `SUMMARIZE` over a relation expression and return a typed row per column.
 * `relation` should be a quoted source readable by DuckDB — e.g.
 * `read_csv_auto('/abs/path.csv')` or a table name.
 */
export async function summarizeRelation(
  conn: DuckDBConnection,
  relation: string,
): Promise<ColumnSummary[]> {
  const result = await conn.run(`SUMMARIZE SELECT * FROM ${relation}`);
  const rows = await result.getRowObjectsJson();
  return rows.map((row) => ({
    name: String(row.column_name ?? ""),
    duckdbType: String(row.column_type ?? ""),
    min: toText(row.min),
    max: toText(row.max),
    approxUnique: toNumber(row.approx_unique),
    nonNullCount: toNumber(row.count),
    nullPercentage: toNumber(row.null_percentage),
  }));
}

/**
 * Total row count of the source relation. SUMMARIZE's `count` is per-column non-null,
 * not the total — so we need a separate query.
 */
export async function countRows(
  conn: DuckDBConnection,
  relation: string,
): Promise<number> {
  const result = await conn.run(`SELECT COUNT(*) AS n FROM ${relation}`);
  const rows = await result.getRowObjectsJson();
  return Number(rows[0]?.n ?? 0);
}

/**
 * Pull up to `limit` representative values for a given column. DuckDB will
 * choose them randomly via reservoir sampling. Returns raw cell values as
 * strings (BIGINT etc. arrive as strings from `getRowObjectsJson`).
 */
export async function sampleColumn(
  conn: DuckDBConnection,
  relation: string,
  columnName: string,
  limit: number,
): Promise<unknown[]> {
  const ident = escapeSqlIdentifier(columnName);
  const result = await conn.run(
    `SELECT ${ident} AS v FROM ${relation} WHERE ${ident} IS NOT NULL USING SAMPLE ${limit} ROWS`,
  );
  const rows = await result.getRowObjectsJson();
  return rows.map((r) => r.v);
}

/**
 * Build a `read_*` relation expression for the given source path.
 * Picks the reader based on file extension; falls back to read_csv_auto.
 */
export function relationForPath(sourcePath: string): string {
  const lower = sourcePath.toLowerCase();
  const lit = escapeSqlLiteral(sourcePath);
  if (lower.endsWith(".parquet")) return `read_parquet(${lit})`;
  if (lower.endsWith(".json") || lower.endsWith(".ndjson") || lower.endsWith(".jsonl")) {
    return `read_json_auto(${lit})`;
  }
  return `read_csv_auto(${lit}, sample_size=-1)`;
}
