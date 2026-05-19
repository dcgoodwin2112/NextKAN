# Tier 1.5: Agent-First MVP Implementation

**Status:** In progress — implement after Tier 1 is complete.
**Prerequisite:** `docs/pivot-context.md`. Read it first if you haven't.
**Tests required:** See per-feature test sections below and `docs/testing-addenda.md`.

This document specifies the concrete work to extend NextKAN from a human-first catalog (Tier 1) to an agent-first catalog. Each feature includes file paths, schemas, dependencies, and acceptance criteria.

## Codebase reconciliation (added 2026-05-18)

This doc was drafted before a codebase audit. Where it proposes a new `Resource` or `Column` model, the actual implementation **extends existing models** instead. Reconciliation summary:

- **Feature 2 (Resource & Column schema):** Extend `Distribution` with `parquetPath`, `originalPath`, `rowCount`, `profileStatus`, `profileError`, `profiledAt`. Extend `DataDictionaryField` with `duckdbType`, `rowCount`/`nullCount`/`distinctCount`/`min`/`max`/`sampleValues`/`enumValues`, plus agent-readiness flags (`filterable`, `aggregatable`, `isPii`, `isGeometry`, `crs`) and `descriptionSource`. **Do not create a new `Resource` model.**
- **Feature 3 (Profiling library):** Put DuckDB helpers under `src/lib/duckdb/` — NOT `src/lib/datastore/`, which would collide with the existing SQLite-backed `src/lib/services/datastore.ts`.
- **Feature 4 (Upload pipeline):** Layer Parquet conversion + profiling onto the **existing** upload flow at `src/lib/services/datastore.ts` and `src/app/api/upload/`. Both paths run on upload; SQLite import + Parquet profile co-exist. Failure of one doesn't break the other.
- **Feature 11 (Quality scoring):** Already exists at `src/lib/services/data-quality.ts` with 8 metrics. **Extend** it with agent-readiness dimensions, don't replace it.
- **Storage layout:** New uploads go under `storage/resources/<distId>/` (per pivot doc). Existing uploads keep working from `public/uploads/` via `Distribution.filePath`.
- **MCP server (`mcp-server/`):** internally references `Distribution` everywhere it touches Prisma; the agent-facing JSON shape still uses the field names from `docs/mcp-server-spec.md`.

See `~/.claude/plans/users-dgoodwin-downloads-cluade-nextkan-radiant-giraffe.md` for the full phased rollout.

## Order of implementation

Implement features in this order. Each one builds on the previous, and tests should pass before moving on.

1. Dependency setup and storage layout
2. `Resource` and `Column` Prisma schema extension
3. Profiling library (DuckDB-based)
4. Upload pipeline (CSV → Parquet conversion + profiling)
5. AI adapter module (Anthropic SDK)
6. Upload-to-DCAT-US draft feature
7. Column-level AI annotation
8. MCP server scaffold (Streamable HTTP, stateless)
9. Core MCP tools (list, get, schema, query, aggregate, sample)
10. Agent preview pane in admin
11. Basic quality scoring

## Feature 1: Dependency setup and storage layout

### Dependencies to add

```bash
npm install @duckdb/node-api @anthropic-ai/sdk hono @hono/node-server p-limit lru-cache
npm install -D @types/node
```

**Pin notes:**

- `@duckdb/node-api`: pin to `^1.5.0`. **Do NOT use the deprecated `duckdb` package** — it won't see updates past DuckDB 1.4.x.
- `@anthropic-ai/sdk`: latest stable.
- `hono` + `@hono/node-server`: for the MCP server's HTTP layer.
- `p-limit`: in-process query concurrency limiter for DuckDB.
- `lru-cache`: result caching layer.

### Storage layout

Create the directory structure at the repo root:

```
storage/
  resources/
    .gitkeep
```

Add `storage/` to `.gitignore` (except `.gitkeep`).

Add to `.env.example`:

