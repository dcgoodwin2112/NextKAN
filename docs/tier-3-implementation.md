# Tier 3 — Differentiation Implementation Plan

> **Status: COMPLETE** — All 10 features implemented. 316 unit/component/integration tests, 6 E2E tests passing.

## Prerequisites

Tiers 1 and 2 must be fully implemented. You should have a working platform with:
- Full DCAT-US v1.1 compliance with `/data.json` endpoint
- Dataset/distribution/organization CRUD with admin UI
- Faceted search, themes, data preview, datastore (CSV query API)
- Multi-role auth, SEO, responsive design

---

## New Dependencies

```bash
npm install node-cron cronstrue remark remark-html gray-matter
npm install -D @types/node-cron
```

## Testing Requirements

All features in this tier must include tests as specified in `testing-addenda.md` (Tier 3 section). Key testing notes for Tier 3:

- **Harvesting**: Most critical to test. Unit test the harvest service with mocked fetch (use `vi.fn()` to mock global `fetch`). Integration test against fixture `data.json` files stored in `src/lib/test-utils/fixtures/`. E2E test the admin harvest UI flow.
- **Cloud Storage**: Unit test each provider independently — mock the AWS SDK for S3 tests, mock the filesystem for local tests. Test the factory returns the correct provider.
- **Email**: Mock the SMTP transport. Verify templates generate correct subject/body content.
- **Data Dictionary**: Focus on the auto-generation logic from datastore columns and the Frictionless Data export format.

---

## Feature 21: Harvesting

### Task 21.1: Schema Changes

Add to `prisma/schema.prisma`:

```prisma
model HarvestSource {
  id          String   @id @default(uuid())
  name        String
  url         String   // URL to remote data.json endpoint
  type        String   @default("dcat-us") // "dcat-us" | "ckan"
  schedule    String?  // cron expression (e.g., "0 2 * * *" for daily at 2am)
  enabled     Boolean  @default(true)

  // Map harvested datasets to a local organization
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])

  lastHarvestAt  DateTime?
  lastStatus     String?   // "success" | "partial" | "error"
  lastErrorMsg   String?
  datasetCount   Int       @default(0)

  jobs           HarvestJob[]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model HarvestJob {
  id              String   @id @default(uuid())
  sourceId        String
  source          HarvestSource @relation(fields: [sourceId], references: [id], onDelete: Cascade)

  status          String   @default("running") // "running" | "success" | "error"
  datasetsCreated Int      @default(0)
  datasetsUpdated Int      @default(0)
  datasetsDeleted Int      @default(0)
  errors          String?  // JSON array of error messages
  startedAt       DateTime @default(now())
  completedAt     DateTime?
}
```

Update `Dataset` model — add optional harvest tracking:

```prisma
model Dataset {
  // ... existing fields ...
  harvestSourceId   String?
  harvestIdentifier String?  // the identifier from the remote catalog

  @@index([harvestSourceId, harvestIdentifier])
}
```

### Task 21.2: Harvest Service

Create `src/lib/services/harvest.ts`:

```typescript
interface HarvestResult {
  created: number;
  updated: number;
  deleted: number;
  errors: string[];
}

export async function runHarvest(sourceId: string): Promise<HarvestResult>
```

Implementation steps:
1. Fetch the `HarvestSource` record
2. Fetch the remote `data.json` URL
3. Parse the response — validate it conforms to DCAT-US catalog structure
4. For each dataset in the remote catalog:
   a. Check if a local dataset exists with matching `harvestSourceId` + `harvestIdentifier`
   b. If exists: compare `modified` dates. If remote is newer, update local record
   c. If not exists: create new dataset with all DCAT-US fields mapped
   d. Set `harvestSourceId` and `harvestIdentifier` on the local record
5. Identify local harvested datasets that no longer exist in the remote catalog — mark as archived or delete
6. Create keywords and distributions from the harvested data
7. For distributions with `downloadURL`: do NOT download the files — keep them as remote URLs
8. Log all operations and errors
9. Create a `HarvestJob` record with results
10. Update `HarvestSource` with last harvest timestamp and status

Important: All harvested datasets should be marked as read-only in the admin UI (or show a warning that manual edits will be overwritten on next harvest).

### Task 21.3: CKAN API Harvester (Optional)

For `type: "ckan"` sources, implement a second harvester that reads from the CKAN API:

