# MCP Server Specification

**Status:** Authoritative spec for the NextKAN MCP server (Tier 1.5 deliverable).
**Audience:** Implementer building `mcp-server/` and anyone integrating MCP clients with NextKAN.

This document specifies the agent-facing contract: what tools the MCP server exposes, how they behave, and the operational guarantees around them.

## Codebase reconciliation (added 2026-05-18)

The agent-facing JSON shape (tool inputs, outputs, error codes) is the authoritative contract — keep it exactly as specified. Internally, the MCP server maps onto **existing** Prisma models:

- "Resource" in this spec → `Distribution` in Prisma (with `parquetPath`, `originalPath` fields added in Phase 2 of the rollout)
- "Column" in this spec → `DataDictionaryField` in Prisma (with stats + agent-readiness flags added in Phase 2)
- The output shape uses `resourceId`, `columns[]`, etc. as documented; the server just translates `Distribution`/`DataDictionaryField` rows into that shape.
- `Distribution.parquetPath` is the gate: `queryable: true` iff non-null. Distributions imported pre-Parquet keep working in the legacy `/api/datastore/sql` (SQLite) path but return `RESOURCE_NOT_QUERYABLE` from MCP `query_dataset` / `aggregate_dataset` / `sample_dataset`.
- DuckDB helpers shared with profiling live under `src/lib/duckdb/` (NOT `src/lib/datastore/`).

See `~/.claude/plans/users-dgoodwin-downloads-cluade-nextkan-radiant-giraffe.md` for the full phased rollout.

## Architecture summary

The MCP server is a separate Node.js process (`mcp-server/`) sharing the NextKAN database and storage layer with the Next.js admin. It speaks Model Context Protocol over Streamable HTTP and serves read-only queries against the catalog.

- **Transport:** Streamable HTTP (MCP spec 2025-11-25), single `/mcp` endpoint accepting POST and GET.
- **Session mode:** Stateless. No session storage, no `MCP-Session-Id` issuance. Each request is independent.
- **Authentication:** Anonymous read by default. No write tools in v1. Bearer token mechanism documented but not implemented.
- **Concurrency:** In-process query queue (`p-limit`, concurrency = 4). Per-IP rate limiting.
- **Caching:** LRU result cache with 60-second TTL, keyed on tool name + sorted input hash.
- **Process model:** One sibling Node.js process, deployed alongside the Next.js admin via Docker Compose.

## Dependencies

```typescript
// In mcp-server/server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
```

Package versions:

- `@modelcontextprotocol/sdk`: `^1.5.0`
- `@modelcontextprotocol/node`: latest
- `@duckdb/node-api`: `^1.5.0` (shared with admin)
- `hono`: latest
- `@hono/node-server`: latest
- `p-limit`: latest
- `lru-cache`: latest

## Configuration

Environment variables:

```
NEXTKAN_MCP_PORT=3001
NEXTKAN_MCP_HOST=0.0.0.0
NEXTKAN_MCP_RATE_LIMIT_PER_MINUTE=60
NEXTKAN_MCP_RATE_LIMIT_PER_HOUR=600
NEXTKAN_MCP_CACHE_SIZE_MB=100
NEXTKAN_MCP_CACHE_TTL_SECONDS=60
NEXTKAN_MCP_QUERY_CONCURRENCY=4
NEXTKAN_MCP_QUERY_TIMEOUT_MS=30000
NEXTKAN_DUCKDB_MEMORY_LIMIT=2GB
NEXTKAN_DUCKDB_THREADS=4
```

## Endpoint

Single endpoint: `POST /mcp`

- Accepts JSON-RPC messages per the MCP spec.
- Returns JSON responses directly (set `enableJsonResponse: true` on the transport).
- Validates `Origin` header to prevent DNS rebinding attacks.
- Returns standard rate limit headers on every response:
  - `X-RateLimit-Limit-Minute`
  - `X-RateLimit-Remaining-Minute`
  - `X-RateLimit-Limit-Hour`
  - `X-RateLimit-Remaining-Hour`
  - `Retry-After` (on 429)

