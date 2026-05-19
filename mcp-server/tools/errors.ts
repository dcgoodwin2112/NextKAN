import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";

/** Error type strings exposed to clients via the `data.errorType` field. */
export type ToolErrorType =
  | "DATASET_NOT_FOUND"
  | "RESOURCE_NOT_FOUND"
  | "RESOURCE_NOT_QUERYABLE"
  | "COLUMN_NOT_FOUND"
  | "COLUMN_NOT_FILTERABLE"
  | "COLUMN_NOT_AGGREGATABLE"
  | "COLUMN_IS_PII"
  | "INVALID_INPUT"
  | "QUERY_TIMEOUT"
  | "MEMORY_LIMIT_EXCEEDED"
  | "INTERNAL_ERROR";

interface ToolErrorOptions {
  errorType: ToolErrorType;
  message: string;
  details?: Record<string, unknown>;
  /** JSON-RPC code; defaults to InvalidParams for input-shaped errors. */
  code?: ErrorCode;
}

/** Build an `McpError` with structured tool-error data. */
export function toolError(opts: ToolErrorOptions): McpError {
  return new McpError(opts.code ?? ErrorCode.InvalidParams, opts.message, {
    errorType: opts.errorType,
    ...(opts.details ?? {}),
  });
}