```
GET {url}/api/3/action/package_list  → list of dataset IDs
GET {url}/api/3/action/package_show?id={id}  → dataset metadata
```

Map CKAN fields to DCAT-US fields using the official field mapping:
- CKAN `name` → DCAT-US `identifier`
- CKAN `title` → `title`
- CKAN `notes` → `description`
- CKAN `tags[].name` → `keyword`
- CKAN `organization.title` → `publisher.name`
- CKAN `resources[]` → `distribution[]`
- CKAN `resources[].url` → `downloadURL`
- CKAN `resources[].format` → `format`
- CKAN `resources[].mimetype` → `mediaType`

### Task 21.4: Harvest Scheduler

Create `src/lib/services/harvest-scheduler.ts`:

On application startup (or via a separate process), schedule harvests using `node-cron`:

```typescript
import cron from "node-cron";
import { prisma } from "@/lib/db";
import { runHarvest } from "./harvest";

export function startHarvestScheduler() {
  // Check every minute for sources that need harvesting
  cron.schedule("* * * * *", async () => {
    const sources = await prisma.harvestSource.findMany({
      where: { enabled: true, schedule: { not: null } },
    });

    for (const source of sources) {
      if (source.schedule && cron.validate(source.schedule)) {
        // Check if schedule matches current time
        // Run harvest if due
      }
    }
  });
}
```

Alternative approach: Use a Next.js API route triggered by an external cron service (e.g., Vercel Cron, GitHub Actions, system crontab):

```
POST /api/admin/harvest/run-scheduled
```

### Task 21.5: Harvest Admin UI

Create `src/app/admin/harvest/` pages:

- `page.tsx` — List all harvest sources with status, last run, dataset count, enable/disable toggle
- `new/page.tsx` — Form to add a new harvest source (name, URL, type, schedule, target organization)
- `[id]/page.tsx` — Harvest source detail: history of jobs, run manually button, edit settings
- `[id]/jobs/page.tsx` — List of harvest jobs with created/updated/deleted counts and error logs

---

## Feature 22: Data Dictionary Support

### Task 22.1: Schema Changes

```prisma
model DataDictionary {
  id             String   @id @default(uuid())
  distributionId String   @unique
  distribution   Distribution @relation(fields: [distributionId], references: [id], onDelete: Cascade)

  fields         DataDictionaryField[]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model DataDictionaryField {
  id               String   @id @default(uuid())
  dictionaryId     String
  dictionary       DataDictionary @relation(fields: [dictionaryId], references: [id], onDelete: Cascade)

  name             String   // column name
  title            String?  // human-readable label
  type             String   // "string" | "number" | "integer" | "boolean" | "date" | "datetime"
  description      String?
  format           String?  // format hint (e.g., "email", "uri", "YYYY-MM-DD")
  constraints      String?  // JSON: { required?: boolean, unique?: boolean, enum?: string[], min?: number, max?: number }

  sortOrder        Int      @default(0)

  @@index([dictionaryId])
}
```

Update `Distribution` model: add `dataDictionary DataDictionary?` relation.

### Task 22.2: Auto-generate from Datastore

When a CSV is imported into the datastore (Feature 14), auto-generate a data dictionary:

In `src/lib/services/datastore.ts`, after successful import:
1. Create a `DataDictionary` for the distribution
2. For each column, create a `DataDictionaryField` with:
   - `name`: the CSV column header
   - `type`: inferred type from the import (TEXT → "string", INTEGER → "integer", REAL → "number")
   - `title`: null (to be filled by user)
   - `description`: null (to be filled by user)

### Task 22.3: Data Dictionary Editor

Create `src/components/datasets/DataDictionaryEditor.tsx`:

- Table-based editor showing one row per field
- Columns: Name (read-only), Title (editable), Type (dropdown), Description (editable), Format (editable)
- Save button that updates all fields in a single transaction
- Accessible from the admin dataset edit page, under each distribution

### Task 22.4: Data Dictionary Display

Create `src/components/datasets/DataDictionaryView.tsx`:

- Read-only table displayed on the public dataset detail page
- Shows column name, title, type, description
- Rendered below or alongside the data preview

### Task 22.5: Frictionless Data Export

Create `src/app/api/datasets/[id]/dictionary/route.ts`:

