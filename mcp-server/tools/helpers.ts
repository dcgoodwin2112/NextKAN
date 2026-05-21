import path from "node:path";

import { ErrorCode } from "@modelcontextprotocol/sdk/types.js";

import { prisma } from "@/lib/db";

import { mcpAuthContext, type McpAuthContext } from "../context";
import { logger } from "../logger";
import { toolError } from "./errors";

/** Canonical NextKAN column type strings. Mirrors `src/lib/duckdb/types.ts`. */
export type CanonicalType =
  | "boolean"
  | "integer"
  | "number"
  | "string"
  | "date"
  | "datetime"
  | "json"
  | "geometry";

/** Slim view of a column used by tool input validation + SQL building. */
export interface ColumnView {
  name: string;
  type: CanonicalType;
  filterable: boolean;
  aggregatable: boolean;
  isPii: boolean;
  isGeometry: boolean;
  /** Position in the resource schema (sortOrder). */
  position: number;
}

/** Full Distribution + Dataset row with dictionary fields loaded. */
export type ResourceWithColumns = {
  id: string;
  parquetPath: string | null;
  rowCount: number | null;
  fileName: string | null;
  mediaType: string | null;
  title: string | null;
  description: string | null;
  downloadURL: string | null;
  datasetId: string;
  datasetTitle: string;
  datasetStatus: string;
  columns: ColumnView[];
};

/** Resolve `NEXTKAN_STORAGE_PATH` to an absolute path; defaults to `./storage`. */
export function storageRoot(): string {
  return path.resolve(process.env.NEXTKAN_STORAGE_PATH ?? "./storage");
}

/** Absolute Parquet path for a queryable resource. Throws if not queryable. */
export function resourceParquetPath(r: ResourceWithColumns): string {
  if (!r.parquetPath) {
    throw toolError({
      errorType: "RESOURCE_NOT_QUERYABLE",
      message: `Resource ${r.id} has no Parquet representation`,
    });
  }
  return path.resolve(storageRoot(), r.parquetPath);
}

/** Look up a Dataset by id or slug or identifier; only published rows are visible. */
export async function loadPublishedDataset(idOrSlug: string) {
  const dataset = await prisma.dataset.findFirst({
    where: {
      OR: [{ id: idOrSlug }, { slug: idOrSlug }, { identifier: idOrSlug }],
      status: "published",
      deletedAt: null,
    },
    include: {
      publisher: true,
      themes: { include: { theme: true } },
      keywords: true,
      distributions: {
        orderBy: { sortOrder: "asc" },
        include: {
          dataDictionary: {
            include: { fields: { orderBy: { sortOrder: "asc" } } },
          },
        },
      },
    },
  });
  if (!dataset) {
    throw toolError({
      errorType: "DATASET_NOT_FOUND",
      message: `Dataset not found or not published: ${idOrSlug}`,
    });
  }
  return dataset;
}

