# Admin Dataset List View Toggle

## Context

The admin datasets page at `/admin/datasets` only supports a card grid layout. For catalogs with many datasets, a compact table/list view is more efficient for scanning titles, statuses, and taking actions. This adds a toggle to switch between grid (cards) and list (table) views, with the preference persisted via URL param.

## New Files

### 1. `src/components/admin/ViewToggle.tsx` (client component)

Reusable toggle for grid/list view selection.

- **Props:** `basePath: string` (e.g., `/admin/datasets`)
- Reads `view` from `useSearchParams()` — default `"grid"`, only other value is `"list"`
- Two shadcn `Button` with `size="icon"` and `variant="outline"` — active button gets `variant="default"`
- Icons: `LayoutGrid` and `List` from lucide-react
- On click: `router.push()` with updated `view` param, preserving all other params (does NOT reset `page`)
- Accessibility: `aria-label="Grid view"` / `aria-label="List view"`, `aria-pressed` on active

### 2. `src/components/admin/ViewToggle.test.tsx`

~6 tests following `DatasetFilterBar.test.tsx` pattern (mock `useRouter`/`useSearchParams`):
- Renders grid and list buttons
- Grid active by default (no `view` param)
- List active when `view=list` in URL
- Clicking list navigates with `view=list`, preserving other params
- Clicking grid removes `view` param (default), preserving other params
- Preserves existing search/filter/page params when toggling

### 3. `src/components/datasets/DatasetTable.tsx`

Table view component for admin datasets. Server-friendly (no client hooks).

- **Props:** Same dataset array type as `DatasetCard` uses
- Renders shadcn `Table` with columns: Title, Organization, Status, Formats, Modified
- Title: `font-medium`, entire row links to `/admin/datasets/:id/edit` (use Link on title cell)
- Status: Same badge styling as `DatasetCard` (`statusStyles` map — duplicate the 3-line constant)
- Formats: Unique format badges (same `bg-primary-subtle` style as DatasetCard)
- Modified: `toLocaleDateString()`
- Organization: `dataset.publisher.name`

### 4. `src/components/datasets/DatasetTable.test.tsx`

~5 tests:
- Renders table headers
- Renders dataset rows with correct data
- Title links to admin edit page
- Shows status badge
- Shows format badges

## Modified Files

### 5. `src/app/admin/datasets/page.tsx`

- Read `view` param: `const view = params.view === "list" ? "list" : "grid"`
- Import `ViewToggle` and `DatasetTable`
- Place `ViewToggle` in the filter area — wrap `DatasetFilterBar` and `ViewToggle` in a flex row:
  ```tsx
  <div className="flex items-end justify-between gap-4">
    <Suspense fallback={null}>
      <DatasetFilterBar organizations={orgOptions} />
    </Suspense>
    <Suspense fallback={null}>
      <ViewToggle basePath="/admin/datasets" />
    </Suspense>
  </div>
  ```
- Conditionally render grid vs table:
  ```tsx
  {view === "list" ? (
    <DatasetTable datasets={datasets} />
  ) : (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {datasets.map((dataset) => (
        <DatasetCard key={dataset.id} dataset={dataset} adminView />
      ))}
    </div>
  )}
  ```

### 6. `src/app/admin/datasets/loading.tsx`

No changes. Grid is the default view and the skeleton matches it. Table view loads server-side quickly enough.

## Key Patterns to Reuse

- `DatasetFilterBar` test pattern at `src/components/admin/DatasetFilterBar.test.tsx` — mock `useRouter`/`useSearchParams` with `vi.hoisted`
- `DatasetCard` props interface and `statusStyles` at `src/components/datasets/DatasetCard.tsx`
- shadcn Table primitives already used on comments, users, series, templates pages

## Implementation Order

1. Create `ViewToggle` + tests
2. Create `DatasetTable` + tests
3. Modify `page.tsx` to wire both in
4. Run `npm run test:run` to verify

## Verification

- `npm run test:run` — all tests pass
- Manual: navigate to `/admin/datasets`, click list toggle → table view renders, click grid toggle → card grid renders
- Filters/search/pagination persist across view toggles
- View param in URL updates (`?view=list` / no param for grid)
