# Testing Addenda — Tests Required Per Tier

## How to Use This Document

This document specifies the tests required for each feature across all four tiers. It references the patterns and infrastructure defined in `testing-setup.md` — read that first.

For each feature, tests are categorized:
- **Unit** — Pure logic, schemas, transformers (Vitest, mocked dependencies)
- **Component** — React component rendering and interaction (Vitest + RTL)
- **Integration** — Multi-layer flows with real test database (Vitest + test SQLite)
- **E2E** — Full browser tests (Playwright)

---

## Tier 1 — MVP Tests

### Feature 1: DCAT-US v1.1 Compliant Metadata Schema

**Unit tests** — `src/lib/schemas/dataset.test.ts`:
- `datasetCreateSchema` accepts valid complete input
- `datasetCreateSchema` accepts minimal required-only input
- `datasetCreateSchema` rejects missing title, description, publisherId, keywords
- `datasetCreateSchema` rejects empty keywords array
- `datasetCreateSchema` validates accessLevel enum ("public", "restricted public", "non-public")
- `datasetCreateSchema` validates bureauCode format regex (###:##)
- `datasetCreateSchema` validates programCode format regex (###:###)
- `datasetCreateSchema` validates email format for contactEmail
- `datasetCreateSchema` validates URL format for license, landingPage, conformsTo, describedBy
- `datasetCreateSchema` accepts optional custom identifier string
- `datasetCreateSchema` defaults language to "en-us"
- `datasetUpdateSchema` allows partial input (all fields optional)

**Unit tests** — `src/lib/schemas/distribution.test.ts`:
- `distributionSchema` accepts valid input with downloadURL
- `distributionSchema` accepts valid input with accessURL
- `distributionSchema` rejects input with neither downloadURL nor accessURL
- `distributionSchema` validates URL format

**Unit tests** — `src/lib/schemas/organization.test.ts`:
- `organizationSchema` accepts valid input
- `organizationSchema` rejects empty name

### Feature 2: Dynamic `/data.json` Endpoint

**Unit tests** — `src/lib/schemas/dcat-us.test.ts`:
- `transformDatasetToDCATUS` includes all required DCAT-US fields
- `transformDatasetToDCATUS` formats publisher as org:Organization
- `transformDatasetToDCATUS` includes subOrganizationOf when publisher has parent org
- `transformDatasetToDCATUS` omits subOrganizationOf when publisher has no parent
- `transformDatasetToDCATUS` formats contactPoint as vcard:Contact with mailto: prefix
- `transformDatasetToDCATUS` formats modified date as YYYY-MM-DD string
- `transformDatasetToDCATUS` includes distributions with @type dcat:Distribution
- `transformDatasetToDCATUS` includes bureauCode/programCode as arrays when present
- `transformDatasetToDCATUS` omits null/undefined optional fields
- `transformDatasetToDCATUS` parses JSON-stored theme and references arrays
- `buildCatalog` sets correct conformsTo URI
- `buildCatalog` sets correct @context JSON-LD URL
- `buildCatalog` sets @id to {siteUrl}/data.json
- `buildCatalog` returns empty dataset array for empty input

**Unit tests** — `src/app/api/data.json/route.test.ts`:
- GET returns 200 with valid JSON
- GET response has Content-Type: application/json
- GET response has Access-Control-Allow-Origin: *
- GET response has Cache-Control: no-store
- GET only queries published datasets

**E2E test** — `e2e/data-json.spec.ts`:
- `/data.json` returns valid DCAT-US v1.1 catalog structure
- `/data.json` reflects datasets created through the admin UI
- `/data.json` does not include draft datasets

### Feature 3 & 4: Dataset CRUD + Distribution Management

**Unit tests** — `src/lib/actions/datasets.test.ts`:
- `createDataset` validates input with Zod before database call
- `createDataset` generates a slug from the title
- `createDataset` creates keywords in the same transaction
- `createDataset` sets modified to current date
- `createDataset` uses custom identifier when provided
- `createDataset` auto-generates UUID identifier when omitted
- `createDataset` rejects invalid input with descriptive errors
- `updateDataset` updates modified timestamp
- `updateDataset` syncs keywords (deletes old, creates new)
- `deleteDataset` calls Prisma delete (cascade handles relations)
- `getDataset` returns null for non-existent ID
- `getDatasetBySlug` includes publisher, distributions, keywords
- `listDatasets` returns paginated results with total count
- `listDatasets` applies search filter
- `listDatasets` applies organizationId filter
- `listDatasets` applies status filter

**Unit tests** — `src/lib/actions/distributions.test.ts` (or within datasets.test.ts):
- `addDistribution` validates input
- `addDistribution` rejects when neither downloadURL nor accessURL provided
- `removeDistribution` calls Prisma delete

**Integration tests** — `src/lib/actions/datasets.integration.test.ts`:
- Full create → read → update → delete lifecycle
- Keywords are created and can be queried
- Distributions are created with dataset and cascade-deleted
- Search returns matching datasets
- Pagination returns correct slices

**Component tests** — `src/components/datasets/DatasetForm.test.tsx`:
- Renders all required field inputs
- Shows validation errors on submit with empty form
- Calls onSubmit with correct data when valid form submitted
- Pre-fills form in edit mode when initialData provided
- Renders distribution sub-form
- Can add and remove distribution entries

**E2E tests** — `e2e/datasets.spec.ts`:
- Admin can create a dataset through the form
- Admin can edit an existing dataset
- Admin can delete a dataset
- Created dataset appears on public listing page
- Deleted dataset no longer appears on public listing page

### Feature 5: File Upload & Storage

**Unit tests** — `src/lib/utils/upload.test.ts`:
- `saveUploadedFile` rejects disallowed MIME types
- `saveUploadedFile` rejects files exceeding size limit
- `saveUploadedFile` generates a unique filename with correct extension
- `saveUploadedFile` returns correct publicUrl path

**Unit tests** — `src/app/api/upload/route.test.ts`:
- POST returns 400 when no file provided
- POST returns 400 for disallowed file types
- POST returns 201 with upload result for valid file
- POST rejects unauthenticated requests

### Feature 6: Public Dataset Listing & Detail Pages

**Component tests** — `src/components/datasets/DatasetCard.test.tsx`:
- Renders title as link to /datasets/{slug}
- Displays publisher name
- Renders keyword badges
- Renders format badges for distributions
- Truncates long descriptions

**E2E tests** — `e2e/public-pages.spec.ts`:
- Homepage loads and shows recent datasets
- Dataset listing page at /datasets shows paginated datasets
- Dataset detail page displays full metadata
- Dataset detail page shows distributions with download links
- Organization listing page shows organizations with dataset counts
- Organization detail page shows org's datasets
- 404 page shown for non-existent dataset slug

### Feature 7: Basic Search

**Unit tests** — `src/lib/utils/search.test.ts`:
- `buildSearchWhere` returns empty object for empty query
- `buildSearchWhere` creates OR conditions across title, description, keywords
- `buildSearchWhere` handles multi-word queries with AND logic
- `buildSearchWhere` uses case-insensitive mode for all contains filters
- `buildSearchWhere` handles special characters safely

**Component tests** — `src/components/ui/SearchBar.test.tsx`:
- Renders search input
- Updates URL params on submit

**E2E tests** — `e2e/search.spec.ts`:
- Search returns matching datasets
- Search with no results shows empty state
- Search preserves query in URL

### Feature 8: Publisher/Organization Support

**Unit tests** — `src/lib/actions/organizations.test.ts`:
- `createOrganization` validates input
- `createOrganization` generates slug from name
- `deleteOrganization` fails when org has datasets
- `listOrganizations` returns all organizations

**Integration tests** — `src/lib/actions/organizations.integration.test.ts`:
- Create → read → update → delete lifecycle
- Cannot delete organization that has datasets

### Feature 9: Authentication & Authorization

**Unit tests** — auth configuration tests are limited; focus on E2E.

**E2E tests** — `e2e/auth.spec.ts`:
- Login page renders email and password inputs
- Admin pages redirect to /login when unauthenticated
- Login with valid credentials redirects to admin dashboard
- Login with invalid credentials shows error message
- API mutation endpoints return 401 for unauthenticated requests
- Logout redirects to homepage

### Feature 10: REST API

**Unit tests** — `src/app/api/datasets/route.test.ts`:
- GET returns paginated dataset list
- GET applies search query parameter
- POST creates dataset and returns 201 (with auth)
- POST returns 401 without auth
- POST returns 400 for invalid input

**Unit tests** — `src/app/api/datasets/[id]/route.test.ts`:
- GET returns dataset by ID
- GET returns 404 for non-existent ID
- PUT updates dataset and returns 200 (with auth)
- PUT returns 401 without auth
- DELETE removes dataset and returns 204 (with auth)
- DELETE returns 401 without auth

**Unit tests** — `src/lib/utils/api.test.ts`:
- `handleApiError` returns 400 with field errors for ZodError
- `handleApiError` returns 500 for generic Error
- `unauthorized` returns 401
- `notFound` returns 404 with resource name

---

## Tier 2 — Core Experience Tests

### Feature 11: Faceted Search & Filtering

**Unit tests** — `src/lib/actions/facets.test.ts`:
- `getFacetCounts` returns organization counts
- `getFacetCounts` returns keyword counts
- `getFacetCounts` returns format counts

**Unit tests** — `src/lib/utils/search.test.ts` (extend):
- `buildSearchWhere` applies organizationId filter
- `buildSearchWhere` applies keyword filter
- `buildSearchWhere` applies format filter via distribution join
- `buildSearchWhere` applies theme filter
- `buildSearchWhere` combines multiple filters with AND

**Component tests** — `src/components/search/FacetSidebar.test.tsx`:
- Renders facet sections (organizations, keywords, formats)
- Displays counts next to facet values
- Generates correct URL params when facet clicked
- Shows active filters as removable chips

### Feature 13: Data Preview

**Component tests** — `src/components/datasets/DataPreview.test.tsx`:
- Renders table for CSV data
- Shows "Download full dataset" link
- Shows file info for unsupported formats
- Handles loading state
- Handles error state

### Feature 14: Datastore (Queryable Tabular Data)

**Unit tests** — `src/lib/services/datastore.test.ts`:
- `importCSVToDatastore` creates table with correct columns
- `importCSVToDatastore` infers types from data (text, integer, real)
- `importCSVToDatastore` sets status to "ready" on success
- `importCSVToDatastore` sets status to "error" on failure

**Unit tests** — `src/app/api/datastore/[distributionId]/route.test.ts`:
- GET returns columns and records
- GET applies limit and offset
- GET applies sort parameter
- GET applies filter conditions
- GET returns 404 for non-existent distribution
- GET validates column names against known columns (SQL injection prevention)

**Integration tests** — `src/lib/services/datastore.integration.test.ts`:
- Import a real CSV file and query the resulting table
- Filter, sort, and paginate work correctly
- Row count matches CSV file

### Feature 16: License Management

**Unit tests** — `src/lib/data/licenses.test.ts`:
- All licenses have id, name, and url
- License URLs are valid format
- No duplicate license IDs

### Feature 18: Metadata Validation

**Component tests** — `src/components/datasets/MetadataCompleteness.test.tsx`:
- Shows 100% for fully complete dataset
- Shows correct percentage for partially complete dataset
- Lists missing recommended fields

### Feature 19: SEO & Structured Data

**Unit tests** — `src/components/seo/DatasetJsonLd.test.tsx`:
- Renders script tag with type application/ld+json
- JSON-LD contains @type: Dataset
- JSON-LD maps all required Schema.org fields
- JSON-LD includes distributions as DataDownload

**Unit tests** — `src/app/sitemap.test.ts`:
- Sitemap includes root URL
- Sitemap includes /datasets URL
- Sitemap includes URLs for all published datasets

### Feature 20: Multi-role Authorization

**Unit tests** — `src/lib/auth/roles.test.ts`:
- `hasPermission` returns true for admin on any permission
- `hasPermission` returns true for editor on dataset:create
- `hasPermission` returns false for viewer on dataset:create
- `hasPermission` returns true for orgAdmin on dataset:edit:own_org
- `hasPermission` returns false for editor on organization:edit:own

**E2E tests** — `e2e/roles.spec.ts`:
- Editor can create datasets but not manage organizations
- Viewer can view but not create datasets
- Admin can access all features

---

## Tier 3 — Differentiation Tests

### Feature 21: Harvesting

**Unit tests** — `src/lib/services/harvest.test.ts`:
- `runHarvest` fetches remote data.json URL
- `runHarvest` creates local datasets from remote catalog
- `runHarvest` updates existing datasets when remote is newer
- `runHarvest` archives local datasets removed from remote
- `runHarvest` maps DCAT-US fields correctly
- `runHarvest` records job with created/updated/deleted counts
- `runHarvest` handles fetch errors gracefully
- `runHarvest` handles malformed JSON gracefully

**Integration tests** — `src/lib/services/harvest.integration.test.ts`:
- Harvest a mock data.json (serve from test fixtures) and verify datasets created in test DB
- Re-harvest and verify updates applied
- Verify harvested datasets have correct harvestSourceId

**E2E tests** — `e2e/harvest.spec.ts`:
- Admin can create a harvest source
- Admin can trigger a manual harvest
- Harvest results show in job history

### Feature 22: Data Dictionary Support

**Unit tests** — `src/lib/services/data-dictionary.test.ts`:
- Auto-generates fields from datastore columns
- Maps datastore types to data dictionary types correctly

**Component tests** — `src/components/datasets/DataDictionaryEditor.test.tsx`:
- Renders one row per field
- Allows editing title and description
- Save button triggers update action

**Component tests** — `src/components/datasets/DataDictionaryView.test.tsx`:
- Renders read-only table with column details
- Shows "No data dictionary" message when none exists

### Feature 23: Basic Data Visualization

**Component tests** — `src/components/visualizations/ChartBuilder.test.tsx`:
- Renders chart type selector
- Renders column dropdowns populated from data
- Renders chart when configuration is complete
- Generates embed code on button click

### Feature 24: Activity Stream / Audit Log

**Unit tests** — `src/lib/services/activity.test.ts`:
- `logActivity` creates ActivityLog record
- `logActivity` stores changed fields diff in details

### Feature 26: Bulk Import/Export

**Unit tests** — `src/lib/services/bulk-import.test.ts`:
- `bulkImportCSV` parses CSV and creates datasets
- `bulkImportCSV` reports errors per row
- `bulkImportCSV` skips rows with missing required fields
- `bulkImportJSON` parses DCAT-US catalog format
- `bulkImportJSON` maps all fields correctly

### Feature 28: Cloud Storage Integration

**Unit tests** — `src/lib/storage/s3.test.ts`:
- `upload` calls PutObjectCommand with correct parameters
- `delete` calls DeleteObjectCommand
- `getSignedUrl` returns a URL string

**Unit tests** — `src/lib/storage/local.test.ts`:
- `upload` writes file to correct path
- `delete` removes file from filesystem
- `upload` creates directory if not exists

**Unit tests** — `src/lib/storage/factory.test.ts`:
- Returns LocalStorage when STORAGE_PROVIDER=local
- Returns S3Storage when STORAGE_PROVIDER=s3
- Defaults to LocalStorage when env not set

### Feature 29: Content Pages / CMS

**Unit tests** — page CRUD actions follow the same pattern as dataset actions
**E2E tests** — `e2e/pages.spec.ts`:
- Admin can create a content page
- Published page renders at /pages/{slug}
- Navigation includes published pages

### Feature 30: Email Notifications

**Unit tests** — `src/lib/services/email.test.ts`:
- `ConsoleEmailService.send` logs to console
- `SmtpEmailService.send` calls nodemailer transport (mock transport)

**Unit tests** — `src/lib/email-templates/dataset-created.test.ts`:
- Returns subject and html body
- Subject includes dataset title
- HTML body includes dataset URL

---

## Tier 4 — Advanced / Enterprise Tests

### Feature 31: DCAT-US v3.0 Support

**Unit tests** — `src/lib/schemas/dcat-us.test.ts` (extend):
- v3.0 output includes dcat:version when present
- v3.0 output includes dcat:inSeries reference
- v3.0 output includes dcat:previousVersion when present
- v3.0 changes conformsTo to v3.0 schema URI
- v1.1 output unchanged when v3.0 not enabled

### Feature 32: Editorial Workflow

**Unit tests** — `src/lib/services/workflow.test.ts`:
- `transitionWorkflow` allows draft → pending_review
- `transitionWorkflow` allows pending_review → approved
- `transitionWorkflow` allows pending_review → rejected
- `transitionWorkflow` blocks draft → published (must go through review)
- `transitionWorkflow` blocks viewer from any transition
- `transitionWorkflow` blocks editor from approving
- `transitionWorkflow` creates WorkflowTransition record
- `transitionWorkflow` updates timestamps (submittedAt, reviewedAt, publishedAt)

**E2E tests** — `e2e/workflow.spec.ts`:
- Editor submits dataset for review
- Org admin sees pending review queue
- Org admin approves dataset → status changes to published
- Org admin rejects dataset with note → editor sees rejection

### Feature 33: Dataset Versioning

**Unit tests** — `src/lib/services/versioning.test.ts`:
- `createVersion` snapshots full dataset metadata as JSON
- `createVersion` updates dataset.version field
- `compareVersions` detects changed fields
- `compareVersions` handles added/removed distributions

### Feature 34: Federation (Outbound)

**Unit tests** — `src/lib/schemas/ckan-compat.test.ts`:
- `datasetToCKAN` maps title, notes, tags correctly
- `datasetToCKAN` maps resources from distributions
- `datasetToCKAN` maps organization correctly

**Unit tests** — CKAN API route tests:
- `/api/3/action/package_list` returns array of dataset slugs
- `/api/3/action/package_show` returns CKAN-formatted dataset
- `/api/3/action/package_show` returns 404 for non-existent ID
- `/api/3/action/package_search` applies search query

### Feature 35: Analytics Dashboard

**Unit tests** — `src/lib/services/analytics.test.ts`:
- `getAnalyticsSummary` aggregates counts by event type
- `getAnalyticsSummary` calculates daily trends
- `getDatasetAnalytics` returns per-dataset metrics

### Feature 36: Data Quality Scoring

**Unit tests** — `src/lib/services/data-quality.test.ts`:
- Fully complete dataset scores 100
- Dataset missing title/description scores lower
- Dataset with no distributions loses distribution points
- Dataset with data dictionary gets bonus points
- `suggestions` array lists missing recommended fields
- Score breakdown sums to overall score

### Feature 40: Plugin / Extension System

**Unit tests** — `src/lib/plugins/hooks.test.ts`:
- `register` adds callback to hook
- `run` executes all registered callbacks in order
- `run` passes arguments to callbacks
- `run` returns array of results
- `run` handles async callbacks
- `run` returns empty array for unregistered hook name

---

## Coverage Targets

| Tier | Target | Rationale |
|------|--------|-----------|
| Tier 1 | 80%+ | Core compliance and CRUD must be well-tested |
| Tier 2 | 75%+ | UI-heavy features are harder to unit test; E2E fills gaps |
| Tier 3 | 70%+ | Complex integrations (harvest, datastore) rely more on integration tests |
| Tier 4 | 70%+ | Enterprise features; plugin system tested via hook unit tests |

Run `npm run test:coverage` to check. Critical modules that must maintain 90%+ coverage:
- `src/lib/schemas/dcat-us.ts` — DCAT-US compliance is the product's core promise
- `src/lib/schemas/dataset.ts` — Validation correctness
- `src/lib/services/workflow.ts` — State machine must be bulletproof
- `src/lib/services/data-quality.ts` — Scoring algorithm correctness
- `src/lib/auth/roles.ts` — Authorization must be correct
