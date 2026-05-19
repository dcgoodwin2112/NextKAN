import type { NextKanType } from "@/lib/duckdb";

/**
 * Result row for a single column produced by the profiler. Shape mirrors the
 * fields written to `DataDictionaryField` in Phase 2 — callers can persist
 * directly via Prisma. JSON-array fields (`sampleValues`, `enumValues`) are
 * still raw arrays here; the persistence layer is responsible for stringifying.
 */
export interface ColumnProfile {
  name: string;
  type: NextKanType;
  duckdbType: string;
  rowCount: number;
  nullCount: number | null;
  distinctCount: number | null;
  min: string | null;
  max: string | null;
  sampleValues: unknown[];
  enumValues: unknown[] | null;
  filterable: boolean;
  aggregatable: boolean;
  isPii: boolean;
  isGeometry: boolean;
  crs: string | null;
}

export interface ProfileResult {
  rowCount: number;
  columns: ColumnProfile[];
  /**
   * Absolute path of the Parquet output that was produced, or `null` if the
   * source was not convertible (non-tabular).
   */
  parquetPath: string | null;
}

export interface ProfileOptions {
  /** Absolute path to source file (CSV, JSON, Parquet). */
  sourcePath: string;
  /** Absolute path where the Parquet output should be written. */
  parquetTargetPath: string;
  /** Optional MIME hint; currently unused. Extension drives reader choice. */
  mediaType?: string;
  /** Cap how many sample values to collect per column. Default 5. */
  sampleSize?: number;
  /**
   * If true (default), treat a string column with `approxUnique` <= this
   * threshold as an enum and populate `enumValues`. Set to 0 to disable.
   */
  enumThreshold?: number;
}