/** Load a distribution + its column metadata, gated on the dataset being published. */
export async function loadResourceWithColumns(
  resourceId: string,
): Promise<ResourceWithColumns> {
  const distribution = await prisma.distribution.findUnique({
    where: { id: resourceId },
    include: {
      dataset: { select: { id: true, title: true, status: true, deletedAt: true } },
      dataDictionary: {
        include: { fields: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });
  if (!distribution) {
    throw toolError({
      errorType: "RESOURCE_NOT_FOUND",
      message: `Resource not found: ${resourceId}`,
    });
  }
  if (distribution.dataset.status !== "published" || distribution.dataset.deletedAt) {
    throw toolError({
      errorType: "RESOURCE_NOT_FOUND",
      message: `Resource not found: ${resourceId}`,
    });
  }

  const columns: ColumnView[] = (distribution.dataDictionary?.fields ?? []).map(
    (f, i) => ({
      name: f.name,
      type: (f.type as CanonicalType) ?? "string",
      filterable: f.filterable,
      aggregatable: f.aggregatable,
      isPii: f.isPii,
      isGeometry: f.isGeometry,
      position: f.sortOrder ?? i,
    }),
  );

  return {
    id: distribution.id,
    parquetPath: distribution.parquetPath,
    rowCount: distribution.rowCount,
    fileName: distribution.fileName,
    mediaType: distribution.mediaType,
    title: distribution.title,
    description: distribution.description,
    downloadURL: distribution.downloadURL,
    datasetId: distribution.dataset.id,
    datasetTitle: distribution.dataset.title,
    datasetStatus: distribution.dataset.status,
    columns,
  };
}

/** Assert the current request was authenticated with at least the given scope.
 *  Throws UNAUTHORIZED otherwise. This is defense-in-depth: anonymous clients
 *  should never reach an admin tool handler because admin tools are filtered
 *  out of `tools/list` for unauthenticated requests (see `createMcpServer`).
 *  Still, every admin tool calls this on entry so a bug in registration or a
 *  malformed client request cannot bypass the gate. */
export function requireScope(scope: "admin"): McpAuthContext {
  const auth = mcpAuthContext.getStore();
  if (!auth) {
    throw toolError({
      errorType: "UNAUTHORIZED",
      message: "This tool requires authentication. Provide a bearer token with the required scope.",
      code: ErrorCode.InvalidRequest,
    });
  }
  if (scope === "admin" && auth.scope !== "admin") {
    throw toolError({
      errorType: "UNAUTHORIZED",
      message: `This tool requires an 'admin' scope token; this token's scope is '${auth.scope}'.`,
      code: ErrorCode.InvalidRequest,
    });
  }
  return auth;
}

/** Lookup a column by name; throws COLUMN_NOT_FOUND if absent. */
export function requireColumn(
  resource: ResourceWithColumns,
  columnName: string,
): ColumnView {
  const col = resource.columns.find((c) => c.name === columnName);
  if (!col) {
    throw toolError({
      errorType: "COLUMN_NOT_FOUND",
      message: `Column not found on resource ${resource.id}: ${columnName}`,
      details: {
        availableColumns: resource.columns.map((c) => c.name),
      },
    });
  }
  return col;
}

/** Assert the column is filterable; throws COLUMN_NOT_FILTERABLE with hints otherwise. */
export function requireFilterable(
  resource: ResourceWithColumns,
  columnName: string,
): ColumnView {
  const col = requireColumn(resource, columnName);
  if (!col.filterable) {
    const filterable = resource.columns.filter((c) => c.filterable).map((c) => c.name);
    throw toolError({
      errorType: "COLUMN_NOT_FILTERABLE",
      message:
        `Column \`${columnName}\` is not filterable. ` +
        (filterable.length
          ? `Filterable columns on this resource: ${filterable
              .map((n) => `\`${n}\``)
              .join(", ")}.`
          : "No filterable columns are configured on this resource."),
      details: { filterable },
    });
  }
  return col;
}

/** Assert the column is aggregatable; throws COLUMN_NOT_AGGREGATABLE otherwise. */
export function requireAggregatable(
  resource: ResourceWithColumns,
  columnName: string,
): ColumnView {
  const col = requireColumn(resource, columnName);
  if (!col.aggregatable) {
    const aggregatable = resource.columns
      .filter((c) => c.aggregatable)
      .map((c) => c.name);
    throw toolError({
      errorType: "COLUMN_NOT_AGGREGATABLE",
      message:
        `Column \`${columnName}\` is not aggregatable. ` +
        (aggregatable.length
          ? `Aggregatable columns on this resource: ${aggregatable
              .map((n) => `\`${n}\``)
              .join(", ")}.`
          : "No aggregatable columns are configured on this resource."),
      details: { aggregatable },
    });
  }
  return col;
}

/** Default projection columns for query/sample tools; omits PII unless opted in. */
export function defaultProjectionColumns(
  resource: ResourceWithColumns,
  includePii: boolean,
): ColumnView[] {
  return includePii ? resource.columns : resource.columns.filter((c) => !c.isPii);
}

/** Reject an explicitly-named PII column when includePii is false. */
export function requireNonPii(
  resource: ResourceWithColumns,
  columnName: string,
  includePii: boolean,
): ColumnView {
  const col = requireColumn(resource, columnName);
  if (col.isPii && !includePii) {
    throw toolError({
      errorType: "COLUMN_IS_PII",
      message:
        `Column \`${columnName}\` is flagged as PII. ` +
        `Pass \`includePii: true\` to opt in.`,
      details: { column: columnName, isPii: true },
    });
  }
  return col;
}

/** Wrap a value into the structured-content tool response shape. */
export function structuredResult<T>(value: T) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value) }],
    structuredContent: value as unknown as Record<string, unknown>,
  };
}

/**
 * Run a tool implementation and convert any thrown error into a structured
 * tool-error result. The MCP SDK otherwise swallows `McpError.data` — wrapping
 * here preserves the `errorType` field that the spec requires.
 */
export async function withToolErrorHandling<T>(
  toolName: string,
  args: unknown,
  run: () => Promise<T>,
): Promise<
  | { content: Array<{ type: "text"; text: string }>; structuredContent: Record<string, unknown> }
  | { content: Array<{ type: "text"; text: string }>; structuredContent: Record<string, unknown>; isError: true }
> {
  try {
    const value = await run();
    return structuredResult(value);
  } catch (err) {
    const dataObj = extractObject((err as { data?: unknown })?.data);
    const errorPayload: Record<string, unknown> = {
      errorType: getStringField(dataObj, "errorType") ?? "INTERNAL_ERROR",
      message: err instanceof Error ? err.message : String(err),
      ...(dataObj ?? {}),
    };
    logger.error({ err, tool: toolName, args }, `mcp tool ${toolName} failed`);
    return {
      content: [{ type: "text", text: JSON.stringify(errorPayload) }],
      structuredContent: errorPayload,
      isError: true,
    };
  }
}

function extractObject(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

function getStringField(
  obj: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  if (!obj) return undefined;
  const v = obj[key];
  return typeof v === "string" ? v : undefined;
}

/** Parse a JSON array stored in `DataDictionaryField` JSON columns. */
export function parseJsonArray(raw: string | null): unknown[] | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}
