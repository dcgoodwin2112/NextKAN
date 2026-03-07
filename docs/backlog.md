# Backlog

Pending features and tasks for future implementation. See `docs/backlog-completed.md` for completed items.

---

## Admin UX

### Custom Fields for Datasets

**Priority:** Medium
**Reason:** The dataset schema is fixed to DCAT-US v1.1 fields. Organizations often need domain-specific metadata (e.g., "Data Steward", "Update Frequency Detail", "Department Code", "Grant Number") that doesn't map to any DCAT-US property. Currently the only workaround is stuffing values into `references` or `describedBy`, which loses structure and searchability.

#### Scope

- **CustomFieldDefinition model:** Admin-defined field definitions with `name` (machine key), `label` (display), `type` (text, number, date, url, select, multiselect, boolean), `required`, `options` (JSON array for select/multiselect), `sortOrder`, optional `organizationId` (org-scoped vs global). Unique on `[name]` (or `[name, organizationId]` for scoped fields).
- **DatasetCustomFieldValue model:** Per-dataset values linking `datasetId` + `customFieldDefinitionId` + `value` (stored as text). Cascade delete with dataset.
- **Admin field management page:** `/admin/custom-fields` — CRUD for field definitions. Reorder, preview, set required/optional. Org-scoped fields only appear for datasets in that org.
- **DatasetForm integration:** Render custom fields in a "Custom Fields" CollapsibleSection (after Additional Metadata). Dynamic form controls based on field type. Validate required fields on submit.
- **Server action changes:** `createDataset()` / `updateDataset()` accept optional `customFields: Record<string, string>` and upsert `DatasetCustomFieldValue` records. `getDataset()` includes custom field values in response.
- **Public display:** Custom fields rendered in a "Additional Information" section on the public dataset detail page as a key-value list.
- **DCAT-US compatibility:** Custom fields do NOT appear in `/data.json` output (they're outside the DCAT-US spec). Optionally include them in the bulk JSON export under an `_extras` key (following CKAN's convention).
- **Search integration:** Extend `buildSearchWhere()` to optionally search custom field values (text search across `DatasetCustomFieldValue.value`).
- **Template support:** Extend `TemplateFields` to include default custom field values so templates can pre-fill org-specific fields.

#### Key Files

- `prisma/schema.prisma` — `CustomFieldDefinition` + `DatasetCustomFieldValue` models
- `src/lib/schemas/custom-fields.ts` — Zod schemas for definition CRUD and value validation
- `src/lib/actions/custom-fields.ts` — CRUD actions for field definitions
- `src/lib/actions/datasets.ts` — extend `createDataset()` / `updateDataset()` / `getDataset()`
- `src/app/admin/custom-fields/` — admin management pages (list, new, edit)
- `src/components/datasets/DatasetForm.tsx` — dynamic custom field rendering
- `src/components/datasets/CustomFieldsSection.tsx` — reusable custom fields form section
- `src/app/datasets/[slug]/page.tsx` — public display of custom field values

---

### Bulk Actions on Admin Lists

**Priority:** Medium
**Reason:** Admin list pages (datasets, users, organizations, pages) only support one-at-a-time operations. Both CKAN and DKAN provide bulk operations — selecting multiple items and applying an action (publish, unpublish, delete, change organization). Managing catalogs with 100+ datasets requires batch operations.

#### Scope

- **Selectable rows:** Add checkbox column to admin dataset table/grid. "Select all" checkbox in header. Selected count indicator.
- **Bulk action bar:** Sticky bar appears when items are selected, showing count and action buttons:
  - **Datasets:** Publish, Unpublish (set to draft), Archive, Delete (soft delete), Change Organization
  - **Users:** Change Role, Delete
  - **Pages:** Publish, Unpublish, Delete
- **Confirmation dialog:** AlertDialog before destructive bulk actions showing count and action description.
- **Server actions:** New `bulkUpdateDatasets(ids: string[], update: Partial)` and `bulkDeleteDatasets(ids: string[])` actions. Single transaction for atomicity.
- **Start with datasets:** The dataset list is the highest-value target. Extend pattern to other admin lists afterward.
- **Requires dataset list search/filter first:** This builds on the Admin Dataset List item — bulk actions are most useful when you can filter to a subset then act on it.

#### Key Files

- `src/app/admin/datasets/page.tsx` — selectable grid/table, bulk action bar
- `src/lib/actions/datasets.ts` — `bulkUpdateDatasets()`, `bulkDeleteDatasets()`
- `src/components/admin/BulkActionBar.tsx` — reusable sticky bar component

---

### API Token Management