A `GET /mcp` request returns 405 Method Not Allowed with a brief description, since stateless mode doesn't need GET upgrade.

A `GET /health` endpoint returns `{ status: "ok", duckdb: "ready" }` for liveness checks.

## Tool surface

Six tools. All read-only. All return JSON. All enforce hard limits.

### Tool: `list_datasets`

List published datasets with optional filtering.

**Input schema:**

```typescript
{
  query?: string;          // full-text search across title/description, max 200 chars
  themes?: string[];       // filter by theme (any-match)
  limit?: number;          // default 20, max 100
  offset?: number;         // default 0, max 10_000
}
```

**Behavior:**

- Returns datasets where `isPublished = true`.
- Full-text search uses Prisma's built-in capabilities (or `LIKE` for SQLite).
- Results ordered by `modified` descending.

**Output schema:**

```typescript
{
  datasets: Array<{
    id: string;
    identifier: string;
    title: string;
    description: string;
    themes: string[];
    keywords: string[];
    publisher: string;
    modified: string;        // ISO 8601
    resourceCount: number;
  }>;
  totalCount: number;
  hasMore: boolean;
}
```

**Implementation notes:**

- Pure Prisma query. No DuckDB involvement.
- Cache key: hash of inputs. TTL 60s.

### Tool: `get_dataset`

Full metadata for one dataset, including all resources and their columns.

**Input schema:**

```typescript
{
  datasetId: string;       // either the cuid or the slug/identifier
}
```

**Output schema:**

```typescript
{
  id: string;
  identifier: string;
  title: string;
  description: string;
  themes: string[];
  keywords: string[];
  publisher: string;
  contactPoint: { name: string; email?: string };
  license: string;
  temporal?: string;
  spatial?: string;
  modified: string;
  resources: Array<{
    id: string;
    name: string;
    description?: string;
    mediaType: string;
    rowCount?: number;
    downloadUrl?: string;
    queryable: boolean;     // true iff parquetPath is set
    columns: Array<{
      name: string;
      type: string;
      title?: string;
      description?: string;
      unit?: string;
      filterable: boolean;
      aggregatable: boolean;
      isPii: boolean;
      isGeometry: boolean;
      // statistics intentionally omitted from this view — use `get_schema` for full detail
    }>;
  }>;
}
```

**Implementation notes:**

- Pure Prisma query.
- Errors: `DATASET_NOT_FOUND` if no match or not published.

### Tool: `get_schema`

Full column schema for a single resource. Lighter-weight than `get_dataset` when the agent only needs column info.

**Input schema:**

```typescript
{
  resourceId: string;
}
```

**Output schema:**

```typescript
{
  resourceId: string;
  rowCount?: number;
  columns: Array<{
    name: string;
    position: number;
    type: string;
    title?: string;
    description?: string;
    unit?: string;
    nullable: boolean;
    distinctCount?: number;
    min?: string;
    max?: string;
    sampleValues?: unknown[];
    enumValues?: unknown[];
    filterable: boolean;
    aggregatable: boolean;
    isPii: boolean;
    isGeometry: boolean;
    crs?: string;
  }>;
}
```

**Implementation notes:**

- Pure Prisma query. No DuckDB hit.
- Most agent workflows should call this first to understand the data before querying.

### Tool: `query_dataset`

Retrieve rows from a resource's underlying Parquet data, with filters and projection.

**Input schema:**

```typescript
{
  resourceId: string;
  columns?: string[];               // projection; default = all non-PII
  filters?: Array<{
    column: string;
    operator: "=" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "contains" | "starts_with" | "is_null" | "is_not_null";
    value?: unknown;                // required for all operators except is_null/is_not_null
  }>;
  orderBy?: Array<{ column: string; direction: "asc" | "desc" }>;
  limit?: number;                   // default 100, max 10_000
  offset?: number;                  // default 0, max 100_000
  includePii?: boolean;             // default false; opt-in for PII columns
}
```

**Validation rules (enforced before query execution):**

