# Tier 4 — Advanced / Enterprise Implementation Plan

## Prerequisites

Tiers 1–3 must be fully implemented. The platform should have:
- Full DCAT-US v1.1 compliance with dynamic data.json
- Complete CRUD, faceted search, datastore, data preview
- Harvesting, data dictionaries, charts, activity logs
- Multi-role auth, cloud storage, content pages, email notifications

Tier 4 features target enterprise deployments, larger government agencies, and long-term platform maturity. Many are independent of each other and can be implemented in any order.

## Testing Requirements

All features in this tier must include tests as specified in `testing-addenda.md` (Tier 4 section). Key testing notes for Tier 4:

- **Editorial Workflow**: The state machine is the most safety-critical code in this tier. Unit test EVERY valid and invalid state transition. Unit test role restrictions on transitions. E2E test the full draft → review → approve → publish cycle.
- **DCAT-US v3.0**: Extend existing dcat-us.test.ts — test that v1.1 output is unchanged when v3.0 is disabled, and that new fields appear when enabled.
- **CKAN Compatibility**: Unit test the field mapper. Test each CKAN API endpoint for correct response format.
- **Plugin System**: Unit test the hook registry thoroughly — this is the extension point for the entire ecosystem.
- **Data Quality**: The scoring algorithm must be deterministic — test with fixtures covering edge cases.

---

## Feature 31: DCAT-US v3.0 Support

### Task 31.1: Research

Reference: https://doi-do.github.io/dcat-us/ and https://github.com/DOI-DO/dcat-us

DCAT-US v3.0 is backward-compatible with v1.1. Key additions:
- **Dataset Series**: a collection of related datasets (e.g., annual releases)
- **Versioning**: explicit version metadata on datasets
- **Inverse properties**: richer relationships between datasets
- **Enhanced geospatial metadata**: coordinate reference systems, geometry descriptions
- **Controlled vocabularies**: standardized codes for agencies, file formats, units

### Task 31.2: Schema Changes

Add to `prisma/schema.prisma`:

```prisma
model DatasetSeries {
  id          String   @id @default(uuid())
  title       String
  description String?
  identifier  String   @unique
  slug        String   @unique

  datasets    Dataset[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

Update `Dataset` model:

```prisma
model Dataset {
  // ... existing fields ...

  // DCAT-US v3.0 additions
  version         String?
  versionNotes    String?
  seriesId        String?
  series          DatasetSeries? @relation(fields: [seriesId], references: [id])
  previousVersion String?  // identifier of previous dataset version
}
```

### Task 31.3: Update DCAT-US Transformer

In `src/lib/schemas/dcat-us.ts`:
- Add a `catalogVersion` configuration: `"v1.1"` (default) or `"v3.0"`
- When v3.0 is enabled, add new fields to the output:
  - `dcat:version` → `dataset.version`
  - `dcat:versionNotes` → `dataset.versionNotes`
  - `dcat:inSeries` → reference to the DatasetSeries
  - `dcat:previousVersion` → reference to previous dataset
- Update `conformsTo` in the catalog root to reference the v3.0 schema URI
- Maintain backward compatibility: v1.1 fields remain unchanged

### Task 31.4: Dataset Series UI

Admin:
- New section in admin for managing dataset series
- When editing a dataset, optional dropdown to assign it to a series
- Version field becomes visible when a series is assigned

Public:
- Dataset series page: `/series/[slug]` showing all datasets in the series ordered by version/date
- "Part of series: {name}" badge on dataset detail pages with link to series

---

## Feature 32: Editorial Workflow

### Task 32.1: Schema Changes

Add workflow status tracking:

```prisma
model Dataset {
  // ... existing fields ...
  // Replace simple "status" with workflow state
  workflowStatus  String   @default("draft") // "draft" | "pending_review" | "approved" | "published" | "rejected" | "archived"
  reviewerId      String?
  reviewer        User?    @relation("DatasetReviewer", fields: [reviewerId], references: [id])
  reviewNote      String?
  submittedAt     DateTime?
  reviewedAt      DateTime?
  publishedAt     DateTime?
}

