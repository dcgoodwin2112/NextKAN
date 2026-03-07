# Admin Quality Report: Search, Sort & Pagination

## Context

The quality report page (`/admin/quality`) loads all datasets, computes quality scores in-memory, sorts by score ascending, and renders a flat table. No search, filtering, sorting options, or pagination. With 100+ datasets this becomes unwieldy.

Quality scores are computed at render time (not stored in DB), so server-side sorting by score requires computing all scores first, then paginating the sorted result in-memory. This is different from datasets/orgs where Prisma handles sorting.

## Approach

Keep the in-memory scoring pattern but add search, score-range filtering, org filtering, sort options, and pagination. Since scores must be computed for all matching datasets before pagination, the query flow is:
1. Fetch datasets matching search/org filter from DB
2. Compute quality scores for all matches
3. Apply score-range filter
4. Sort by selected criterion
5. Paginate the sorted array in-memory

Create a `QualityFilterBar` client component for score range, org, and sort dropdowns.

## Step 1: Extract scoring + filtering logic

**File:** `src/app/admin/quality/page.tsx`

Refactor the page to accept `searchParams`:
- Parse: `search`, `page`, `score` (poor/fair/good/excellent), `org`, `sort` from URL params
- Build Prisma `where` for search (title/description contains, multi-word AND) and org filter
- Fetch matching datasets from DB
- Compute quality scores for all matches
- Apply score-range filter: poor (0-39), fair (40-69), good (70-89), excellent (90-100)
- Sort: score_asc (default), score_desc, name_asc, name_desc
- Paginate in-memory: slice array for current page
- Summary cards computed from full filtered set (not just current page)

No new backend function needed — the scoring is inherently in-memory and page-specific.

## Step 2: Create `QualityFilterBar` component

**New file:** `src/components/admin/QualityFilterBar.tsx` (client component)

Horizontal row with three `NativeSelect` dropdowns + clear button:
- **Score Range:** All / Poor (0-39) / Fair (40-69) / Good (70-89) / Excellent (90-100) → `?score=`
- **Organization:** All / [org list] → `?org=`
- **Sort:** Score (lowest first, default) / Score (highest first) / Name A-Z / Name Z-A → `?sort=`
- **Clear filters** Button — visible when any filter/search/sort is active

**New test file:** `src/components/admin/QualityFilterBar.test.tsx`
- Renders score, org, and sort dropdowns
- Reads initial values from URL params
- Navigates with updated params on change
- Clear button resets to `/admin/quality`
- Clear button hidden when no filters active

## Step 3: Update quality report page

**File:** `src/app/admin/quality/page.tsx`

- Accept `searchParams` prop
- Add SearchBar + QualityFilterBar above summary cards
- Result count text between filters and table
- Pagination below table
- Empty state for no matches vs no datasets
- Summary cards reflect filtered dataset set

## Step 4: Add loading skeleton

**New file:** `src/app/admin/quality/loading.tsx`

Note: A loading skeleton for quality already exists. Verify and update if needed to include search bar and filter bar placeholders.

## Key Files

| File | Action |
|------|--------|
| `src/app/admin/quality/page.tsx` | Modify — add searchParams, search, filters, pagination |
| `src/components/admin/QualityFilterBar.tsx` | New — score/org/sort dropdowns + clear |
| `src/components/admin/QualityFilterBar.test.tsx` | New — unit tests |
| `src/app/admin/quality/loading.tsx` | Verify/update — skeleton with search + filter placeholders |

## Reusable (no new code needed)

- `SearchBar`, `Pagination`, `NativeSelect`, `Label`, `Button`
- `AdminPageHeader`, `EmptyState`
- `QualityBadge` — existing component
- `listOrganizations()` — for org dropdown options

## Verification

1. `npm run test:run` — all tests pass
2. Manual: `/admin/quality` — search by name, filter by score range/org, sort by score/name, pagination, summary cards reflect filters
3. `npm run test:e2e` — existing E2E tests pass