- All filter columns must have `filterable: true`. Reject with `COLUMN_NOT_FILTERABLE` otherwise, including the column name in the error.
- `limit` capped at 10,000. Values above are clamped silently with a warning in the response.
- `offset + limit` capped at 100,000 to prevent abusive pagination through the entire dataset.
- Resource must have `parquetPath` set (i.e., `queryable: true`). Reject with `RESOURCE_NOT_QUERYABLE` otherwise.
- Operator types must match column types (e.g., `<` only on numeric/date columns). Use canonical type for compatibility check.
- When `columns` is unspecified, the projection contains every non-PII column (i.e., columns with `isPii: false`). Pass `includePii: true` to project all columns.
- When `columns` is supplied, every named PII column is rejected with `COLUMN_IS_PII` unless `includePii: true`.

**Behavior:**

- Constructs a DuckDB SQL query against `storage/<parquetPath>`.
- Uses parameterized values (no SQL injection surface even though we control construction).
- Runs through the in-process concurrency queue.
- Result-cached.

**Output schema:**

```typescript
{
  rows: Array<Record<string, unknown>>;
  rowCount: number;        // number of rows returned
  truncated: boolean;      // true if more rows exist beyond limit + offset
  warnings?: string[];     // e.g., "limit clamped to 10000"
}
```

**SQL construction example:**

```sql
SELECT col_a, col_b
FROM read_parquet('/storage/resources/abc/data.parquet')
WHERE col_a > ?
  AND col_b IN (?, ?, ?)
ORDER BY col_b DESC
LIMIT 100 OFFSET 0;
```

### Tool: `aggregate_dataset`

Group-by aggregation against a resource. This is the cheap analytical path — encourage agents toward it for aggregate questions.

**Input schema:**

```typescript
{
  resourceId: string;
  groupBy: string[];                // required, max 5 columns
  metrics: Array<{
    column?: string;                // omit for "count_all"
    function: "count" | "count_all" | "count_distinct" | "sum" | "avg" | "min" | "max" | "median" | "stddev";
    alias?: string;                 // result column name; default = "<function>_<column>"
  }>;
  filters?: Array<{                 // same shape as query_dataset
    column: string;
    operator: string;
    value?: unknown;
  }>;
  orderBy?: Array<{ column: string; direction: "asc" | "desc" }>;
  limit?: number;                   // default 100, max 10_000
  includePii?: boolean;             // default false; opt-in for PII columns
}
```

**Validation rules:**

- All `groupBy` columns must have `filterable: true` (high-cardinality grouping is expensive).
- All metric columns (where not `count_all`) must have `aggregatable: true`.
- Filter columns must have `filterable: true` (same as `query_dataset`).
- `sum`, `avg`, `median`, `stddev` only valid on numeric columns.
- Any `groupBy` or metric column with `isPii: true` is rejected with `COLUMN_IS_PII` unless `includePii: true`. PII values leak through grouping keys and `MIN` / `MAX` metrics.

**Output schema:**

```typescript
{
  groups: Array<Record<string, unknown>>;  // each row has groupBy columns + metric aliases
  rowCount: number;
  warnings?: string[];
}
```

**SQL construction example:**

```sql
SELECT region, COUNT(*) AS count_all, AVG(amount) AS avg_amount
FROM read_parquet('/storage/resources/abc/data.parquet')
WHERE year >= ?
GROUP BY region
ORDER BY avg_amount DESC
LIMIT 100;
```

### Tool: `sample_dataset`

N random rows. Useful for "what does this data look like" agent exploration.

**Input schema:**

```typescript
{
  resourceId: string;
  n?: number;                       // default 10, max 100
  includePii?: boolean;             // default false; opt-in for PII columns
}
```

**Validation rules:**

- Resource must have `parquetPath` set; otherwise `RESOURCE_NOT_QUERYABLE`.
- By default, PII columns (`isPii: true`) are omitted from the projection. Pass `includePii: true` to include them.

**Output schema:**

```typescript
{
  rows: Array<Record<string, unknown>>;
}
```

**SQL (with `includePii: false`):**

```sql
SELECT col_a, col_b FROM read_parquet('/storage/resources/abc/data.parquet')
USING SAMPLE n ROWS;
-- PII columns are omitted from the SELECT list.
```

