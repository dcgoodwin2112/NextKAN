/**
 * Canonical NextKAN field types. Matches `DataDictionaryField.type` values.
 */
export const NEXTKAN_TYPES = [
  "boolean",
  "integer",
  "number",
  "string",
  "date",
  "datetime",
  "json",
  "geometry",
] as const;

export type NextKanType = (typeof NEXTKAN_TYPES)[number];

const INTEGER_PREFIXES = new Set([
  "TINYINT",
  "SMALLINT",
  "INTEGER",
  "BIGINT",
  "HUGEINT",
  "UTINYINT",
  "USMALLINT",
  "UINTEGER",
  "UBIGINT",
  "UHUGEINT",
]);

const NUMBER_PREFIXES = new Set(["FLOAT", "DOUBLE", "REAL"]);

const STRING_PREFIXES = new Set(["VARCHAR", "TEXT", "BLOB", "UUID", "BIT"]);

/**
 * Map a DuckDB SQL type name to the canonical NextKAN field type.
 * Strips parameterised suffixes — e.g. `DECIMAL(10,2)` and `TIMESTAMP_NS` both map by prefix.
 */
export function duckdbTypeToNextKan(duckdbType: string): NextKanType {
  const upper = duckdbType.trim().toUpperCase();

  if (upper === "BOOLEAN" || upper === "BOOL") return "boolean";
  if (upper.startsWith("DECIMAL") || upper.startsWith("NUMERIC")) return "number";
  if (upper === "DATE") return "date";
  if (upper === "TIME" || upper.startsWith("TIMESTAMP")) return "datetime";
  if (upper === "GEOMETRY") return "geometry";
  if (
    upper === "JSON" ||
    upper.startsWith("STRUCT") ||
    upper.startsWith("MAP") ||
    upper.startsWith("LIST") ||
    upper.endsWith("[]")
  ) {
    return "json";
  }

  const head = upper.split("(")[0];
  if (INTEGER_PREFIXES.has(head)) return "integer";
  if (NUMBER_PREFIXES.has(head)) return "number";
  if (STRING_PREFIXES.has(head)) return "string";

  return "string";
}