```
GET /api/datasets/:id/dictionary?format=frictionless

Response (Frictionless Table Schema):
{
  "fields": [
    { "name": "id", "type": "integer", "description": "..." },
    { "name": "name", "type": "string", "description": "..." }
  ]
}
```

---

## Feature 23: Basic Data Visualization

### Task 23.1: Chart Component

Create `src/components/visualizations/ChartBuilder.tsx`:

A React component that:
- Accepts datastore data (columns + rows) as input
- Provides a configuration UI:
  - Chart type selector: Bar, Line, Pie, Scatter
  - X-axis column (dropdown from available columns)
  - Y-axis column(s) (multi-select, numeric columns only)
  - Optional: group-by column for series
  - Title and labels
- Renders the chart using Recharts (already available in the artifact environment, but install for the project: `npm install recharts`)
- "Embed" button that generates an iframe embed code

### Task 23.2: Chart API

Create `src/app/api/charts/route.ts`:

```
POST /api/charts — Save a chart configuration
Body: { distributionId, chartType, xColumn, yColumns, groupBy?, title?, options? }

GET /api/charts/:id — Get chart config + render data
```

Store chart configs in a new model:

```prisma
model SavedChart {
  id             String   @id @default(uuid())
  distributionId String
  distribution   Distribution @relation(fields: [distributionId], references: [id], onDelete: Cascade)

  title          String?
  chartType      String   // "bar" | "line" | "pie" | "scatter"
  config         String   // JSON: { xColumn, yColumns, groupBy, options }

  createdById    String?
  createdAt      DateTime @default(now())
}
```

### Task 23.3: Embeddable Chart Page

Create `src/app/embed/chart/[id]/page.tsx`:

- Minimal page (no site header/footer) that renders only the chart
- Designed to be loaded in an iframe
- Responsive sizing
- Attribution link back to the dataset

---

## Feature 24: Activity Stream / Audit Log

### Task 24.1: Schema

```prisma
model ActivityLog {
  id         String   @id @default(uuid())
  action     String   // "dataset:created" | "dataset:updated" | "dataset:deleted" | etc.
  entityType String   // "dataset" | "organization" | "distribution" | "user"
  entityId   String
  entityName String   // snapshot of name/title at time of action

  userId     String?
  userName   String?  // snapshot

  details    String?  // JSON with changed fields

  createdAt  DateTime @default(now())

  @@index([entityType, entityId])
  @@index([createdAt])
}
```

### Task 24.2: Activity Logging Service

Create `src/lib/services/activity.ts`:

```typescript
export async function logActivity(params: {
  action: string;
  entityType: string;
  entityId: string;
  entityName: string;
  userId?: string;
  userName?: string;
  details?: Record<string, any>;
}): Promise<void>
```

Call this function in all server actions after successful create/update/delete operations. For updates, compute a diff of changed fields and store in `details`.

### Task 24.3: Activity Feed API

```
GET /api/activity
    Query: entityType?, entityId?, limit?, offset?
    Response: { activities: ActivityLog[], total: number }
```

### Task 24.4: Activity Feed UI

- Admin dashboard: show recent activity across the site
- Dataset detail (admin): show activity for that specific dataset
- Public homepage (optional): "Recently updated datasets" section

---

## Feature 25: API Documentation

### Task 25.1: OpenAPI Spec

Create `src/lib/openapi.ts`:

Define the OpenAPI 3.0 specification as a TypeScript object covering all API routes:

```typescript
export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "NextKAN API",
    version: "1.0.0",
    description: "RESTful API for managing an open data catalog",
  },
  paths: {
    "/api/datasets": { /* GET, POST */ },
    "/api/datasets/{id}": { /* GET, PUT, DELETE */ },
    "/api/organizations": { /* GET, POST */ },
    "/api/organizations/{id}": { /* GET, PUT, DELETE */ },
    "/api/datastore/{distributionId}": { /* GET */ },
    "/api/datastore/sql": { /* POST */ },
    "/data.json": { /* GET */ },
    // ... all other endpoints
  },
  components: {
    schemas: { /* Dataset, Distribution, Organization, etc. */ },
    securitySchemes: { /* bearerAuth */ },
  },
};
```

### Task 25.2: Swagger UI Page

Create `src/app/(public)/api-docs/page.tsx`:

Serve the OpenAPI spec and render it with Swagger UI:

```bash
npm install swagger-ui-react
npm install -D @types/swagger-ui-react
```