```
# Storage
NEXTKAN_STORAGE_PATH=./storage

# AI features (optional — AI features gracefully degrade when absent)
ANTHROPIC_API_KEY=
NEXTKAN_AI_MODEL=claude-sonnet-4-6

# Upload limits
NEXTKAN_UPLOAD_MAX_SIZE_MB=100
NEXTKAN_PROFILE_TIMEOUT_MS=30000

# DuckDB
NEXTKAN_DUCKDB_MEMORY_LIMIT=2GB
NEXTKAN_DUCKDB_THREADS=4
```

### Acceptance

- `npm install` completes without errors.
- `storage/resources/` directory exists.
- `.env.example` includes all variables above.

## Feature 2: Resource and Column schema extension

### Prisma schema changes

Extend `prisma/schema.prisma`:

```prisma
model Resource {
  id           String   @id @default(cuid())
  datasetId    String
  dataset      Dataset  @relation(fields: [datasetId], references: [id], onDelete: Cascade)

  // Identity & file
  name         String
  description  String?
  mediaType    String   // "text/csv", "application/json", "application/geo+json", etc.
  byteSize     Int?
  originalPath String?  // relative to NEXTKAN_STORAGE_PATH
  parquetPath  String?  // relative to NEXTKAN_STORAGE_PATH; null for non-tabular resources
  downloadUrl  String?  // public download URL (may be original file or external URL)

  // Profile (resource-level)
  rowCount     Int?
  profiledAt   DateTime?

  // Processing status (forward-compatible with async profiling)
  status       String   @default("ready")  // "pending" | "processing" | "ready" | "failed"
  statusError  String?

  columns      Column[]

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([datasetId])
}

model Column {
  id                String   @id @default(cuid())
  resourceId        String
  resource          Resource @relation(fields: [resourceId], references: [id], onDelete: Cascade)

  // Identity
  name              String   // column name as it appears in the data
  position          Int      // 0-based original order

  // Type (derived from DuckDB profile)
  type              String   // canonical: "string" | "integer" | "number" | "boolean" | "date" | "datetime" | "json" | "geometry"
  duckdbType        String   // actual DuckDB type for query construction (e.g. "VARCHAR", "BIGINT", "TIMESTAMP")
  nullable          Boolean  @default(true)
  unit              String?  // "USD", "meters", "°C", "%", etc.

  // Statistics (from DuckDB profile)
  rowCount          Int?
  nullCount         Int?
  distinctCount     Int?
  min               String?  // serialized; parse via `type`
  max               String?
  sampleValues      Json?    // JSON array of sample values

  // Semantics
  title             String?  // human-friendly label
  description       String?
  descriptionSource String?  // "manual" | "ai_generated" | "imported"
  enumValues        Json?    // JSON array for enum-like columns

  // Agent-readiness
  filterable        Boolean  @default(false)
  aggregatable      Boolean  @default(false)
  isPii             Boolean  @default(false)

  // Spatial
  isGeometry        Boolean  @default(false)
  crs               String?  // e.g., "EPSG:4326"

  // Extensibility
  extensions        Json?    // future Frictionless/DCAT fields, plugin annotations

  profiledAt        DateTime?

  @@unique([resourceId, name])
  @@index([resourceId])
  @@index([resourceId, position])
}
```

If `Resource` already exists in the schema with a different shape, reconcile carefully — don't drop existing fields.

### Migration

```bash
npx prisma db push
npx prisma generate
```

### Zod schemas

Create `src/lib/schemas/column.ts`:

```typescript
import { z } from "zod";

export const ColumnTypeSchema = z.enum([
  "string", "integer", "number", "boolean",
  "date", "datetime", "json", "geometry"
]);

export const ColumnSchema = z.object({
  name: z.string().min(1).max(200),
  position: z.number().int().nonnegative(),
  type: ColumnTypeSchema,
  duckdbType: z.string(),
  nullable: z.boolean().default(true),
  unit: z.string().optional(),
  rowCount: z.number().int().nonnegative().optional(),
  nullCount: z.number().int().nonnegative().optional(),
  distinctCount: z.number().int().nonnegative().optional(),
  min: z.string().optional(),
  max: z.string().optional(),
  sampleValues: z.array(z.unknown()).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  descriptionSource: z.enum(["manual", "ai_generated", "imported"]).optional(),
  enumValues: z.array(z.unknown()).optional(),
  filterable: z.boolean().default(false),
  aggregatable: z.boolean().default(false),
  isPii: z.boolean().default(false),
  isGeometry: z.boolean().default(false),
  crs: z.string().optional(),
  extensions: z.record(z.unknown()).optional(),
});

export type ColumnInput = z.infer<typeof ColumnSchema>;
```