## Cross-cutting concerns

### Rate limiting

Per-IP, two windows:

- Per-minute limit (default 60 requests)
- Per-hour limit (default 600 requests)

When exceeded:

- Return HTTP 429.
- Include `Retry-After` header with seconds until next allowed request.
- Include `X-RateLimit-*` headers per the standard.
- Body: JSON-RPC error with code `-32000` and message `"Rate limit exceeded"`.

Implementation: simple in-memory token bucket via Hono middleware. Keyed on `X-Forwarded-For` (first value) or `RemoteAddr`. Document in README that production deployments should put a real proxy in front for IP determination.

### Concurrency control

In-process query queue using `p-limit` with concurrency = 4. Wraps every DuckDB query (used by `query_dataset`, `aggregate_dataset`, `sample_dataset`).

When the queue is full, requests wait. If the queue depth exceeds 20, return HTTP 503 immediately with a `Retry-After` of a few seconds. Don't let the queue grow unbounded.

### Result caching

LRU cache (`lru-cache`), 100MB max, 60s TTL. Key construction:

```typescript
const key = `${toolName}:${stableStringify(canonicalizedInput)}`;
```

Where `canonicalizedInput` has sorted keys, lowercased identifiers, etc. Use `lru-cache`'s `sizeCalculation` to weight entries by serialized result size.

Cache only successful results. Errors are not cached.

### DuckDB connection management

One `DuckDBInstance` for the process, created at startup. Connections are short-lived: open one per query, close after.

Configuration set at instance creation:

```typescript
const instance = await DuckDBInstance.create(":memory:", {
  memory_limit: process.env.NEXTKAN_DUCKDB_MEMORY_LIMIT ?? "2GB",
  threads: process.env.NEXTKAN_DUCKDB_THREADS ?? "4",
  preserve_insertion_order: "false",
  access_mode: "READ_ONLY",
});
```

The DuckDB instance has no persistent database — it queries Parquet files directly via `read_parquet('<path>')` for each query.

### Query timeouts

Per-query timeout via `AbortController` (default 30 seconds). Aborted queries return a JSON-RPC error with code `-32001` and message `"Query timeout"`.

### Memory safety

DuckDB's memory limit is set at instance creation. If a query exceeds it, DuckDB throws an out-of-memory error. The MCP server catches this, returns a JSON-RPC error with code `-32002` and message `"Query exceeded memory limit. Try filtering more aggressively or reducing the result size."`

### Logging

Structured logs (pino or similar) for every tool invocation:

```json
{
  "ts": "2026-05-17T10:00:00Z",
  "tool": "query_dataset",
  "resourceId": "...",
  "ip": "...",
  "cacheHit": false,
  "durationMs": 142,
  "rowsReturned": 100,
  "status": "ok"
}
```

Don't log query inputs verbatim — they may include filter values that could be sensitive (even though the data is public, the queries themselves shouldn't leak via logs).

## Error response format

All errors return JSON-RPC error responses per the MCP spec:

```json
{
  "jsonrpc": "2.0",
  "id": "...",
  "error": {
    "code": -32600,
    "message": "Human-readable description",
    "data": {
      "errorType": "DATASET_NOT_FOUND",
      "details": "..."
    }
  }
}
```

Standard error types:

| Error type                  | Code     | When                                                   |
|-----------------------------|----------|--------------------------------------------------------|
| `DATASET_NOT_FOUND`         | -32602   | Dataset doesn't exist or isn't published               |
| `RESOURCE_NOT_FOUND`        | -32602   | Resource doesn't exist                                 |
| `RESOURCE_NOT_QUERYABLE`    | -32602   | Resource has no Parquet representation                 |
| `COLUMN_NOT_FOUND`          | -32602   | Referenced column doesn't exist in the resource        |
| `COLUMN_NOT_FILTERABLE`     | -32602   | Filter column lacks `filterable: true`                 |
| `COLUMN_NOT_AGGREGATABLE`   | -32602   | Metric column lacks `aggregatable: true`               |
| `COLUMN_IS_PII`             | -32602   | PII column referenced without `includePii: true`       |
| `INVALID_INPUT`             | -32602   | Zod validation failed                                  |
| `RATE_LIMIT_EXCEEDED`       | -32000   | Per-IP rate limit exceeded                             |
| `QUERY_TIMEOUT`             | -32001   | DuckDB query exceeded timeout                          |
| `MEMORY_LIMIT_EXCEEDED`     | -32002   | DuckDB hit memory limit                                |
| `INTERNAL_ERROR`            | -32603   | Unexpected server error                                |

