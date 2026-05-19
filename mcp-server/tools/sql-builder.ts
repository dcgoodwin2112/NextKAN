import { escapeSqlIdentifier, escapeSqlLiteral } from "@/lib/duckdb";

import { toolError } from "./errors";
import {
  defaultProjectionColumns,
  requireFilterable,
  requireNonPii,
  type ColumnView,
  type ResourceWithColumns,
} from "./helpers";

export type FilterOperator =
  | "="
  | "!="
  | "<"
  | "<="
  | ">"
  | ">="
  | "in"
  | "contains"
  | "starts_with"
  | "is_null"
  | "is_not_null";

export interface Filter {
  column: string;
  operator: FilterOperator;
  value?: unknown;
}

export interface OrderBy {
  column: string;
  direction: "asc" | "desc";
}

const ORDERABLE_OPERATORS: FilterOperator[] = ["<", "<=", ">", ">="];
const STRING_ONLY_OPERATORS: FilterOperator[] = ["contains", "starts_with"];

/**
 * Build the WHERE clause from validated filters. Each column is checked
 * against the resource's `filterable: true` set and the operator must be
 * compatible with the column's canonical type.
 *
 * Returns the WHERE fragment (without the `WHERE` keyword) or `null` when
 * no filters are present. All values are inlined via `escapeSqlLiteral` —
 * agents never supply identifiers, and operator strings are an enum, so
 * there is no injection surface even without prepared statements.
 */
export function buildWhereClause(
  resource: ResourceWithColumns,
  filters: Filter[] | undefined,
): string | null {
  if (!filters || filters.length === 0) return null;

  const parts: string[] = [];
  for (const f of filters) {
    const col = requireFilterable(resource, f.column);
    assertOperatorCompatible(col, f.operator);
    parts.push(renderFilter(col, f));
  }
  return parts.join(" AND ");
}

function renderFilter(col: ColumnView, f: Filter): string {
  const ident = escapeSqlIdentifier(col.name);
  switch (f.operator) {
    case "is_null":
      return `${ident} IS NULL`;
    case "is_not_null":
      return `${ident} IS NOT NULL`;
    case "in": {
      if (!Array.isArray(f.value) || f.value.length === 0) {
        throw toolError({
          errorType: "INVALID_INPUT",
          message: `Operator 'in' requires a non-empty value array on column \`${col.name}\``,
        });
      }
      const list = f.value.map((v) => escapeSqlLiteral(formatValue(col, v))).join(", ");
      return `${ident} IN (${list})`;
    }
    case "contains": {
      const v = formatValue(col, f.value);
      return `${ident} LIKE ${escapeSqlLiteral(`%${v}%`)}`;
    }
    case "starts_with": {
      const v = formatValue(col, f.value);
      return `${ident} LIKE ${escapeSqlLiteral(`${v}%`)}`;
    }
    default: {
      if (f.value === undefined || f.value === null) {
        throw toolError({
          errorType: "INVALID_INPUT",
          message: `Operator '${f.operator}' on column \`${col.name}\` requires a value`,
        });
      }
      const literal = formatValueLiteral(col, f.value);
      return `${ident} ${f.operator} ${literal}`;
    }
  }
}

function assertOperatorCompatible(col: ColumnView, op: FilterOperator): void {
  if (ORDERABLE_OPERATORS.includes(op)) {
    if (!isOrderable(col)) {
      throw toolError({
        errorType: "INVALID_INPUT",
        message:
          `Operator '${op}' is not valid on column \`${col.name}\` (type ${col.type}). ` +
          `Use '=' or 'in' for non-numeric/date columns.`,
      });
    }
  }
  if (STRING_ONLY_OPERATORS.includes(op)) {
    if (col.type !== "string") {
      throw toolError({
        errorType: "INVALID_INPUT",
        message: `Operator '${op}' is only valid on string columns (got ${col.type}).`,
      });
    }
  }
}

function isOrderable(col: ColumnView): boolean {
  return (
    col.type === "integer" ||
    col.type === "number" ||
    col.type === "date" ||
    col.type === "datetime"
  );
}

function formatValue(col: ColumnView, value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

/**
 * Render a single scalar value as a SQL literal compatible with the column
 * type. Numbers/booleans go in unquoted; everything else uses string-literal
 * escaping. DuckDB happily coerces ISO date strings.
 */
function formatValueLiteral(col: ColumnView, value: unknown): string {
  if (col.type === "boolean") {
    if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
    if (value === "true" || value === 1) return "TRUE";
    if (value === "false" || value === 0) return "FALSE";
  }
  if (col.type === "integer" || col.type === "number") {
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value)) return value;
  }
  return escapeSqlLiteral(String(value));
}

/** Render ORDER BY using only known columns; unknown column throws COLUMN_NOT_FOUND. */
export function buildOrderClause(
  resource: ResourceWithColumns,
  orderBy: OrderBy[] | undefined,
): string | null {
  if (!orderBy || orderBy.length === 0) return null;
  const parts = orderBy.map((o) => {
    const col = resource.columns.find((c) => c.name === o.column);
    if (!col) {
      throw toolError({
        errorType: "COLUMN_NOT_FOUND",
        message: `Order-by column not found: ${o.column}`,
      });
    }
    return `${escapeSqlIdentifier(col.name)} ${o.direction === "desc" ? "DESC" : "ASC"}`;
  });
  return parts.join(", ");
}

/**
 * Render the projection list. When `columns` is omitted, projects all
 * non-PII columns (or all columns if `includePii` is true). When `columns`
 * is supplied explicitly, every column must exist; PII columns are rejected
 * unless `includePii` is true.
 */
export function buildProjection(
  resource: ResourceWithColumns,
  columns: string[] | undefined,
  includePii: boolean,
): string {
  if (!columns || columns.length === 0) {
    const visible = defaultProjectionColumns(resource, includePii);
    if (visible.length === 0) return "*";
    return visible.map((c) => escapeSqlIdentifier(c.name)).join(", ");
  }
  return columns
    .map((name) => {
      const col = requireNonPii(resource, name, includePii);
      return escapeSqlIdentifier(col.name);
    })
    .join(", ");
}