Similarly update `src/lib/schemas/resource.ts` to include the new fields.

### Tests

- `src/lib/schemas/column.test.ts`: validate Zod schema accepts valid input, rejects invalid.
- Existing Resource tests: ensure they pass with the new optional fields.

### Acceptance

- Prisma generates without errors.
- A `Column` record can be created via Prisma client, linked to a `Resource`.
- Zod schemas pass validation tests.

## Feature 3: Profiling library

A pure-functional module that takes a file path and produces structured column metadata.

### Files

- `src/lib/profiling/index.ts` — main entry point
- `src/lib/profiling/duckdb.ts` — DuckDB connection helper
- `src/lib/profiling/types.ts` — type definitions
- `src/lib/profiling/pii.ts` — PII detection patterns
- `src/lib/profiling/index.test.ts` — tests

### Core API

```typescript
// src/lib/profiling/index.ts
import { ColumnInput } from "@/lib/schemas/column";

export interface ProfileResult {
  rowCount: number;
  columns: ColumnInput[];
  parquetPath: string;  // relative to storage root
}

export interface ProfileOptions {
  /** Absolute path to source file (CSV, JSON, Parquet, etc.) */
  sourcePath: string;
  /** Where to write the resulting Parquet file (absolute) */
  parquetTargetPath: string;
  /** MIME type, if known, to guide parsing */
  mediaType?: string;
  /** Max profiling time in ms before aborting */
  timeoutMs?: number;
}

export async function profileResource(opts: ProfileOptions): Promise<ProfileResult>;
```

### Implementation notes

The profiling pipeline does the following with a single DuckDB connection:

1. Auto-detect the source format (CSV, JSON, Parquet) via DuckDB's built-in sniffer.
2. Run `DESCRIBE SELECT * FROM '<source>'` to get the column schema.
3. For each column, compute statistics in a single query:
   ```sql
   SELECT
     COUNT(*) AS row_count,
     COUNT(<col>) AS non_null_count,
     COUNT(DISTINCT <col>) AS distinct_count,
     MIN(<col>) AS min_val,
     MAX(<col>) AS max_val
   FROM '<source>';
   ```
   Use a single query per column or batch via DuckDB's `SUMMARIZE` function: `SUMMARIZE SELECT * FROM '<source>'` returns one row per column with name, type, min, max, null counts, and approximate cardinality. Prefer `SUMMARIZE` for efficiency.
4. Sample 5 values per column (via `SELECT <col> FROM '<source>' USING SAMPLE 5`).
5. Run PII detection on string columns by checking sample values against regex patterns.
6. Compute `filterable` and `aggregatable` heuristics (see below).
7. Convert source to Parquet: `COPY (SELECT * FROM '<source>') TO '<parquet_target>' (FORMAT PARQUET, COMPRESSION ZSTD)`.
8. Map DuckDB types to canonical NextKAN types (see mapping table below).

Run profiling in a `worker_threads` worker to avoid blocking the Next.js event loop. Apply the timeout via `AbortController` and worker termination.

### DuckDB type mapping

| DuckDB type                          | NextKAN canonical type |
|--------------------------------------|------------------------|
| `BOOLEAN`                            | `boolean`              |
| `TINYINT`, `SMALLINT`, `INTEGER`, `BIGINT`, `HUGEINT` | `integer` |
| `UTINYINT`, `USMALLINT`, `UINTEGER`, `UBIGINT`        | `integer` |
| `FLOAT`, `DOUBLE`, `DECIMAL(*,*)`    | `number`               |
| `VARCHAR`                            | `string`               |
| `DATE`                               | `date`                 |
| `TIMESTAMP`, `TIMESTAMP_*`           | `datetime`             |
| `TIME`                               | `datetime`             |
| `JSON`, `STRUCT(*)`, `MAP(*,*)`, `LIST(*)` | `json`           |
| `GEOMETRY`                           | `geometry`             |
| Anything else                        | `string` (fallback)    |

