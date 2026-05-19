/**
 * Escape a string for use as a SQL string literal.
 * Single quotes are doubled per SQL standard. Use to inline file paths into
 * DuckDB statements such as `read_csv_auto('<path>')`.
 */
export function escapeSqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * Escape an identifier (table or column name) for DuckDB.
 * Wraps in double quotes and doubles any embedded double-quotes.
 */
export function escapeSqlIdentifier(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}
