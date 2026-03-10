import { prisma } from "@/lib/db";
import type { Distribution } from "@/generated/prisma/client";
import type { DatastoreColumn } from "@/lib/schemas/datastore";
import Papa from "papaparse";
import { readFile } from "fs/promises";
import Database from "better-sqlite3";

function getDb(): InstanceType<typeof Database> {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  const filePath = url.replace(/^file:/, "");
  return new Database(filePath);
}

export function generateTableName(distributionId: string): string {
  const hex = distributionId.replace(/-/g, "").slice(0, 8);
  return `ds_${hex}`;
}

export function sanitizeColumnName(raw: string): string {
  let name = raw
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  if (!name || /^\d/.test(name)) {
    name = `col_${name}`;
  }

  return name.toLowerCase();
}

export function inferColumnTypes(
  columns: string[],
  sampleRows: Record<string, string>[]
): DatastoreColumn[] {
  const sample = sampleRows.slice(0, 100);

  return columns.map((rawName) => {
    const name = sanitizeColumnName(rawName);
    const values = sample
      .map((row) => row[rawName])
      .filter((v) => v !== undefined && v !== null && v !== "");

    if (values.length === 0) {
      return { name, type: "TEXT" as const };
    }

    const allBoolean = values.every((v) =>
      ["true", "false", "0", "1", "yes", "no"].includes(v.toLowerCase())
    );
    if (allBoolean) return { name, type: "BOOLEAN" as const };

    const allInteger = values.every((v) => /^-?\d+$/.test(v));
    if (allInteger) return { name, type: "INTEGER" as const };

    const allReal = values.every((v) => /^-?\d+(\.\d+)?$/.test(v));
    if (allReal) return { name, type: "REAL" as const };

    return { name, type: "TEXT" as const };
  });
}

export function flattenObject(
  obj: Record<string, unknown>,
  prefix = "",
  depth = 0,
  maxDepth = 3
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      depth < maxDepth
    ) {
      Object.assign(
        result,
        flattenObject(value as Record<string, unknown>, fullKey, depth + 1, maxDepth)
      );
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

export function stringifyValues(
  row: Record<string, unknown>
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value === null || value === undefined) {
      result[key] = "";
    } else if (typeof value === "object") {
      result[key] = JSON.stringify(value);
    } else {
      result[key] = String(value);
    }
  }
  return result;
}

export function extractJsonArray(
  data: unknown
): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    if (data.length === 0) {
      throw new Error("JSON array is empty");
    }
    if (typeof data[0] !== "object" || data[0] === null) {
      throw new Error("JSON array must contain objects");
    }
    return data as Record<string, unknown>[];
  }

  if (typeof data === "object" && data !== null) {
    for (const value of Object.values(data as Record<string, unknown>)) {
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === "object" && value[0] !== null) {
        return value as Record<string, unknown>[];
      }
    }
  }

  throw new Error("No array of objects found in JSON");
}