### Filterable / aggregatable heuristics

- `filterable = true` if `distinctCount < 10_000` OR `type ∈ {date, datetime, number, integer, boolean}`.
- `aggregatable = true` if `type ∈ {integer, number}` OR (`type ∈ {date, datetime}` AND `distinctCount < rowCount`).

These are starting points. Admin override stored on the `Column` record.

### PII detection patterns

In `src/lib/profiling/pii.ts`, expose:

```typescript
export function detectPii(sampleValues: unknown[]): boolean;
```

Implementation: regex against samples for SSN (`\d{3}-\d{2}-\d{4}`), email (RFC 5322 subset), US phone (`\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}`). A column is PII-flagged if >50% of non-null samples match a PII pattern. Don't try to detect names in v1 — too many false positives.

### Tests

- `src/lib/profiling/index.test.ts`:
  - Profile a small CSV fixture (in `test-data/`) and verify column count, types, statistics
  - Profile a JSON file, verify types
  - Profile a Parquet file (pass-through profile, copy not conversion)
  - Verify Parquet output file exists and is readable
  - Verify PII detection fires on a CSV with email/SSN columns
  - Verify timeout aborts profiling cleanly
  - Verify worker thread doesn't block (test by running profile + parallel quick query, both should respond promptly)

### Acceptance

- `profileResource()` returns a `ProfileResult` for CSV, JSON, and Parquet inputs.
- Statistics are correct against fixtures in `test-data/`.
- Profiling a 10MB CSV completes in under 10 seconds on a typical dev machine.
- Worker thread isolation verified.

## Feature 4: Upload pipeline

Wire the profiling library into the upload flow as a Server Action.

### Files

- `src/lib/actions/resource/upload.ts` — Server Action
- `src/lib/actions/resource/upload.test.ts` — tests

### Server Action signature

```typescript
// src/lib/actions/resource/upload.ts
"use server";

export interface UploadResourceInput {
  datasetId: string;
  file: File;  // standard Web File
  name?: string;
  description?: string;
}

export interface UploadResourceResult {
  resource: Resource;  // with columns populated
  warnings: string[];
}

export async function uploadResource(input: UploadResourceInput): Promise<UploadResourceResult>;
```

### Flow

1. Validate input via Zod.
2. Check file size against `NEXTKAN_UPLOAD_MAX_SIZE_MB`. If exceeded, throw with a clear error including the suggested workaround (pre-convert to Parquet and upload that).
3. Create a `Resource` record with `status: "processing"`.
4. Stream the uploaded file to `storage/resources/<id>/original.<ext>`.
5. Call `profileResource()` with `parquetTargetPath` set to `storage/resources/<id>/data.parquet`.
6. Within a Prisma transaction:
   - Update `Resource` with rowCount, parquetPath, originalPath, status: "ready"
   - Create `Column` rows from the profile result
7. Return the resource with columns.

### Error handling

- On profiling failure: update `Resource.status = "failed"`, store error in `statusError`, leave original file in storage for debugging, return error to caller. Don't delete partial state.
- On timeout: same as failure with a specific timeout message.
- On invalid file (not a tabular format and not a recognized non-tabular media type): allow the upload but skip profiling; store as a non-tabular resource with no columns. Set `status: "ready"`, `parquetPath: null`.

### Streaming progress

Server Actions support streaming via async iterators. Stream status updates so the admin UI shows progress:

```typescript
yield { phase: "uploading", progress: 0.3 };
yield { phase: "profiling", progress: 0.6 };
yield { phase: "converting", progress: 0.9 };
yield { phase: "ready" };
```

### Tests

- `src/lib/actions/resource/upload.test.ts`:
  - Upload a small CSV, verify Resource and Columns are created correctly
  - Upload a file over the size limit, verify rejection with expected error
  - Upload a malformed CSV, verify failure status is recorded
  - Upload a non-tabular file (PDF), verify it's stored without profiling
  - Upload concurrently from multiple "admin sessions" (simulated), verify no contention