Render the Swagger UI component (client component) pointing at `/api/openapi.json`.

Create `src/app/api/openapi.json/route.ts` to serve the spec.

---

## Feature 26: Bulk Import/Export

### Task 26.1: Bulk Import

Create `src/lib/services/bulk-import.ts`:

Support two import formats:

**CSV import:**
Columns map to DCAT-US fields. At minimum: title, description, keywords (semicolon-separated), accessLevel, publisherName, downloadURL, mediaType.

**JSON import:**
Accept a DCAT-US formatted `data.json` file (same format as the `/data.json` output).

```typescript
interface BulkImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

export async function bulkImportCSV(file: File, organizationId: string): Promise<BulkImportResult>
export async function bulkImportJSON(file: File, organizationId: string): Promise<BulkImportResult>
```

### Task 26.2: Bulk Export

Create `src/app/api/export/route.ts`:

```
GET /api/export?format=csv — Export all published datasets as CSV
GET /api/export?format=json — Export as DCAT-US JSON (same as /data.json)
```

For CSV export, map DCAT-US fields to columns. Use PapaParse to generate CSV.

### Task 26.3: Admin Bulk Import Page

Create `src/app/admin/import/page.tsx`:
- File upload area (drag-and-drop)
- Format selector (CSV or JSON)
- Organization selector (assign imported datasets to an org)
- Preview of first 5 rows before importing
- Import button with progress indicator
- Results summary showing created/updated/skipped/errors

---

## Feature 27: Geospatial Support

### Task 27.1: Spatial Field Enhancement

The `spatial` field in DCAT-US can be a bounding box, a named place, or a GeoJSON geometry. Support all three:

Create `src/lib/schemas/spatial.ts`:

```typescript
import { z } from "zod";

export const spatialSchema = z.union([
  z.string(), // named place (e.g., "United States")
  z.object({  // bounding box
    type: z.literal("BoundingBox"),
    west: z.number(),
    south: z.number(),
    east: z.number(),
    north: z.number(),
  }),
  z.object({  // GeoJSON
    type: z.enum(["Point", "Polygon", "MultiPolygon"]),
    coordinates: z.any(),
  }),
]);
```

Store as JSON string in the database. The DCAT-US transformer should output the appropriate format.

### Task 27.2: Map Preview Component

Create `src/components/visualizations/SpatialPreview.tsx`:

Use Leaflet (via `react-leaflet`) to render a map:

```bash
npm install leaflet react-leaflet
npm install -D @types/leaflet
```

- If spatial is a bounding box: draw a rectangle on the map and fit bounds
- If spatial is a GeoJSON geometry: render the shape
- If spatial is a named place: geocode and center the map (or just show the text)

Display this on the dataset detail page when spatial metadata is present.

### Task 27.3: Spatial Search (Basic)

For bounding box queries, add an API parameter:

```
GET /api/datasets?bbox=west,south,east,north
```

Implementation for SQLite: parse the stored spatial JSON and compare bounding boxes in application code (not ideal for large catalogs, but functional for MVP).

For PostgreSQL: use PostGIS extension for proper spatial indexing and queries (Tier 4 enhancement).

---

## Feature 28: Cloud Storage Integration

### Task 28.1: Storage Abstraction

Create `src/lib/storage/index.ts`:

```typescript
export interface StorageProvider {
  upload(file: Buffer, filename: string, contentType: string): Promise<{ url: string; path: string }>;
  delete(path: string): Promise<void>;
  getSignedUrl(path: string, expiresIn?: number): Promise<string>;
}
```

Create `src/lib/storage/local.ts` — implements StorageProvider using the filesystem (existing upload logic).

Create `src/lib/storage/s3.ts` — implements StorageProvider using AWS S3:

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### Task 28.2: Configuration

Add to `.env`:
```env
STORAGE_PROVIDER="local"  # "local" | "s3"
S3_BUCKET=""
S3_REGION=""
S3_ACCESS_KEY_ID=""
S3_SECRET_ACCESS_KEY=""
S3_ENDPOINT=""  # for S3-compatible services like MinIO, R2, etc.
```

Create `src/lib/storage/factory.ts`:
```typescript
export function getStorageProvider(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER || "local";
  if (provider === "s3") return new S3Storage();
  return new LocalStorage();
}
```

### Task 28.3: Update Upload Flow