async function importRowsToDatastore(
  distribution: Distribution,
  rawColumns: string[],
  rows: Record<string, string>[]
): Promise<void> {
  const tableName = generateTableName(distribution.id);

  const record = await prisma.datastoreTable.create({
    data: {
      distributionId: distribution.id,
      tableName,
      columns: "[]",
      status: "pending",
    },
  });

  try {
    await prisma.datastoreTable.update({
      where: { id: record.id },
      data: { status: "importing" },
    });

    if (rawColumns.length === 0) {
      throw new Error("No columns found");
    }

    const columns = inferColumnTypes(rawColumns, rows);

    // Deduplicate sanitized column names
    const seen = new Map<string, number>();
    for (const col of columns) {
      const count = seen.get(col.name) ?? 0;
      if (count > 0) {
        col.name = `${col.name}_${count}`;
      }
      seen.set(col.name, count + 1);
    }

    const db = getDb();

    try {
      // Create the dynamic table
      const colDefs = columns
        .map((c) => `"${c.name}" ${c.type}`)
        .join(", ");
      db.exec(`CREATE TABLE IF NOT EXISTS "${tableName}" (_rowid INTEGER PRIMARY KEY AUTOINCREMENT, ${colDefs})`);

      // Batch insert
      const maxPerBatch = Math.min(
        Math.floor(999 / columns.length),
        1000
      );

      const insertCols = columns.map((c) => `"${c.name}"`).join(", ");

      for (let i = 0; i < rows.length; i += maxPerBatch) {
        const batch = rows.slice(i, i + maxPerBatch);
        const placeholders = batch
          .map(() => `(${columns.map(() => "?").join(", ")})`)
          .join(", ");

        const values: unknown[] = [];
        for (const row of batch) {
          for (let ci = 0; ci < rawColumns.length; ci++) {
            const rawVal = row[rawColumns[ci]] ?? null;
            const col = columns[ci];

            if (rawVal === null || rawVal === "") {
              values.push(null);
            } else if (col.type === "INTEGER") {
              values.push(parseInt(rawVal, 10));
            } else if (col.type === "REAL") {
              values.push(parseFloat(rawVal));
            } else if (col.type === "BOOLEAN") {
              values.push(
                ["true", "1", "yes"].includes(rawVal.toLowerCase()) ? 1 : 0
              );
            } else {
              values.push(rawVal);
            }
          }
        }

        db.prepare(
          `INSERT INTO "${tableName}" (${insertCols}) VALUES ${placeholders}`
        ).run(...values);
      }

      await prisma.datastoreTable.update({
        where: { id: record.id },
        data: {
          columns: JSON.stringify(columns),
          rowCount: rows.length,
          status: "ready",
        },
      });

      // Auto-generate data dictionary from column info
      try {
        const { autoGenerateFromDatastore } = await import(
          "@/lib/services/data-dictionary"
        );
        await autoGenerateFromDatastore(distribution.id, columns);
      } catch {
        // Non-fatal — dictionary generation failure shouldn't block import
      }
    } finally {
      db.close();
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown import error";
    await prisma.datastoreTable.update({
      where: { id: record.id },
      data: { status: "error", errorMessage: message },
    });
  }
}

export async function importCsvToDatastore(
  distribution: Distribution
): Promise<void> {
  await importFileToDatastore(distribution, (fileContent) => {
    const parsed = Papa.parse<Record<string, string>>(fileContent, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      throw new Error(`CSV parse error: ${parsed.errors[0].message}`);
    }

    const rawColumns = parsed.meta.fields ?? [];
    return { columns: rawColumns, rows: parsed.data };
  });
}

function parseJsonToRows(fileContent: string): {
  columns: string[];
  rows: Record<string, string>[];
} {
  const parsed = JSON.parse(fileContent);
  const rawObjects = extractJsonArray(parsed);
  const flattened = rawObjects.map((r) => flattenObject(r));

  // Union all keys across rows (JSON rows may have different keys)
  const allKeysSet = new Set<string>();
  for (const row of flattened) {
    for (const key of Object.keys(row)) {
      allKeysSet.add(key);
    }
  }
  const columns = Array.from(allKeysSet);

  const rows = flattened.map((row) => {
    const filled: Record<string, unknown> = {};
    for (const key of columns) {
      filled[key] = key in row ? row[key] : null;
    }
    return stringifyValues(filled);
  });

  return { columns, rows };
}

function parseGeoJsonToRows(fileContent: string): {
  columns: string[];
  rows: Record<string, string>[];
} {
  const parsed = JSON.parse(fileContent);

  // Accept FeatureCollection or bare features array
  let features: Array<{ properties?: Record<string, unknown>; geometry?: unknown }>;
  if (Array.isArray(parsed)) {
    features = parsed;
  } else if (parsed?.features && Array.isArray(parsed.features)) {
    features = parsed.features;
  } else {
    throw new Error("Invalid GeoJSON: must have features array");
  }

  if (features.length === 0) {
    throw new Error("GeoJSON features array is empty");
  }

  const flattened = features.map((feature) => {
    const props = flattenObject(feature.properties || {});
    props.geometry = JSON.stringify(feature.geometry ?? null);
    return props;
  });

  const allKeysSet = new Set<string>();
  for (const row of flattened) {
    for (const key of Object.keys(row)) {
      allKeysSet.add(key);
    }
  }
  const columns = Array.from(allKeysSet);

  const rows = flattened.map((row) => {
    const filled: Record<string, unknown> = {};
    for (const key of columns) {
      filled[key] = key in row ? row[key] : null;
    }
    return stringifyValues(filled);
  });

  return { columns, rows };
}

async function importFileToDatastore(
  distribution: Distribution,
  parser: (content: string) => { columns: string[]; rows: Record<string, string>[] }
): Promise<void> {
  if (!distribution.filePath) {
    const tableName = generateTableName(distribution.id);
    const record = await prisma.datastoreTable.create({
      data: {
        distributionId: distribution.id,
        tableName,
        columns: "[]",
        status: "pending",
      },
    });
    await prisma.datastoreTable.update({
      where: { id: record.id },
      data: { status: "error", errorMessage: "No file path for distribution" },
    });
    return;
  }

  try {
    const fileContent = await readFile(distribution.filePath, "utf-8");
    const { columns, rows } = parser(fileContent);
    await importRowsToDatastore(distribution, columns, rows);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown import error";
    const tableName = generateTableName(distribution.id);
    const record = await prisma.datastoreTable.create({
      data: {
        distributionId: distribution.id,
        tableName,
        columns: "[]",
        status: "pending",
      },
    });
    await prisma.datastoreTable.update({
      where: { id: record.id },
      data: { status: "error", errorMessage: message },
    });
  }
}

export async function importJsonToDatastore(
  distribution: Distribution
): Promise<void> {
  await importFileToDatastore(distribution, parseJsonToRows);
}

export async function importGeoJsonToDatastore(
  distribution: Distribution
): Promise<void> {
  await importFileToDatastore(distribution, parseGeoJsonToRows);
}

export async function importExcelToDatastore(
  distribution: Distribution
): Promise<void> {
  if (!distribution.filePath) {
    const tableName = generateTableName(distribution.id);
    const record = await prisma.datastoreTable.create({
      data: {
        distributionId: distribution.id,
        tableName,
        columns: "[]",
        status: "pending",
      },
    });
    await prisma.datastoreTable.update({
      where: { id: record.id },
      data: { status: "error", errorMessage: "No file path for distribution" },
    });
    return;
  }

  try {
    const XLSX = await import("xlsx");
    const buffer = await readFile(distribution.filePath);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error("Excel file has no sheets");

    const sheet = workbook.Sheets[sheetName];
    const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
    });

    if (jsonRows.length === 0) throw new Error("Excel sheet is empty");

    const columns = Object.keys(jsonRows[0]);
    const rows = jsonRows.map((row) => stringifyValues(row));

    await importRowsToDatastore(distribution, columns, rows);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown import error";
    const tableName = generateTableName(distribution.id);
    const record = await prisma.datastoreTable.create({
      data: {
        distributionId: distribution.id,
        tableName,
        columns: "[]",
        status: "pending",
      },
    });
    await prisma.datastoreTable.update({
      where: { id: record.id },
      data: { status: "error", errorMessage: message },
    });
  }
}