**Priority:** Medium
**Reason:** NextKAN has no API authentication mechanism beyond session cookies. External scripts, CI pipelines, harvest clients, and third-party integrations cannot authenticate to the API. CKAN 2.9+ provides per-user API tokens (create, revoke, encrypted storage) manageable from the user profile UI. Without this, the API is either fully open or fully session-gated.

#### Scope

- **ApiToken model:** `id`, `userId`, `name` (user-provided label, e.g. "CI Pipeline"), `tokenHash` (bcrypt/SHA-256 hash — never store plaintext), `lastUsedAt`, `expiresAt` (optional), `createdAt`. Cascade delete with user.
- **Token generation:** Generate cryptographically random token (e.g. `crypto.randomBytes(32).toString('hex')`), display once on creation, store only the hash. Prefix tokens with `nkan_` for easy identification.
- **Auth middleware:** Check `Authorization: Bearer <token>` header on API routes. Look up token hash, resolve user, attach to request context. Fall back to session auth if no bearer token.
- **User profile UI:** Token management section on `/admin/users/[id]/edit` (or dedicated page). Create token (name + optional expiry), list active tokens (name, created, last used, expiry), revoke individual tokens.
- **Rate limiting (optional):** Per-token rate limiting via in-memory counter or database tracking.
- **Admin visibility:** Admins can view (but not read) token metadata for any user. Admins can revoke any user's tokens.

#### Key Files

- `prisma/schema.prisma` — `ApiToken` model
- `src/lib/schemas/api-token.ts` — Zod schemas for create/list
- `src/lib/actions/api-tokens.ts` — CRUD actions (create, list, revoke)
- `src/lib/auth/api-token.ts` — token verification middleware
- `src/app/api/` — integrate bearer auth into existing API route handlers
- `src/app/admin/users/[id]/edit/page.tsx` — token management UI section

---

### User Self-Registration

**Priority:** Low
**Reason:** NextKAN only supports admin-created user accounts. Both CKAN and DKAN offer configurable registration modes — open registration, registration with admin approval, or admin-only. Organizations that want community contributors or inter-agency collaboration need a self-service signup flow.

#### Scope

- **Registration modes** (via admin setting `USER_REGISTRATION_MODE`):
  - `disabled` (default, current behavior) — admin-only account creation
  - `approval` — users register, account is inactive until admin approves
  - `open` — users register and immediately get access with a configurable default role
- **Registration page:** `/register` — public form with name, email, password, optional organization request. Only rendered when mode is not `disabled`.
- **Approval workflow:** New `User.status` field (`active`, `pending`, `disabled`). Admin users page shows pending accounts with approve/reject actions. Email notification to admins on new registration. Email notification to user on approval.
- **Default role:** `USER_DEFAULT_ROLE` setting (default: `viewer`). Applied on registration or approval.
- **Anti-abuse:** Rate limiting on registration endpoint. Optional CAPTCHA integration (e.g. hCaptcha/Turnstile) via env var.
- **Email verification (optional):** Send verification link on registration. Account not active until email confirmed.

#### Key Files

- `prisma/schema.prisma` — add `status` field to User model
- `src/app/(public)/register/page.tsx` — registration form page
- `src/lib/actions/users.ts` — `registerUser()`, `approveUser()`, `rejectUser()`
- `src/lib/services/settings.ts` — `getUserRegistrationMode()`, `getUserDefaultRole()`
- `src/app/admin/users/page.tsx` — pending user approval UI
- `src/lib/services/email.ts` — registration + approval email templates

---

## Public UI/UX

### Public Page UX Polish

**Priority:** High
**Reason:** No existing backlog item covers public-facing UX. Detail pages lack breadcrumbs, pages flash from empty to loaded with no skeleton loaders, the footer is minimal with no links, the header doesn't render `siteConfig.logo`, there's no custom 404 page, and long dataset detail pages have no back-to-top affordance.

#### Scope

- **Breadcrumbs component:** Reusable `<Breadcrumbs>` for dataset, organization, series, and theme detail pages (e.g., Home > Datasets > Dataset Title)
- **Skeleton loaders:** Loading skeletons for dataset list and detail pages (Next.js `loading.tsx` files with shimmer placeholders)
- **Footer enhancement:** Configurable footer with links (about, privacy, contact) — either from SiteConfig fields or content pages with `navLocation: "footer"`
- **Header logo:** Render `siteConfig.logo` as an `<img>` next to the site title in the public header
- **Custom 404 page:** Branded `not-found.tsx` matching the site theme, with search bar and link to homepage
- **Back-to-top button:** Floating button on dataset detail pages that appears after scrolling past a threshold

#### Key Files

