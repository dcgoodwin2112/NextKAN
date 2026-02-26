# Backlog

Features and tasks deferred for future implementation.

## Completed

- **Sample Seed Data** — 4 orgs, 4 users (all roles), 12 datasets with full DCAT-US metadata, 14 sample data files, datastore CSV import, mixed workflow states. See `prisma/seed.ts`.
- **shadcn/ui Migration (Phase 1)** — Foundation layer: `components.json`, `cn()`, 12 shadcn components, Toaster, AdminHeader + AdminSidebar migrated.
- **User Edit Functionality** — Edit page at `/admin/users/[id]/edit`, password reset, guard rails (self-role, last-admin), AlertDialog for delete, 17 unit tests.
- **Admin Settings Page** — Setting model (key/value store), settings service with sync cache + 60s TTL, admin page at `/admin/settings` with General/Features/Catalog sections. 12 DB-backed settings, toggle functions use `getSetting()`, `siteConfig` uses getters. 28 new tests (498 total).
- **Admin UX Review** — Reusable components: `AdminPageHeader`, `Breadcrumbs`, `EmptyState`, `ConfirmDeleteButton`. Loading skeletons for admin, datasets, quality, analytics. Applied to all ~22 admin pages. 18 new tests (516 total).
- **shadcn/ui Migration (Phases 2–3)** — NativeSelect component (styled native `<select>` for test compatibility). All admin forms migrated to shadcn Input/Label/Textarea/Button/NativeSelect. All 10 admin tables migrated to shadcn Table. Stat cards migrated to shadcn Card. ~25 files modified, 0 test changes.
- **Admin Dashboard Enhancement** — `getDashboardData()` orchestrator in `src/lib/services/dashboard.ts`. 5 dashboard rows: stats (published count/trend, downloads, pending review, avg quality), action items (feature-gated), catalog health (stale datasets, missing fields, dictionary coverage, empty orgs), trends (publishing rate + views/downloads charts, most viewed/downloaded), recent activity. 28 new tests (544 total).
- **Admin Notification Center** — NotificationBell client component in AdminHeader. Lightweight `getNotificationItems()` service (3 parallel queries: pending reviews, unapproved comments, failed harvests). Feature-gated, localStorage dismiss, 60s polling, badge capped at 9+. API at `/api/admin/notifications`. 22 new tests (566 total).
- **Admin Activity Log Viewer** — Extended `/api/activity` with userId, action, date range filters + CSV export. ActivityTable client component at `/admin/activity` — filterable/paginated table with URL sync, entity links, CSV download. Per-user Activity link in UserList. 13 new tests (579 total).
- **Organization Dashboard for OrgAdmins** — `getOrgDashboardData()` service at `src/lib/services/org-dashboard.ts`. Server component at `/admin/organizations/[id]` with stat cards, members table, datasets with quality badges, activity feed. Admin org list links to dashboard; edit form via button. 10 new tests (589 total).
- **Admin Resource Data Table Preview** — `DistributionPreviewPanel` client component at `src/components/admin/DistributionPreviewPanel.tsx`. Collapsible per-distribution panels on dataset edit page showing title, format badge, datastore status/row count/column count, error messages, reused `DataPreview` component, dictionary and public page links. Parallel `datastoreTable.findMany` query on edit page. 8 new tests (597 total).
- **Enhance Dataset Revisions** — `getVersionById()` + `revertToVersion()` in versioning.ts. `VersionDetail` snapshot viewer, `VersionActions` (compare + revert with AlertDialog), `VersionHistory` with admin detail links. Version detail page at `/admin/datasets/[id]/versions/[versionId]` with snapshot viewer, compare-with-current diff, and revert. 15 new tests (612 total).
- **Admin Chart Management** — Chart list page at `/admin/charts`, new chart page at `/admin/charts/new`, edit page at `/admin/charts/[id]/edit`. Server actions: `listCharts()`, `listChartableDistributions()`, `createChart()`, `updateChart()`, `deleteChart()`. ChartDeleteButton with AlertDialog. Sidebar nav entry. Datastore fixes: `limit=0` schema change (`.min(1)` → `.min(0)`), route short-circuits column-only queries (skips raw SQLite), missing table detection returns 410 + marks datastore stale. Error handling + loading states in all chart column fetchers. 13 new tests (625 total).