export function validateColumn(
  name: string,
  columns: DatastoreColumn[]
): boolean {
  return columns.some((c) => c.name === name);
}

export function buildFilterClause(
  filters: Array<{ column: string; operator: string; value: string | number }>,
  columns: DatastoreColumn[]
): { where: string; params: unknown[] } {
  if (filters.length === 0) {
    return { where: "", params: [] };
  }

  const conditions: string[] = [];
  const params: unknown[] = [];

  for (const filter of filters) {
    if (!validateColumn(filter.column, columns)) {
      throw new Error(`Unknown column: ${filter.column}`);
    }

    const col = `"${filter.column}"`;

    switch (filter.operator) {
      case "=":
        conditions.push(`${col} = ?`);
        params.push(filter.value);
        break;
      case "!=":
        conditions.push(`${col} != ?`);
        params.push(filter.value);
        break;
      case ">":
        conditions.push(`${col} > ?`);
        params.push(filter.value);
        break;
      case "<":
        conditions.push(`${col} < ?`);
        params.push(filter.value);
        break;
      case ">=":
        conditions.push(`${col} >= ?`);
        params.push(filter.value);
        break;
      case "<=":
        conditions.push(`${col} <= ?`);
        params.push(filter.value);
        break;
      case "contains":
        conditions.push(`${col} LIKE ?`);
        params.push(`%${filter.value}%`);
        break;
      case "starts_with":
        conditions.push(`${col} LIKE ?`);
        params.push(`${filter.value}%`);
        break;
      default:
        throw new Error(`Unsupported operator: ${filter.operator}`);
    }
  }

  return {
    where: `WHERE ${conditions.join(" AND ")}`,
    params,
  };
}