model WorkflowTransition {
  id          String   @id @default(uuid())
  datasetId   String
  dataset     Dataset  @relation(fields: [datasetId], references: [id], onDelete: Cascade)

  fromStatus  String
  toStatus    String
  userId      String
  note        String?
  createdAt   DateTime @default(now())

  @@index([datasetId])
}
```

Add relation to User model:
```prisma
model User {
  // ... existing fields ...
  reviewedDatasets Dataset[] @relation("DatasetReviewer")
}
```

### Task 32.2: Workflow State Machine

Create `src/lib/services/workflow.ts`:

```typescript
const WORKFLOW_TRANSITIONS: Record<string, { allowedNext: string[]; requiredRole: string[] }> = {
  draft: {
    allowedNext: ["pending_review"],
    requiredRole: ["editor", "orgAdmin", "admin"],
  },
  pending_review: {
    allowedNext: ["approved", "rejected", "draft"],
    requiredRole: ["orgAdmin", "admin"],
  },
  approved: {
    allowedNext: ["published", "draft"],
    requiredRole: ["orgAdmin", "admin"],
  },
  published: {
    allowedNext: ["archived", "draft"],
    requiredRole: ["orgAdmin", "admin"],
  },
  rejected: {
    allowedNext: ["draft"],
    requiredRole: ["editor", "orgAdmin", "admin"],
  },
  archived: {
    allowedNext: ["draft"],
    requiredRole: ["admin"],
  },
};

export async function transitionWorkflow(
  datasetId: string,
  toStatus: string,
  userId: string,
  note?: string
): Promise<Dataset>
```

Implementation:
1. Fetch dataset, validate current status allows transition to `toStatus`
2. Validate user has required role for this transition
3. Update dataset `workflowStatus` (and related timestamps)
4. Create `WorkflowTransition` record
5. Log in ActivityLog
6. Send email notification to relevant parties:
   - Submitted for review → notify org admins
   - Approved/rejected → notify the editor who submitted
   - Published → notify subscribers

### Task 32.3: Workflow UI

Admin dataset edit page additions:
- Status badge showing current workflow state
- Action buttons for valid transitions (e.g., "Submit for Review", "Approve", "Reject")
- Note field for rejection reasons
- Timeline showing workflow history (WorkflowTransition records)

Admin dashboard additions:
- "Pending Review" queue showing all datasets awaiting review (for org admins)
- Counts by status in the dashboard summary

### Task 32.4: Configuration

Make workflow optional via environment variable:
```env
ENABLE_WORKFLOW="false"  # set to "true" to enable editorial workflow
```

When disabled, datasets go directly from "draft" to "published" (Tier 1 behavior).

---

## Feature 33: Dataset Versioning

### Task 33.1: Version Model

```prisma
model DatasetVersion {
  id          String   @id @default(uuid())
  datasetId   String
  dataset     Dataset  @relation(fields: [datasetId], references: [id], onDelete: Cascade)

  version     String   // e.g., "1.0", "2.0", "2023-Q1"
  snapshot    String   // JSON snapshot of entire dataset metadata at this version
  changelog   String?  // description of what changed
  createdById String?
  createdAt   DateTime @default(now())

  @@index([datasetId])
  @@unique([datasetId, version])
}
```

### Task 33.2: Version Service

Create `src/lib/services/versioning.ts`:

```typescript
export async function createVersion(
  datasetId: string,
  version: string,
  changelog?: string,
  userId?: string
): Promise<DatasetVersion>
```

Implementation:
1. Fetch the full dataset with all relations
2. Serialize to JSON snapshot (same format as DCAT-US output for that single dataset)
3. Store as a `DatasetVersion` record
4. Update `dataset.version` field

### Task 33.3: Version Comparison

Create `src/lib/services/version-diff.ts`:

```typescript
export function compareVersions(
  versionA: DatasetVersion,
  versionB: DatasetVersion
): FieldDiff[]

interface FieldDiff {
  field: string;
  oldValue: any;
  newValue: any;
}
```

Parse both JSON snapshots and compare field-by-field.

### Task 33.4: Version UI

Public dataset detail page:
- "Version history" section showing all versions with dates and changelogs
- Link to view a specific version's snapshot
- Diff view comparing two versions (highlight changed fields)

Admin:
- "Create Version" button on dataset edit page
- Version and changelog inputs

---

## Feature 34: Federation (Outbound)

### Task 34.1: CKAN-Compatible API

Create additional API routes that mirror CKAN's Action API, so other CKAN/DKAN instances can harvest from this catalog:

```
GET /api/3/action/package_list
    Response: { success: true, result: ["dataset-slug-1", "dataset-slug-2", ...] }