---

## Admin UI/UX

Items ordered by recommended implementation sequence. Establish the design system first, then build new features on top of consistent patterns.

| Step | Item | Priority | Dependencies |
|------|------|----------|--------------|
| ~~1~~ | ~~shadcn/ui Migration (Phase 1)~~ | ~~High~~ | ~~None~~ |
| ~~2~~ | ~~User Edit Functionality~~ | ~~High~~ | ~~Phase 1 primitives~~ |
| ~~3~~ | ~~Admin Settings Page~~ | ~~High~~ | ~~Phase 1 primitives~~ |
| ~~4~~ | ~~Admin UX Review~~ | ~~High~~ | ~~Phase 1 primitives, Settings~~ |
| ~~5~~ | ~~shadcn/ui Migration (Phases 2–3)~~ | ~~High~~ | ~~UX Review (defines patterns)~~ |
| ~~6~~ | ~~Enhance Admin Dashboard~~ | ~~Medium~~ | ~~UX Review (card/widget patterns)~~ |
| ~~7~~ | ~~Admin Notification Center~~ | ~~Medium~~ | ~~Dashboard (reuses aggregation queries)~~ |
| ~~8~~ | ~~Admin Activity Log Viewer~~ | ~~Medium~~ | ~~Phases 2–3 (DataTable)~~ |
| ~~9~~ | ~~Organization Dashboard for OrgAdmins~~ | ~~Medium~~ | ~~Dashboard + Activity patterns~~ |
| ~~10~~ | ~~Admin Resource Data Table Preview~~ | ~~Medium~~ | ~~UX Review (collapsible panel patterns)~~ |
| ~~11~~ | ~~Enhance Dataset Revisions~~ | ~~Medium~~ | ~~Stable UI patterns~~ |
| ~~12~~ | ~~Admin Chart Management~~ | ~~Medium~~ | ~~Phases 2–3 (DataTable, Dialog)~~ |
| 13 | Enhance Content Pages | Medium | Stable forms + editor patterns |
| 14 | Dataset Templates | Medium | Stable DatasetForm (after form migration) |

### Step 1: shadcn/ui Migration (Phase 1: Foundation)

**Priority:** High
**Reason:** 47 components with no shared UI primitives — button/input/card/table styles are duplicated 50+ times. No modal/dialog system (uses browser `confirm()`), no toast notifications, and accessibility gaps (only 22 aria attributes across 47 components). A component library eliminates duplication, adds accessible interactive primitives, and accelerates future feature development.