- `src/components/public/Breadcrumbs.tsx` — new reusable component
- `src/app/datasets/loading.tsx`, `src/app/datasets/[slug]/loading.tsx` — skeleton loaders
- `src/components/layout/Footer.tsx` — enhanced footer
- `src/components/layout/Header.tsx` — logo rendering
- `src/app/not-found.tsx` — custom 404 page
- `src/components/public/BackToTop.tsx` — scroll-to-top button

---

### Related Datasets & Discovery

**Priority:** Medium
**Reason:** No cross-linking between datasets exists. Users see one dataset at a time with no suggestions for related content. The homepage shows recent datasets but no featured or trending sections.

#### Scope

- **Related datasets component:** Query datasets sharing themes or keywords with the current dataset, exclude the current one, limit to 3–4. Display on public dataset detail page.
- **Featured datasets:** Add `isFeatured` boolean to Dataset model. Admin toggle on dataset edit page. Featured section on homepage above recent datasets.
- **Popular datasets:** Query AnalyticsEvent for most-downloaded datasets. Display on homepage below featured section.

#### Key Files

- `src/components/datasets/RelatedDatasets.tsx` — new component
- `src/lib/services/discovery.ts` — queries for related, featured, and popular datasets
- `src/app/page.tsx` — homepage sections for featured and popular
- `src/app/datasets/[slug]/page.tsx` — add RelatedDatasets to detail page
- `prisma/schema.prisma` — add `isFeatured` field to Dataset

---

### Public Organization & Theme Pages Enhancement

**Priority:** Low
**Reason:** Organization and theme list pages are bare compared to the dataset list — no search, filtering, sorting, or hierarchy visualization.

#### Scope

- **Organization search:** Add search input to `/organizations` page, filter by name
- **Org hierarchy:** Display sub-organizations indented or nested under parent orgs
- **Theme detail page:** `/themes/[slug]` with theme description, dataset count, and paginated dataset list
- **Sorting:** Alphabetical and by dataset count on both org and theme list pages

#### Key Files

- `src/app/organizations/page.tsx` — add search + sorting + hierarchy display
- `src/app/themes/[slug]/page.tsx` — new theme detail page
- `src/app/themes/page.tsx` — add sorting options

---

### Full WCAG 2.1 AA Audit

**Priority:** Medium
**Deferred from:** Tier 2

#### Done in Tier 2

- Semantic HTML (`<main>`, `<nav>`, `<section>`)
- Focus indicators on interactive elements
- Keyboard-accessible navigation (hamburger menu)
- Form inputs with associated labels
- Responsive layout at all breakpoints

#### Remaining

- Thorough color contrast audit (4.5:1 for normal text, 3:1 for large text)
- Screen reader testing (NVDA/VoiceOver)
- ARIA attributes where semantic HTML is insufficient
- Skip navigation links
- Error announcement for form validation
- Focus management on route changes

---

## Datastore Enhancements

### JSON + GeoJSON Import

**Priority:** Medium
**Reason:** Only CSV files uploaded to local storage are currently parsed into queryable datastore tables. JSON and GeoJSON files are stored as static files with no parsing, type inference, or table creation.

#### Scope

- Detect `application/json` and `application/geo+json` mimetypes in `addDistribution()`
- **JSON:** Expect array of objects at root (or nested under a configurable key). Flatten to columns.
- **GeoJSON:** Extract `features[].properties` as columns, store `geometry` as TEXT/JSON column
- Reuse existing `importCsvToDatastore()` patterns: DatastoreTable creation, type inference on values, batch insert, auto data dictionary generation
- New `importJsonToDatastore()` and `importGeoJsonToDatastore()` functions in `src/lib/services/datastore.ts`
- Trigger: same fire-and-forget pattern as CSV in `src/lib/actions/datasets.ts:addDistribution()`

---

### Remote URL Downloading

**Priority:** Medium
**Reason:** Resources added via `downloadURL` (no local file upload) are never fetched or imported into the datastore. CKAN's XLoader handles this via async fetch + import.

#### Scope