GET /api/3/action/package_show?id={slug}
    Response: { success: true, result: { /* CKAN-formatted dataset */ } }

GET /api/3/action/package_search?q={query}&rows={limit}&start={offset}
    Response: { success: true, result: { count: N, results: [...] } }

GET /api/3/action/organization_list
GET /api/3/action/organization_show?id={slug}
GET /api/3/action/tag_list
```

### Task 34.2: CKAN Field Mapper

Create `src/lib/schemas/ckan-compat.ts`:

Transform internal dataset model to CKAN API format:

```typescript
export function datasetToCKAN(dataset: DatasetWithRelations): CKANPackage {
  return {
    id: dataset.identifier,
    name: dataset.slug,
    title: dataset.title,
    notes: dataset.description,
    metadata_created: dataset.createdAt.toISOString(),
    metadata_modified: dataset.updatedAt.toISOString(),
    organization: {
      id: dataset.publisher.id,
      name: dataset.publisher.slug,
      title: dataset.publisher.name,
      description: dataset.publisher.description,
    },
    tags: dataset.keywords.map(k => ({ name: k.keyword })),
    resources: dataset.distributions.map(d => ({
      id: d.id,
      url: d.downloadURL || d.accessURL || "",
      name: d.title || d.fileName || "",
      format: d.format || "",
      mimetype: d.mediaType || "",
      description: d.description || "",
    })),
    license_id: dataset.license || "",
    // ... map remaining fields
  };
}
```

### Task 34.3: Harvest Endpoint Registration

Create a public page or configuration that helps other portals discover the federation endpoints:
- `/harvest-source.json` — returns metadata about the catalog for auto-discovery
- Include links to both `/data.json` (DCAT-US) and `/api/3/action/package_list` (CKAN API)

---

## Feature 35: Analytics Dashboard

### Task 35.1: Schema

```prisma
model AnalyticsEvent {
  id         String   @id @default(uuid())
  eventType  String   // "page_view" | "download" | "api_call" | "search"
  entityType String?  // "dataset" | "distribution"
  entityId   String?
  metadata   String?  // JSON: { query, userAgent, referer, etc. }
  ipHash     String?  // hashed IP for unique visitor counting (privacy-preserving)
  createdAt  DateTime @default(now())

  @@index([eventType, createdAt])
  @@index([entityType, entityId, createdAt])
}
```

### Task 35.2: Event Tracking Middleware

Create `src/middleware.ts` (Next.js middleware) or a utility function to track page views:

For API calls and downloads, add tracking at the route handler level:
- `GET /api/datasets/:id` → log "api_call" event
- `GET /uploads/*` → log "download" event (or use middleware)
- Dataset detail page → log "page_view" event (via client-side component)

### Task 35.3: Analytics Aggregation

Create `src/lib/services/analytics.ts`:

```typescript
interface AnalyticsSummary {
  totalPageViews: number;
  totalDownloads: number;
  totalApiCalls: number;
  uniqueVisitors: number;
  topDatasets: { id: string; title: string; views: number; downloads: number }[];
  topSearchTerms: { term: string; count: number }[];
  dailyTrend: { date: string; views: number; downloads: number }[];
}

export async function getAnalyticsSummary(
  startDate: Date,
  endDate: Date
): Promise<AnalyticsSummary>

export async function getDatasetAnalytics(
  datasetId: string,
  startDate: Date,
  endDate: Date
): Promise<DatasetAnalytics>
```

### Task 35.4: Admin Analytics Page

Create `src/app/admin/analytics/page.tsx`:
- Date range picker (last 7 days, 30 days, 90 days, custom)
- Summary cards: total views, downloads, API calls, unique visitors
- Line chart: daily trend of views and downloads
- Table: top 10 most viewed datasets
- Table: top 10 most downloaded datasets
- Table: top search queries

---

## Feature 36: Data Quality Scoring

### Task 36.1: Quality Score Calculator

Create `src/lib/services/data-quality.ts`:

```typescript
interface QualityScore {
  overall: number;  // 0-100
  breakdown: {
    category: string;
    score: number;
    maxScore: number;
    details: string;
  }[];
  suggestions: string[];
}

export function calculateQualityScore(dataset: DatasetWithRelations): QualityScore
```

Scoring criteria (example weights):
- Title present and descriptive (>10 chars): 5 pts
- Description present and detailed (>50 chars): 10 pts
- Keywords present (>= 3): 10 pts
- Contact point complete (name + email): 10 pts
- License specified: 10 pts
- At least one distribution: 10 pts
- Distribution has mediaType: 5 pts per distribution (max 10)
- Temporal coverage specified: 5 pts
- Spatial coverage specified: 5 pts
- Update frequency specified: 5 pts
- Data dictionary present: 10 pts
- Landing page URL: 5 pts
- conformsTo specified: 5 pts
- Theme(s) assigned: 5 pts
Total possible: 100 pts

### Task 36.2: Quality Badge Component

Create `src/components/datasets/QualityBadge.tsx`:

Visual indicator based on score:
- 80-100: Gold badge ⭐
- 60-79: Silver badge
- 40-59: Bronze badge
- 0-39: Needs improvement badge

Display on dataset cards and detail pages.

### Task 36.3: Quality Report Page

Create `src/app/admin/quality/page.tsx`:
- Table of all datasets sorted by quality score (ascending — worst first)
- Average score across the catalog
- Most common missing fields
- Export quality report as CSV

---

## Feature 37: Comments & Community Features

### Task 37.1: Schema

```prisma
model Comment {
  id        String   @id @default(uuid())
  datasetId String
  dataset   Dataset  @relation(fields: [datasetId], references: [id], onDelete: Cascade)

  authorName  String
  authorEmail String
  content     String
  approved    Boolean  @default(false)  // moderation
  parentId    String?  // for threaded replies
  parent      Comment? @relation("CommentThread", fields: [parentId], references: [id])
  replies     Comment[] @relation("CommentThread")

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([datasetId, approved])
}
```

### Task 37.2: Comment API

```
GET  /api/datasets/:id/comments — List approved comments (public)
POST /api/datasets/:id/comments — Submit comment (public, requires name/email)
PUT  /api/admin/comments/:id    — Approve/reject comment (admin)
DELETE /api/admin/comments/:id  — Delete comment (admin)
```

### Task 37.3: Comment UI

Public dataset detail page:
- Comment list showing approved comments
- "Ask a question" / "Leave feedback" form at bottom
- Threaded reply display

Admin:
- Comment moderation queue: `/admin/comments`
- Approve/reject buttons
- Filter by dataset

### Task 37.4: Configuration

```env
ENABLE_COMMENTS="false"  # set to "true" to enable
COMMENT_MODERATION="true" # require approval before display
```

---

## Feature 38: SSO / External Auth

### Task 38.1: OAuth2 Provider Support

Update `src/lib/auth.ts` to add OAuth2 providers:

```bash
npm install next-auth@beta @auth/prisma-adapter
```

Add providers based on configuration:

```typescript
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";

const providers = [CredentialsProvider({ /* existing */ })];

