import { mkdir } from "node:fs/promises";
import path from "node:path";

import {
  countRows,
  duckdbTypeToNextKan,
  escapeSqlLiteral,
  relationForPath,
  sampleColumn,
  summarizeRelation,
  withDuckDb,
  type ColumnSummary,
  type NextKanType,
} from "@/lib/duckdb";

import { isAggregatable, isFilterable } from "./heuristics";
import { detectPii } from "./pii";
import type { ColumnProfile, ProfileOptions, ProfileResult } from "./types";

export type { ColumnProfile, ProfileOptions, ProfileResult } from "./types";

const DEFAULT_SAMPLE_SIZE = 5;
const DEFAULT_ENUM_THRESHOLD = 50;

/**
 * Profile a tabular source file (CSV/JSON/Parquet) and write a Parquet copy.
 *
 * The work runs on whichever thread calls it — pair with `profileInWorker()`
 * from `./worker` when invoking from the admin process to keep DuckDB off
 * the Next.js event loop. The MCP server can call this function directly.
 */
export async function profileResource(opts: ProfileOptions): Promise<ProfileResult> {
  const sampleSize = opts.sampleSize ?? DEFAULT_SAMPLE_SIZE;
  const enumThreshold = opts.enumThreshold ?? DEFAULT_ENUM_THRESHOLD;
  const relation = relationForPath(opts.sourcePath);

  return withDuckDb(async (conn) => {
    const summaries = await summarizeRelation(conn, relation);
    const rowCount = await countRows(conn, relation);

    const columns: ColumnProfile[] = [];
    for (const summary of summaries) {
      const samples = await sampleColumn(conn, relation, summary.name, sampleSize);
      columns.push(buildColumnProfile(summary, rowCount, samples, enumThreshold));
    }

    await mkdir(path.dirname(opts.parquetTargetPath), { recursive: true });
    const targetLit = escapeSqlLiteral(opts.parquetTargetPath);
    await conn.run(
      `COPY (SELECT * FROM ${relation}) TO ${targetLit} (FORMAT PARQUET, COMPRESSION ZSTD)`,
    );

    return {
      rowCount,
      columns,
      parquetPath: opts.parquetTargetPath,
    };
  });
}

function buildColumnProfile(
  summary: ColumnSummary,
  totalRows: number,
  samples: unknown[],
  enumThreshold: number,
): ColumnProfile {
  const type: NextKanType = duckdbTypeToNextKan(summary.duckdbType);
  const nullCount = computeNullCount(summary, totalRows);
  const distinctCount = summary.approxUnique;

  const isPii = type === "string" && detectPii(samples);
  const isGeometry = type === "geometry";
  const enumValues = decideEnumValues(type, distinctCount, samples, enumThreshold);

  return {
    name: summary.name,
    type,
    duckdbType: summary.duckdbType,
    rowCount: totalRows,
    nullCount,
    distinctCount,
    min: summary.min,
    max: summary.max,
    sampleValues: samples,
    enumValues,
    filterable: isFilterable(type, distinctCount),
    aggregatable: isAggregatable(type, distinctCount, totalRows),
    isPii,
    isGeometry,
    crs: null,
  };
}

function computeNullCount(summary: ColumnSummary, totalRows: number): number | null {
  if (summary.nullPercentage != null) {
    return Math.round((summary.nullPercentage / 100) * totalRows);
  }
  if (summary.nonNullCount != null) {
    return Math.max(0, totalRows - summary.nonNullCount);
  }
  return null;
}

function decideEnumValues(
  type: NextKanType,
  distinctCount: number | null,
  samples: unknown[],
  enumThreshold: number,
): unknown[] | null {
  if (type !== "string") return null;
  if (enumThreshold <= 0) return null;
  if (distinctCount == null) return null;
  if (distinctCount > enumThreshold) return null;
  // De-dupe the samples we already have. This is approximate — for a precise
  // enum list a future caller can run COUNT(DISTINCT)/GROUP BY queries.
  const seen = new Map<string, unknown>();
  for (const v of samples) {
    if (v === null || v === undefined) continue;
    const key = String(v);
    if (!seen.has(key)) seen.set(key, v);
  }
  return seen.size > 0 ? Array.from(seen.values()) : null;
}