export function queryDatastore(
  tableName: string,
  columns: DatastoreColumn[],
  query: {
    limit: number;
    offset: number;
    sort?: string;
    order: "asc" | "desc";
    filters?: Array<{
      column: string;
      operator: string;
      value: string | number;
    }>;
  }
): { records: Record<string, unknown>[]; total: number } {
  const db = getDb();
  try {
    const { where, params } = buildFilterClause(
      query.filters ?? [],
      columns
    );

    let orderClause = "";
    if (query.sort && validateColumn(query.sort, columns)) {
      orderClause = `ORDER BY "${query.sort}" ${query.order === "desc" ? "DESC" : "ASC"}`;
    }

    const countSql = `SELECT COUNT(*) as count FROM "${tableName}" ${where}`;
    const countResult = db.prepare(countSql).get(...params) as {
      count: number;
    };

    const selectCols = columns.map((c) => `"${c.name}"`).join(", ");
    const dataSql = `SELECT ${selectCols} FROM "${tableName}" ${where} ${orderClause} LIMIT ? OFFSET ?`;
    const records = db
      .prepare(dataSql)
      .all(...params, query.limit, query.offset) as Record<string, unknown>[];

    return { records, total: countResult.count };
  } finally {
    db.close();
  }
}

const FORBIDDEN_KEYWORDS = [
  "INSERT",
  "UPDATE",
  "DELETE",
  "DROP",
  "ALTER",
  "CREATE",
  "ATTACH",
  "DETACH",
  "PRAGMA",
  "VACUUM",
  "REPLACE",
  "GRANT",
  "REVOKE",
  "BEGIN",
  "COMMIT",
  "ROLLBACK",
  "SAVEPOINT",
];

export function validateSql(sql: string): { valid: boolean; error?: string } {
  const trimmed = sql.trim();

  if (trimmed.includes(";")) {
    return { valid: false, error: "Multiple statements not allowed" };
  }

  const upper = trimmed.toUpperCase();

  if (!upper.startsWith("SELECT")) {
    return { valid: false, error: "Only SELECT statements are allowed" };
  }

  for (const keyword of FORBIDDEN_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, "i");
    if (regex.test(trimmed)) {
      return {
        valid: false,
        error: `Forbidden keyword: ${keyword}`,
      };
    }
  }

  // Extract table names from FROM and JOIN clauses
  const tablePattern = /\b(?:FROM|JOIN)\s+["']?(\w+)["']?/gi;
  let match;
  while ((match = tablePattern.exec(trimmed)) !== null) {
    const table = match[1];
    if (!table.startsWith("ds_")) {
      return {
        valid: false,
        error: `Access denied to table: ${table}. Only ds_* tables are allowed`,
      };
    }
  }

  return { valid: true };
}

export function executeSql(sql: string): {
  columns: string[];
  records: Record<string, unknown>[];
  executionTime: number;
} {
  const validation = validateSql(sql);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const db = getDb();
  try {
    const start = performance.now();
    const stmt = db.prepare(sql);
    const records = stmt.all() as Record<string, unknown>[];
    const executionTime = Math.round(performance.now() - start);

    const columns =
      records.length > 0 ? Object.keys(records[0]) : [];

    return { columns, records, executionTime };
  } finally {
    db.close();
  }
}

export function deleteDatastoreTable(tableName: string): void {
  if (!tableName.startsWith("ds_")) {
    throw new Error("Invalid datastore table name");
  }
  const db = getDb();
  try {
    db.exec(`DROP TABLE IF EXISTS "${tableName}"`);
  } finally {
    db.close();
  }
}