### Acceptance

- Admin can upload a CSV via the existing admin UI and see populated column metadata.
- Failed uploads are recoverable (status reflects the failure, no orphaned data).
- Size-limit rejection has a helpful error message.

## Feature 5: AI adapter module

Isolated layer for all AI calls. Never call the Anthropic SDK directly from Server Actions or routes.

### Files

- `src/lib/ai/index.ts` — public API
- `src/lib/ai/client.ts` — Anthropic SDK wrapper with config
- `src/lib/ai/prompts/` — one file per prompt template
  - `dataset-draft.ts`
  - `column-annotation.ts`
  - `description-rewrite.ts`
- `src/lib/ai/index.test.ts` — tests with mocked SDK

### Public API

```typescript
// src/lib/ai/index.ts

export async function isAiAvailable(): Promise<boolean>;
// Returns true iff ANTHROPIC_API_KEY is set and SDK is reachable.

export async function generateDatasetDraft(
  profile: DatasetProfile
): Promise<DatasetDraft>;
// Returns title, description, keywords, themes, temporal/spatial coverage suggestions.

export async function annotateColumns(
  resourceContext: { datasetTitle: string; datasetDescription?: string },
  columns: ColumnInput[]
): Promise<ColumnAnnotation[]>;
// Batched: one API call annotates all columns of one resource.

export async function rewriteDescription(
  text: string,
  audience: "technical" | "non-technical" | "tagline"
): Promise<string>;
// Streaming-friendly; consider returning an AsyncIterable<string>.
```

### Graceful degradation

If `ANTHROPIC_API_KEY` is not set:

- `isAiAvailable()` returns `false`.
- The other functions throw a typed error (`AiUnavailableError`) that callers can catch and convert to UI state.
- The admin UI checks `isAiAvailable()` once on mount and hides AI buttons / shows a "Configure AI features" notice when false.

### Configuration

```typescript
// src/lib/ai/client.ts
import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY;
const model = process.env.NEXTKAN_AI_MODEL ?? "claude-sonnet-4-6";

export function getClient(): Anthropic {
  if (!apiKey) throw new AiUnavailableError("ANTHROPIC_API_KEY not set");
  return new Anthropic({ apiKey });
}

export const AI_MODEL = model;
```

### Tests

- Mock the SDK in `src/__mocks__/anthropic.ts`.
- Test each function with mocked responses.
- Test that absent API key causes graceful degradation, not crashes.

### Acceptance

- All AI features work when `ANTHROPIC_API_KEY` is set.
- All AI features fail cleanly (no crashes, clear UI state) when it's absent.
- The catalog works end-to-end without an API key.

## Feature 6: Upload-to-DCAT-US draft

The headline feature: upload a CSV, get a populated DCAT-US draft.

### Files

- `src/lib/actions/resource/draft-metadata.ts` — Server Action
- `src/lib/ai/prompts/dataset-draft.ts` — prompt template
- `src/app/(admin)/datasets/[id]/edit/_components/AiDraftButton.tsx` — UI trigger
- Tests colocated with each

### Flow

1. After upload completes, the admin sees a "Generate metadata draft" button.
2. Clicking the button calls `generateDatasetDraft()` with the profiling result.
3. The result populates editable form fields (title, description, keywords, themes, temporal/spatial coverage).
4. The admin reviews and edits before saving.
5. Each AI-generated field is marked with a subtle indicator and `descriptionSource = "ai_generated"`.

### Prompt structure

```typescript
// src/lib/ai/prompts/dataset-draft.ts
export function buildDatasetDraftPrompt(profile: DatasetProfile): string {
  return `You are helping a government agency publisher draft DCAT-US v1.1 metadata for a newly uploaded dataset.

DATA PROFILE:
- Resource name: ${profile.resourceName}
- Format: ${profile.mediaType}
- Row count: ${profile.rowCount}
- Columns (${profile.columns.length}):
${profile.columns.map(c => `  - ${c.name} (${c.type})${c.unit ? ", unit: " + c.unit : ""}: sample values ${JSON.stringify(c.sampleValues?.slice(0, 3))}`).join("\n")}