**Library choice:** [shadcn/ui](https://ui.shadcn.com/) — copy-paste components built on Radix primitives + Tailwind CSS. Matches the existing stack exactly (Tailwind 4, CSS variables, `.dark` class dark mode). Components live in the repo (no npm dependency lock-in).

#### Scope (Phase 1 only — Phases 2–3 in Step 5)

- Install shadcn/ui CLI, configure for Tailwind CSS 4 + existing CSS variables
- Add core primitives to `src/components/ui/`: Button, Input, Label, Select, Textarea, Card, Badge, Table, Dialog, DropdownMenu, Toast/Sonner
- Migrate AdminSidebar and AdminHeader to use new primitives

#### Key Files

- `components.json` — shadcn/ui configuration
- `src/components/ui/` — shared primitives (Button, Input, Dialog, Table, Toast, etc.)
- `src/components/layout/*.tsx` — header, sidebar, footer

---

### Step 2: User Edit Functionality

**Priority:** High
**Reason:** Admin user management only supports creating and deleting users. There's no way to change a user's role, name, email, organization assignment, or reset their password without deleting and recreating the account. Small, self-contained, and a good first feature to build with the new UI primitives.

#### Scope

- **Edit page:** `/admin/users/[id]/edit` with form for name, email, role, organization assignment
- **Password reset:** Allow admins to set a new password for a user (separate action, not pre-filled)
- **Server action:** `updateUser()` in `src/lib/actions/users.ts` with Zod validation, uniqueness check on email change
- **Guard rails:** Prevent admins from demoting their own account, prevent deleting the last admin user
- **List page link:** Add edit button/link to user rows on `/admin/users`

#### Key Files

- `src/app/admin/users/[id]/edit/page.tsx` — edit form page
- `src/lib/actions/users.ts` — add `updateUser()` action
- `src/lib/schemas/user.ts` — update schema for edit (email uniqueness, optional password)
- `src/app/admin/users/page.tsx` — add edit link to user list

---

### Step 3: Admin Settings Page

**Priority:** High
**Reason:** Optional features (comments, moderation, workflow, plugins) are controlled via env vars (`ENABLE_COMMENTS`, `ENABLE_WORKFLOW`, `ENABLE_PLUGINS`, `COMMENT_MODERATION`, `DCAT_US_VERSION`). This requires server restarts to change and is inaccessible to non-technical admins. Introduces the `Setting` model + `getSetting()` service that other items (dashboard, notifications) benefit from.

#### Scope

- **Settings model:** New `Setting` model (key/value store) in Prisma schema. Read at runtime, falling back to env vars as defaults.
- **Admin page:** `/admin/settings` with grouped sections — General (site name, description), Features (comments, moderation, workflow, plugins), Catalog (DCAT-US version, access level defaults), Storage (provider, S3 config).
- **Feature toggle service:** Replace direct `process.env` reads in `isCommentsEnabled()`, `isModerationEnabled()`, etc. with a `getSetting(key, envFallback)` helper that checks DB first.
- **Access control:** Admin-only. Changes take effect immediately without server restart.
- **Sidebar entry:** Add "Settings" to AdminSidebar navigation.

#### Key Files

- `prisma/schema.prisma` — new `Setting` model
- `src/lib/services/settings.ts` — `getSetting()` / `setSetting()` with env var fallback
- `src/app/admin/settings/page.tsx` — settings UI
- `src/lib/actions/settings.ts` — server actions for saving settings
- `src/components/layout/AdminSidebar.tsx` — add nav link

---

### Step 4: Admin UX Review and Enhancement

**Priority:** High
**Reason:** Admin pages were built feature-by-feature across Tiers 1–4 with functional correctness as the priority. The result is usable but inconsistent — varying layout patterns, minimal feedback on actions, no loading states, and form flows that could be streamlined. Do this before building new pages so they follow established patterns.

#### Scope

- **Navigation & layout:** Review sidebar grouping and ordering, add breadcrumbs, ensure consistent page header patterns (title + description + primary action)
- **List pages:** Consistent empty states, bulk actions (delete, publish, archive), inline status indicators, row-level quick actions
- **Forms:** Inline validation feedback, unsaved changes warning, autosave or draft persistence, logical field grouping and progressive disclosure for complex forms (DatasetForm)
- **Feedback:** Loading spinners on async actions, success/error toasts, confirmation dialogs for destructive actions (replacing browser `confirm()`)
- **Dashboard:** Review admin dashboard content — surface actionable items (datasets pending review, recent activity, quality issues) rather than just stats

#### Key Files

- `src/app/admin/**/*.tsx` — all admin pages and layouts
- `src/components/datasets/DatasetForm.tsx` — most complex form
- `src/components/layout/AdminSidebar.tsx` — navigation structure
- `src/app/admin/page.tsx` — dashboard

---

### Step 5: shadcn/ui Migration (Phases 2–3: Forms + DataTable)

**Priority:** High
**Reason:** The UX review (Step 4) defines the patterns to standardize. Now apply them systematically with shadcn Form, Dialog, and DataTable components.

#### Scope

**Phase 2: Forms**
- Replace raw form markup across DatasetForm, OrganizationForm, DistributionForm, and other forms with shadcn Form + Input + Select + Textarea
- Add shadcn Dialog to replace browser `confirm()` calls
- Add toast notifications for success/error feedback (replacing inline alerts)

**Phase 3: Admin List Pages**
- Replace raw `<table>` elements with shadcn DataTable (wraps TanStack React Table, already installed)
- Add sorting, filtering, pagination to admin list views (datasets, users, organizations, comments, etc.)

**Phase 4: Polish (future)**
- Replace remaining raw markup across public-facing pages
- Add Command palette (shadcn Command) for quick navigation
- Accessibility audit pass — verify ARIA attributes, focus management, keyboard navigation

#### Key Files

- `src/components/ui/` — shared primitives
- `src/app/admin/**/*.tsx` — all admin pages
- `src/components/datasets/*.tsx` — dataset forms and display components

---

### Step 6: Enhance Admin Dashboard

**Priority:** Medium
**Reason:** The dashboard currently shows only total dataset count, total org count, and the last 10 activity log entries. It doesn't surface actionable items or help admins identify problems.

#### Scope

**Summary stat cards (top row):**
- Published dataset count (with trend vs. prior month)
- Total downloads this month (from AnalyticsEvent)
- Pending review count (workflowStatus = "pending_review")
- Average data quality score (from data-quality service)

**Action-required widgets (second row):**
- Datasets pending review — list with age of oldest, link to each
- Comments pending moderation — count and oldest
- Failed harvest jobs — sources with recent errors
- Lowest quality datasets — bottom 5, with scores and edit links

**Catalog health (third row):**
- Stale datasets — published but not updated beyond their accrualPeriodicity or >180 days
- Datasets with no distributions (empty records)
- Datasets missing key DCAT-US fields (license, contactPoint, temporal)
- Data dictionary coverage — % of distributions with dictionaries
- Organizations with no published datasets

**Trends (fourth row):**
- Publishing rate over time (datasets published per month, bar chart)
- Page views + downloads over time (line chart from AnalyticsEvent)
- Most viewed and most downloaded datasets (top 5 each)

**Existing (keep):**
- Recent activity feed (already implemented)

#### Key Files

- `src/app/admin/page.tsx` — dashboard page
- `src/lib/services/dashboard.ts` — aggregation queries (new)
- `src/lib/services/data-quality.ts` — reuse scoring for average/lowest
- `src/lib/services/analytics.ts` — reuse for download/view counts

---

### ~~Step 7: Admin Notification Center~~ ✓

**Priority:** Medium
**Reason:** No persistent notification system exists. Admins must manually check individual pages to discover actionable items. Natural complement to the dashboard — surfaces the same action-required items in a persistent bell icon. Can reuse dashboard aggregation queries.

#### Scope

- **Bell icon:** In AdminHeader with unread count badge
- **Notification types:** Harvest failures (from HarvestJob), pending comments (Comment.status), datasets submitted for review (Dataset.workflowStatus = "pending_review"), quality score drops
- **Notification dropdown:** Click bell to show recent notifications with mark-as-read. Links to relevant admin pages.
- **No new storage initially:** Query existing models (HarvestJob, Comment, Dataset) on-demand. Consider a Notification model later for read/unread tracking.

#### Key Files

- `src/components/admin/NotificationBell.tsx` — bell icon + dropdown
- `src/lib/services/notifications.ts` — aggregate pending items from existing models
- `src/app/api/admin/notifications/route.ts` — API endpoint for notification data
- `src/components/layout/AdminHeader.tsx` — add NotificationBell

---

### ~~Step 8: Admin Activity Log Viewer~~ ✓

**Priority:** Medium
**Reason:** ActivityLog captures all CRUD operations but the only view is a 10-item feed on the dashboard. No way to search/filter by user, entity type, or date range. Straightforward with DataTable in place from Step 5.

#### Scope

- **Full activity page:** `/admin/activity` with filterable, paginated table
- **Filters:** By user, action type (create/update/delete), entity type (dataset/organization/user), date range
- **Per-user view:** Link from user management to see all activity by a specific user
- **Export:** CSV download of filtered results

#### Key Files

- `src/app/admin/activity/page.tsx` — new page
- `src/lib/actions/activity.ts` — filtered query action (extend existing)
- `src/components/admin/ActivityTable.tsx` — filterable table component
- `src/components/layout/AdminSidebar.tsx` — add "Activity" nav link (or update existing dashboard link)

---

### ~~Step 9: Organization Dashboard for OrgAdmins~~ ✓

**Priority:** Medium
**Reason:** The org edit page has just 4 fields. OrgAdmins have no org-centric view showing members, datasets by status, activity, or quality summary. Reuses patterns from the main dashboard (Step 6) and activity viewer (Step 8).

#### Scope

- **Org detail page:** `/admin/organizations/[id]` showing org overview (not just edit form)
- **Member list:** Users assigned to the organization with roles
- **Dataset summary:** Count by status (draft, published, archived), links to filtered dataset list
- **Recent activity:** Filtered ActivityLog entries for the organization's datasets
- **Quality summary:** Average data quality score for org's published datasets

#### Key Files

- `src/app/admin/organizations/[id]/page.tsx` — new detail/dashboard page
- `src/lib/services/organization-dashboard.ts` — aggregation queries
- `src/components/admin/OrgDashboard.tsx` — dashboard layout components

---

### ~~Step 10: Admin Resource Data Table Preview~~ ✓

**Priority:** Medium
**Reason:** The DataPreview component (CSV table, JSON viewer, PDF embed) only renders on the public dataset detail page. When editing a dataset in the admin, there's no way to preview distribution contents — admins must navigate to the public page to verify data was imported correctly.

#### Scope

- **Distribution preview panel:** Add a collapsible data preview section to the admin dataset edit page, shown per-distribution. Reuse the existing DataPreview component.
- **Datastore table view:** For distributions with a DatastoreTable, show row count, column names/types, and a paginated data table querying the datastore API.
- **Data dictionary link:** If a data dictionary exists for the distribution, show a quick link to view/edit it inline.
- **Import status:** Display DatastoreTable status (ready/error) and row count next to each CSV/imported distribution.

#### Key Files

- `src/app/admin/datasets/[id]/edit/page.tsx` — add preview panels per distribution
- `src/components/datasets/DataPreview.tsx` — reuse existing component (may need minor props adjustment for admin context)
- `src/components/admin/DistributionPreview.tsx` — new wrapper combining DataPreview + datastore status + dictionary link

---

### ~~Step 11: Enhance Dataset Revisions~~ ✓

**Priority:** Medium
**Reason:** The versioning system creates JSON snapshots and can diff between two versions, but VersionHistory only displays version number and changelog. There's no way to view the full field values of an older revision, and no way to revert a dataset to a previous state.

#### Scope

- **Version detail view:** `/admin/datasets/[id]/versions/[versionId]` page showing all fields from the snapshot in a read-only layout. Display metadata, keywords, distributions, themes — everything captured in the DCAT-US JSON snapshot.
- **Side-by-side compare:** Select any two versions to diff, not just sequential. Improve VersionDiff to handle nested fields (keywords, distributions) more clearly.
- **Revert action:** "Revert to this version" button on the version detail page. Deserializes the snapshot and updates the dataset fields, keywords, and theme associations. Creates a new version automatically with changelog noting the revert (e.g., "Reverted to v1.2").
- **VersionHistory enhancements:** Add links to view detail and diff. Show which user created each version. Highlight the current version.
- **Guard rails:** Revert preserves distributions (file references can't be reliably restored). Show a warning listing what will and won't be restored.

#### Key Files

- `src/app/admin/datasets/[id]/versions/[versionId]/page.tsx` — version detail page (new)
- `src/lib/actions/versions.ts` — add `revertToVersion()` action
- `src/lib/services/versioning.ts` — snapshot deserialization + dataset update logic
- `src/components/datasets/VersionHistory.tsx` — add detail/diff links, user attribution
- `src/components/datasets/VersionDiff.tsx` — improve nested field display, two-version selector

---

### ~~Step 12: Admin Chart Management~~ ✓

**Priority:** Medium
**Reason:** Charts can only be created from the public dataset detail page via ChartBuilder. There's no admin view to list, edit, or delete saved charts, and no way to manage charts across datasets. Admins have no visibility into which charts exist or who created them.

#### Scope

- **List page:** `/admin/charts` — table of all SavedCharts with title, dataset name, chart type, creator, created date. Filter by dataset or chart type.
- **Edit page:** `/admin/charts/[id]/edit` — reuse ChartBuilder component with pre-populated config. Allow updating title, chart type, column mappings, and options.
- **Delete:** Delete charts from list and edit pages with confirmation.
- **Bulk actions:** Select and delete multiple charts.
- **Preview:** Render ChartRenderer inline on list page (thumbnail) and full-size on edit page.
- **Sidebar entry:** Add "Charts" to AdminSidebar navigation.

#### Key Files

- `src/app/admin/charts/page.tsx` — list page (new)
- `src/app/admin/charts/[id]/edit/page.tsx` — edit page (new)
- `src/lib/actions/charts.ts` — add `updateChart()`, `deleteChart()`, `listCharts()` actions
- `src/components/visualizations/ChartBuilder.tsx` — adapt for edit mode (accept initial config)
- `src/components/layout/AdminSidebar.tsx` — add nav link

---

### Step 13: Enhance Content Pages

**Priority:** Medium
**Reason:** The Pages feature is minimal — title, markdown body, published toggle, and sort order. Admins have no control over where pages appear in navigation, no way to organize pages hierarchically, and limited formatting options.

#### Scope

- **Navigation placement:** New `navLocation` field — header, footer, both, or none. Replace current behavior where all published pages appear in the header.
- **Page hierarchy:** Optional `parentId` self-relation for nested pages (e.g., "About" → "About / Team"). Render as grouped nav items or sub-pages.
- **Meta fields:** `metaTitle`, `metaDescription` for SEO (falls back to title/content excerpt). Optional hero image URL.
- **Rich editor improvements:** Markdown preview pane (side-by-side), image upload support (reuse existing upload infrastructure), embed support for videos/iframes.
- **Page templates:** Optional template field (e.g., "default", "full-width", "sidebar") that controls layout on the public-facing page.
- **Reorder UI:** Drag-and-drop or up/down controls on the admin list page to manage sort order visually instead of entering numbers.

#### Key Files

- `prisma/schema.prisma` — add fields to `Page` model (navLocation, parentId, metaTitle, metaDescription, imageUrl, template)
- `src/lib/actions/pages.ts` — update CRUD for new fields
- `src/lib/schemas/page.ts` — extend Zod schemas
- `src/app/admin/pages/new/page.tsx` + `[id]/edit/page.tsx` — form updates
- `src/components/admin/MarkdownEditor.tsx` — preview pane, image upload
- `src/components/layout/Header.tsx` + `Footer.tsx` — nav placement rendering

---

### Step 14: Dataset Templates

**Priority:** Medium
**Reason:** Organizations that publish many similar datasets (e.g., same publisher, license, accrualPeriodicity, bureau/program codes, themes, contact info) must re-enter these fields every time. Templates let admins define reusable field presets to speed up dataset creation and enforce consistency. Best done last since it modifies the dataset creation flow after DatasetForm is stable.

#### Scope

- **DatasetTemplate model:** New Prisma model storing a name, description, and a JSON blob of pre-populated field values. Scoped to an organization (optional — `null` = global).
- **Template fields:** Any DatasetCreateInput field except title, description, and slug. Includes: publisherId, contactName, contactEmail, accessLevel, license, accrualPeriodicity, bureauCode, programCode, spatial, temporal, language, keywords, themeIds, conformsTo, seriesId.
- **Admin CRUD:** `/admin/templates` list page, `/admin/templates/new` and `/admin/templates/[id]/edit` for create/edit. Form mirrors DatasetForm but all fields are optional.
- **"Save as template":** Button on the dataset edit page that creates a template from the current dataset's field values.
- **Template selection on create:** Dropdown on `/admin/datasets/new` to select a template. Selecting one pre-fills DatasetForm fields. Users can override any value before submitting.
- **Access control:** Admins can manage all templates. OrgAdmins and editors can use templates scoped to their org or global templates.

#### Key Files

- `prisma/schema.prisma` — new `DatasetTemplate` model
- `src/lib/schemas/template.ts` — Zod schema for template CRUD
- `src/lib/actions/templates.ts` — server actions (create, update, delete, list)
- `src/app/admin/templates/` — admin pages (list, new, edit)
- `src/app/admin/datasets/new/page.tsx` — template selector dropdown
- `src/components/datasets/DatasetForm.tsx` — accept optional initial values from template

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