if (process.env.GITHUB_CLIENT_ID) {
  providers.push(GitHubProvider({
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  }));
}

if (process.env.AZURE_AD_CLIENT_ID) {
  providers.push(AzureADProvider({
    clientId: process.env.AZURE_AD_CLIENT_ID,
    clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
    tenantId: process.env.AZURE_AD_TENANT_ID!,
  }));
}
```

### Task 38.2: SAML Support

For SAML (common in government), use a SAML provider package or implement via the custom credentials provider with a SAML assertion parser.

```bash
npm install @boxyhq/saml-jackson
```

This is complex — provide as an optional integration module documented in the project README.

### Task 38.3: User Provisioning

When a user signs in via SSO for the first time:
1. Create a `User` record with their email and name from the SSO profile
2. Assign a default role (configurable: `SSO_DEFAULT_ROLE="viewer"`)
3. Admin can later promote their role via the user management UI

---

## Feature 39: Multi-language Support

### Task 39.1: UI Internationalization

```bash
npm install next-intl
```

Create `messages/en.json`, `messages/es.json`, `messages/fr.json` etc. with all UI strings.

Configure in `src/i18n.ts` and update the root layout to use `NextIntlClientProvider`.

### Task 39.2: Multilingual Metadata

Add to Dataset model:

```prisma
model DatasetTranslation {
  id          String  @id @default(uuid())
  datasetId   String
  dataset     Dataset @relation(fields: [datasetId], references: [id], onDelete: Cascade)

  locale      String  // "es", "fr", etc.
  title       String
  description String
  keywords    String? // JSON array

  @@unique([datasetId, locale])
}
```

### Task 39.3: Language-aware API

`/data.json` and `/api/datasets` should accept a `?lang=` parameter. When provided, merge translated fields over the default language.

---

## Feature 40: Plugin / Extension System

### Task 40.1: Hook System

Create `src/lib/plugins/hooks.ts`:

```typescript
type HookCallback = (...args: any[]) => Promise<any>;