Refactor `src/lib/utils/upload.ts` and `src/app/api/upload/route.ts` to use the storage abstraction instead of direct filesystem calls.

---

## Feature 29: Content Pages / CMS

### Task 29.1: Schema

```prisma
model Page {
  id        String   @id @default(uuid())
  title     String
  slug      String   @unique
  content   String   // Markdown content
  published Boolean  @default(false)
  sortOrder Int      @default(0) // for navigation ordering

  createdById String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Task 29.2: Page Admin

Create `src/app/admin/pages/` with the standard CRUD pattern:
- List, create, edit pages
- Markdown editor (use a simple textarea with preview toggle, or integrate a lightweight editor like `@uiw/react-md-editor`)
- Publish/unpublish toggle

### Task 29.3: Public Page Rendering

Create `src/app/(public)/pages/[slug]/page.tsx`:
- Fetch page by slug
- Render Markdown to HTML using `remark` and `remark-html`
- Generate metadata for SEO

### Task 29.4: Navigation Integration

Add published pages to the site header navigation:
- Query published pages ordered by `sortOrder`
- Render as nav links in the Header component
- Built-in pages (About, Terms of Use) can be seeded during setup

---

## Feature 30: Email Notifications

### Task 30.1: Email Service Abstraction

Create `src/lib/services/email.ts`:

```typescript
export interface EmailService {
  send(params: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void>;
}
```

Implement two providers:
- `ConsoleEmailService` — logs emails to console (development)
- `SmtpEmailService` — sends via SMTP using `nodemailer`

```bash
npm install nodemailer
npm install -D @types/nodemailer
```

Configuration in `.env`:
```env
EMAIL_PROVIDER="console"  # "console" | "smtp"
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASSWORD=""
SMTP_FROM="noreply@example.com"
```

### Task 30.2: Email Templates

Create `src/lib/email-templates/`:
- `dataset-created.ts` — sent to org admins when a new dataset is published
- `dataset-updated.ts` — sent to subscribers when a watched dataset changes
- `harvest-complete.ts` — sent to admin when a harvest job finishes

Each template exports a function that returns `{ subject: string, html: string, text: string }`.

### Task 30.3: Notification Triggers

Add email sending calls to the appropriate server actions:
- After `createDataset()` succeeds → send to org admins
- After `updateDataset()` succeeds → send to subscribers (if subscription feature added)
- After `runHarvest()` completes → send to admin

### Task 30.4: Subscription Model (Optional)

```prisma
model Subscription {
  id        String   @id @default(uuid())
  email     String
  datasetId String
  dataset   Dataset  @relation(fields: [datasetId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@unique([email, datasetId])
}
```

Add a "Subscribe to updates" button on the public dataset detail page.

---

## Tier 3 Completion Checklist

- [x] Harvest sources can be added and configured in admin UI
- [x] Harvester fetches remote data.json and creates/updates local datasets
- [x] Harvest runs can be triggered manually and scheduled via cron
- [x] Data dictionaries auto-generate from CSV imports
- [x] Data dictionary editor allows admins to add descriptions and types
- [x] Charts can be built from datastore data and embedded via iframe
- [x] Activity log captures all dataset/org changes
- [x] Swagger UI renders interactive API documentation
- [x] Bulk CSV/JSON import creates datasets in batch
- [x] Bulk export generates CSV/JSON catalog
- [x] Spatial metadata renders on a map preview
- [x] Cloud storage (S3) works as an alternative to local filesystem
- [x] Content pages can be created and published via Markdown editor
- [x] Email notifications send on dataset creation (at minimum via console log)

### Testing Checklist
- [x] Harvest service unit tested: fetch, create, update, archive, error handling
- [x] Harvest integration test: import fixture data.json into test DB and verify
- [x] E2E: admin can create harvest source and trigger manual run
- [x] Data dictionary auto-generation tested for type inference accuracy
- [x] Data dictionary Frictionless Data export format validated
- [x] Bulk import tested: CSV and JSON formats, error reporting per row
- [x] Storage factory returns correct provider based on env config
- [x] S3 storage unit tested with mocked AWS SDK
- [x] Local storage unit tested with mocked filesystem
- [x] Email template tests verify subject and body content
- [x] Activity log service tested for record creation and diff storage
- [x] `npm run test:coverage` shows 70%+ on all Tier 3 source files
