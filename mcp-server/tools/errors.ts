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
  | "INTERNAL_ERROR"
  // Defense-in-depth for admin-tier tools. Anonymous clients should not see
  // these tools in tools/list at all (they're filtered at registration time
  // in createMcpServer), so this error should be unreachable in normal use.
  // It still fires if a misbehaving client constructs a tools/call request
  // for an admin tool while unauthenticated.
  | "UNAUTHORIZED"
  // Authenticated but the token's user lacks permission for the requested
  // entity — e.g. an `orgAdmin` editing a dataset owned by a different org.
  // Distinguished from UNAUTHORIZED so agents can tell "log in" apart from
  // "you can't touch this resource."
  | "FORBIDDEN";

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