TASK:
Produce a JSON object with these fields:
{
  "title": "...",                  // 5-15 words, descriptive
  "description": "...",            // 2-4 sentences, neutral tone, factual
  "keywords": [...],               // 3-8 lowercase tags
  "themes": [...],                 // 1-3 themes from data.gov controlled vocabulary
  "temporalCoverage": "...",       // ISO 8601 interval if detectable, else null
  "spatialCoverage": "...",        // place name or bounding box if detectable, else null
  "updateFrequency": "..."         // "irregular" | "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "unknown"
}

Constraints:
- Only return valid JSON, no preamble.
- If a field can't be reasonably inferred, use null.
- Title and description must be neutral and factual; avoid promotional language.
`;
}
```

Adjust as needed based on prompt engineering iteration.

### Tests

- Mock the AI client.
- Verify the prompt is constructed correctly from a profile.
- Verify the response is parsed into the expected shape.
- Verify malformed AI responses are handled (fall back to empty draft, log).

### Acceptance

- An admin can upload a CSV and click "Generate draft," and within ~10 seconds see populated metadata fields.
- AI-generated fields are visually distinguished from manually entered ones.
- The admin can edit any field freely; saving sets `descriptionSource = "manual"`.

## Feature 7: Column-level AI annotation

Generate descriptions, units, and refined types for each column.

### Files

- `src/lib/actions/resource/annotate-columns.ts` — Server Action
- `src/lib/ai/prompts/column-annotation.ts` — prompt template
- `src/app/(admin)/datasets/[id]/edit/_components/ColumnEditor.tsx` — UI

### Flow

1. After dataset draft is generated, the admin sees an "Annotate columns" action.
2. The action calls `annotateColumns()` with the dataset context and all columns in one batched call.
3. The response populates `description`, `unit`, and optionally `title` for each column.
4. Each annotated column has `descriptionSource = "ai_generated"` until edited.

### Tests

- Verify batch annotation produces output for all columns.
- Verify the prompt includes dataset context (title, description) so column descriptions are grounded.
- Verify partial failures (some columns annotated, some not) are handled gracefully.

### Acceptance

- An admin can annotate all columns of a typical dataset in one action.
- Annotations include description and unit where inferable.
- Manual edits override the AI annotation cleanly.

## Feature 8: MCP server scaffold

See `docs/mcp-server-spec.md` for the full spec. Tier 1.5 scope:

- Sibling directory `mcp-server/` at repo root
- Streamable HTTP, stateless mode
- Anonymous read access
- Shared Prisma client (imports from `@/generated/prisma/client`)
- DuckDB query layer (imports from `@/lib/datastore`)
- Hono-based HTTP setup with rate limiting
- LRU result cache

### Files

- `mcp-server/index.ts` — entry point
- `mcp-server/server.ts` — MCP server setup
- `mcp-server/transport.ts` — Streamable HTTP transport
- `mcp-server/middleware/rate-limit.ts` — per-IP rate limiting
- `mcp-server/middleware/concurrency.ts` — in-process query queue
- `mcp-server/cache.ts` — LRU result cache
- `mcp-server/tools/` — one file per tool (see Feature 9)
- `mcp-server/index.test.ts` — integration tests

### npm scripts

Add to root `package.json`:

```json
{
  "scripts": {
    "mcp:dev": "tsx watch mcp-server/index.ts",
    "mcp:start": "node --import tsx mcp-server/index.ts"
  }
}
```

### Acceptance

- `npm run mcp:dev` starts the MCP server on a configurable port (default 3001).
- The MCP server responds to `POST /mcp` with valid JSON-RPC.
- The MCP Inspector (`npx @modelcontextprotocol/inspector`) can connect and list tools.
- Rate limiting headers are returned correctly.

## Feature 9: Core MCP tools

Implement these six tools. Full specs in `docs/mcp-server-spec.md`.