- New `fetchAndImportRemoteResource(distributionId, downloadURL)` service function
- Download file to temp directory, detect mimetype from Content-Type header + file extension
- If CSV/JSON/GeoJSON: pipe into existing import functions
- Handle errors: timeout, too large (configurable max size), unreachable, unsupported format
- Initially fire-and-forget like CSV; consider background job / queue pattern later
- Trigger: in `addDistribution()` when `downloadURL` is provided but no `filePath`
- Consider periodic re-fetch for URL-based resources (like CKAN's XLoader)

#### Key Files

- `src/lib/services/datastore.ts` — new fetch + import function
- `src/lib/actions/datasets.ts` — trigger in `addDistribution()`

---

### Excel Import

**Priority:** Low
**Reason:** `.xlsx` and `.xls` files are stored as static files with no parsing into queryable datastore tables.

#### Scope

- Add `xlsx` (SheetJS) package as dependency
- New `importExcelToDatastore()` in `src/lib/services/datastore.ts`
- Read first sheet by default (configurable)
- Convert to row/column format, reuse type inference and batch insert logic
- Detect `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` and `application/vnd.ms-excel` mimetypes in `addDistribution()`
- Trigger: same fire-and-forget pattern as CSV

---

### Data Dictionary Import/Export

**Priority:** Medium
**Reason:** Data dictionaries can only be created via auto-generation from CSV import or manual editing in the admin UI. There's no way to import a pre-existing data dictionary or export one for use in external tools.

#### Scope

- **CSV import:** Parse a CSV with columns for field name, type, title, description, format, constraints. Create/replace DataDictionary + DataDictionaryField records for a distribution.
- **JSON import:** Accept Frictionless Table Schema JSON (same format as the existing export at `/api/datasets/:id/dictionary`). Round-trip support.
- **CSV export:** Export data dictionary fields as a flat CSV (complements the existing JSON export).
- Admin UI: file upload or paste for import, download buttons for export in both formats.

#### Key Files

- `src/lib/services/data-dictionary.ts` — import parsing logic
- `src/app/api/datasets/[id]/dictionary/route.ts` — existing JSON export, add CSV export + import endpoints
- `src/components/data-dictionary/DataDictionaryEditor.tsx` — import/export UI controls

---

## Enterprise Features

### Feature 38: SSO / External Auth

**Priority:** Low
**Deferred from:** Tier 4
**Reason:** Requires external OAuth provider setup (GitHub, Azure AD, SAML) and significant auth infrastructure changes.

#### Scope

- **OAuth2 Provider Support:** Add GitHub, Google, Azure AD providers to NextAuth.js config, gated by env vars (`GITHUB_CLIENT_ID`, `AZURE_AD_CLIENT_ID`, etc.)
- **SAML Support:** Optional integration via `@boxyhq/saml-jackson` for government SSO
- **User Provisioning:** Auto-create User record on first SSO login with configurable default role (`SSO_DEFAULT_ROLE`)

#### Key Files

- `src/lib/auth.ts` — add OAuth/SAML providers alongside existing credentials provider
- New env vars: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID`, `SSO_DEFAULT_ROLE`

---

### Feature 39: Multi-language Support (i18n)

**Priority:** Low
**Deferred from:** Tier 4
**Reason:** Requires `next-intl` integration, message extraction across all UI components, and multilingual metadata schema changes.

#### Scope

- **UI Internationalization:** Install `next-intl`, create `messages/en.json` + additional locale files, wrap root layout with `NextIntlClientProvider`
- **Multilingual Metadata:** New `DatasetTranslation` model (datasetId + locale + title + description + keywords), unique on `[datasetId, locale]`
- **Language-aware API:** `/data.json` and `/api/datasets` accept `?lang=` parameter, merge translated fields over defaults

#### Key Files

- `src/i18n.ts` — next-intl config
- `messages/*.json` — locale message files
- `prisma/schema.prisma` — DatasetTranslation model
- `src/lib/schemas/dcat-us.ts` — language-aware transformer

---

## Developer Experience

### Developer Documentation

**Priority:** High
**Reason:** No contributor-facing docs exist beyond `CLAUDE.md`. Developers need guidance on architecture, extending the platform, and contributing.

#### Scope

- **Architecture overview:** App Router structure, data flow (server actions → Prisma → DB), auth model
- **Development setup:** Prerequisites, environment variables, database options (SQLite vs PostgreSQL)
- **Extension guide:** Adding new API endpoints, creating server actions, adding admin pages, writing Zod schemas
- **Plugin development:** Hook API reference, example plugin walkthrough
- **Testing guide:** How to write unit tests (Vitest mocks, Prisma mock pattern), integration tests (real DB), E2E tests (Playwright page objects)
- **Deployment:** Production configuration, PostgreSQL migration, environment variable reference

---

### `create-nextkan` CLI

**Priority:** Low
**Reason:** No scaffolding tool exists. Developers must clone the repo manually. A generate command streamlines project creation.

#### Scope

- **CLI package:** `create-nextkan` npm package (à la `create-next-app`)
- **Interactive prompts:** Project name, database choice (SQLite/PostgreSQL), optional features (workflow, comments, analytics)
- **Scaffolding:** Clone/copy template, write `.env` with selected options, install dependencies, run `prisma db push` + `prisma db seed`
- **Publish:** npm package with `bin` entry point, invokable via `npx create-nextkan`
