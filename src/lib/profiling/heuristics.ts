import type { NextKanType } from "@/lib/duckdb";

/**
 * Per pivot spec: `filterable = true` if distinctCount < 10_000 OR type is one
 * of {date, datetime, number, integer, boolean}. distinctCount may be omitted
 * (use approx_unique from SUMMARIZE) — treat unknown as "cannot filter on".
 */
export function isFilterable(
  type: NextKanType,
  distinctCount: number | null | undefined,
): boolean {
  if (["date", "datetime", "number", "integer", "boolean"].includes(type)) {
    return true;
  }
  if (distinctCount == null) return false;
  return distinctCount < 10_000;
}

/**
 * Per pivot spec: numeric types are always aggregatable; date/datetime are
 * aggregatable when there's more than one value per row (i.e. the column isn't
 * effectively a primary key). The pivot phrases it as `distinctCount < rowCount`.
 */
export function isAggregatable(
  type: NextKanType,
  distinctCount: number | null | undefined,
  rowCount: number | null | undefined,
): boolean {
  if (type === "integer" || type === "number") return true;
  if (type === "date" || type === "datetime") {
    if (distinctCount == null || rowCount == null) return false;
    return distinctCount < rowCount;
  }
  return false;
}