class HookRegistry {
  private hooks: Map<string, HookCallback[]> = new Map();

  register(hookName: string, callback: HookCallback) {
    const existing = this.hooks.get(hookName) || [];
    existing.push(callback);
    this.hooks.set(hookName, existing);
  }

  async run(hookName: string, ...args: any[]): Promise<any[]> {
    const callbacks = this.hooks.get(hookName) || [];
    const results = [];
    for (const cb of callbacks) {
      results.push(await cb(...args));
    }
    return results;
  }
}

export const hooks = new HookRegistry();
```

Available hooks:
- `dataset:beforeCreate`, `dataset:afterCreate`
- `dataset:beforeUpdate`, `dataset:afterUpdate`
- `dataset:beforeDelete`, `dataset:afterDelete`
- `catalog:beforeRender` (for data.json customization)
- `upload:beforeSave`, `upload:afterSave`

### Task 40.2: Plugin Loader

Create `src/lib/plugins/loader.ts`:

```typescript
interface Plugin {
  name: string;
  version: string;
  register(hooks: HookRegistry): void;
}

export function loadPlugins() {
  const pluginDir = path.resolve("./plugins");
  // Scan directory for plugin modules
  // Each plugin exports a Plugin object
  // Call plugin.register(hooks) for each
}
```

### Task 40.3: Plugin Convention

Document the plugin API. A plugin is a directory in `./plugins/` with:
```
plugins/
  my-plugin/
    index.ts      # exports Plugin object
    package.json  # optional dependencies
    README.md     # documentation
```

Example plugin (custom metadata field):
```typescript
export default {
  name: "custom-metadata-fields",
  version: "1.0.0",
  register(hooks) {
    hooks.register("dataset:beforeCreate", async (data) => {
      // Add custom validation or transformation
      return data;
    });
    hooks.register("catalog:beforeRender", async (catalog) => {
      // Add custom fields to data.json output
      return catalog;
    });
  },
};
```

---

## Tier 4 Completion Checklist

- [ ] DCAT-US v3.0 output format generates correctly when enabled
- [ ] Dataset series can be created and datasets assigned to them
- [ ] Editorial workflow with draft → review → publish pipeline works
- [ ] Workflow transitions enforce role-based permissions
- [ ] Dataset versions can be created and compared
- [ ] CKAN-compatible API endpoints return properly formatted responses
- [ ] Analytics events are tracked and displayed on admin dashboard
- [ ] Data quality scores calculate and display on dataset pages
- [ ] Comments can be submitted, moderated, and displayed
- [ ] OAuth2 SSO login works with at least one provider (GitHub or Azure AD)
- [ ] UI can switch between at least two languages
- [ ] Plugin hook system allows custom code to intercept dataset lifecycle events

### Testing Checklist
- [ ] DCAT-US v3.0 transformer tested: new fields present when enabled, v1.1 unchanged when disabled
- [ ] Workflow state machine exhaustively tested: all valid transitions, all invalid transitions, all role restrictions
- [ ] E2E: full editorial workflow cycle (draft → review → approve → publish)
- [ ] Dataset versioning: snapshot creation, version comparison diff
- [ ] CKAN field mapper tested for all field mappings
- [ ] CKAN API endpoints tested for correct response format (package_list, package_show, package_search)
- [ ] Data quality scoring tested with fully complete, partially complete, and minimal datasets
- [ ] Plugin hook registry tested: register, run, async callbacks, argument passing, empty hooks
- [ ] Analytics aggregation tested for correct counts and trends
- [ ] `npm run test:coverage` shows 70%+ on all Tier 4 source files