Error messages should be informative and actionable. For `COLUMN_NOT_FILTERABLE`, include suggested alternatives: "Column `description` is not filterable. Filterable columns on this resource: `region`, `year`, `category`."

## Process lifecycle

### Startup

1. Load env config.
2. Initialize DuckDB instance with memory and thread limits.
3. Initialize Prisma client (shared with admin).
4. Create the MCP server, register all tools.
5. Attach Streamable HTTP transport.
6. Start Hono server on configured port.
7. Log "MCP server ready on port N".

### Shutdown

Handle SIGTERM and SIGINT gracefully:

1. Stop accepting new requests.
2. Drain the concurrency queue (wait for in-flight queries to finish, max 10s).
3. Close DuckDB instance.
4. Disconnect Prisma client.
5. Exit cleanly.

### Health

`GET /health` returns 200 with `{ status: "ok", duckdb: "ready", uptime: <seconds> }` once startup completes. Returns 503 during shutdown.

## Deployment

`docker-compose.yml` defines two services backed by the same image:

```yaml
services:
  admin:
    build: .
    command: npm run start
    ports: ["3000:3000"]
    volumes: ["./storage:/app/storage"]
    environment:
      - DATABASE_URL=...
      - ANTHROPIC_API_KEY=...
  mcp:
    build: .
    command: npm run mcp:start
    ports: ["3001:3001"]
    volumes: ["./storage:/app/storage"]
    environment:
      - DATABASE_URL=...
```

Note both services mount the same storage volume and connect to the same database.

## Future work (out of scope for v1)

Document but don't implement:

- **Bearer token authentication.** Optional per-deployment, used for elevated rate limits. Schema: tokens stored on a `MCPToken` Prisma model, hashed, with `rateLimitMultiplier` and `expiresAt`.
- **OAuth 2.1 with PKCE.** For deployments that need per-user attribution. Would use the `mcp-auth` library or similar.
- **Write tools** (`publish_dataset`, `update_column_description`). Would require auth and a write path through Server Actions.
- **stdio transport.** For local-Claude-Desktop scenarios. Trivially added later (different entry point, same tools).
- **Quack protocol.** DuckDB's new multi-writer client-server protocol. Not needed for single-process NextKAN, but interesting for multi-node deployments.
- **DuckLake format.** Multi-writer Parquet via PostgreSQL catalog. Not needed for v1.
- **HTTP/S3 storage.** Switch Parquet path from local disk to S3/R2 via DuckDB's `httpfs` extension. Minimal code change when needed.
- **`DataService` in DCAT-US v3.0.** Describe the MCP endpoint as a first-class catalog service in the published metadata.
- **Partitioned Parquet** for append-only datasets. `read_parquet('storage/resources/abc/parts/*.parquet')` with Hive-style partitioning.
- **Tool: `compare_datasets`.** Two-resource joins/comparisons. Real value but adds complexity.

## Reference: connecting clients

For documentation purposes only — exact paths depend on the client.

**Claude Desktop** (via Custom Connectors, requires Pro/Max/Team/Enterprise plan):
- Settings → Connectors → Add custom connector
- URL: `http://localhost:3001/mcp` (local) or your deployed URL

**Claude API** (via `mcp_servers` parameter):
```json
{
  "type": "url",
  "url": "https://your-nextkan.example.gov/mcp",
  "name": "nextkan-catalog"
}
```

**MCP Inspector** (for debugging):
```
npx @modelcontextprotocol/inspector
# Then point at http://localhost:3001/mcp
```

**Claude Code:**
```
claude mcp add --transport http nextkan https://your-nextkan.example.gov/mcp
```