1. `list_datasets` — paginated list of published datasets
2. `get_dataset` — full metadata for one dataset including resources and columns
3. `get_schema` — column metadata for a resource (from Prisma, no DuckDB hit)
4. `query_dataset` — filtered/projected row retrieval with hard limits
5. `aggregate_dataset` — group-by + metric, the cheap analytical path
6. `sample_dataset` — N random rows, capped at 100

Each tool is one file in `mcp-server/tools/`, exporting:

```typescript
export const tool = {
  name: "...",
  description: "...",
  inputSchema: z.object({...}),
  handler: async (input, context) => {...}
};
```

Register all tools in `mcp-server/server.ts`.

### Tests

- For each tool: input validation, happy path, error paths (dataset not found, column not filterable, limit exceeded).
- Integration test: full MCP handshake via the SDK's test utilities.

### Acceptance

- All six tools are callable via MCP Inspector.
- Each tool's input validation rejects invalid inputs with clear errors.
- Query/aggregate tools enforce the column `filterable`/`aggregatable` flags.
- Results are cached and the cache is hit on identical subsequent calls.

## Feature 10: Agent preview pane

A side panel in the dataset edit UI showing how the dataset will appear to an agent.

### Files

- `src/app/(admin)/datasets/[id]/edit/_components/AgentPreview.tsx`
- `src/lib/agent-preview/index.ts` — generates the MCP tool definitions and example calls from the dataset's metadata
- Tests

### What it shows

For the dataset being edited:

1. The MCP tool definitions that would be generated (JSON view, formatted).
2. Three example tool calls an agent might make (`get_schema`, `query_dataset`, `aggregate_dataset`), each with an example response.
3. A "Try it" button that actually calls the running MCP server with the example query and shows the live response.

This is computed client-side from the dataset's columns — no AI call needed. The "Try it" button hits the local MCP server.

### Acceptance

- Editing a column description shows the tool definition update in real time.
- Setting a column to `filterable: false` removes it from `query_dataset`'s allowed filters in the preview.
- "Try it" actually queries the MCP server and returns real results.

## Feature 11: Basic quality scoring

A simple composite score visible in the dataset edit UI.

### Files

- `src/lib/quality/score.ts`
- `src/app/(admin)/datasets/[id]/edit/_components/QualityScore.tsx`
- Tests

### Score components (each 0–1, equally weighted for v1)

1. **DCAT-US completeness**: ratio of populated required+recommended fields.
2. **Column metadata completeness**: ratio of columns with description + unit (where applicable).
3. **Agent-readiness**: ratio of columns marked `filterable` or `aggregatable` that have descriptions.
4. **PII safety**: 1.0 if no PII detected, 0.5 if PII detected but flagged, 0.0 if PII detected but not flagged.

### Specific suggestions

Beyond the score, surface concrete suggestions:

- "Add a unit annotation to column `temperature` so agents can interpret values correctly."
- "Column `email_address` was detected as PII. Consider whether this dataset should be public."
- "Dataset description is shorter than 50 characters."

### Acceptance

- A score appears on every dataset edit page.
- Suggestions are actionable and specific.

## Completion checklist

Before marking Tier 1.5 done:

- [ ] All eleven features implemented with tests passing
- [ ] `npm run test:run` passes
- [ ] `npm run test:e2e` passes (E2E flow: upload CSV → generate draft → annotate columns → publish → query via MCP)
- [ ] MCP Inspector can connect and successfully call all six tools
- [ ] An end-to-end manual test: upload a real DKAN-style dataset, generate metadata, publish, query from Claude Desktop via custom connector
- [ ] `CLAUDE.md` updated to reflect Tier 1.5 completion
- [ ] `docs/backlog.md` updated with Tier 2+ items deferred or revised

## Test fixtures

Add to `test-data/`:

- `small.csv` — 10 rows, 4 columns, clean
- `with-pii.csv` — includes email and SSN columns for PII detection
- `geo.csv` — lat/lng columns for spatial detection
- `large.csv` — 100,000 rows, mixed types, for performance smoke tests
- `malformed.csv` — broken CSV for error path tests
- `nested.json` — nested JSON for STRUCT/LIST handling
- `sample.parquet` — for pass-through profile tests

Document each fixture in `test-data/README.md`.
