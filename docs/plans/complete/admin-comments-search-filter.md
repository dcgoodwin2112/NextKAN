# Admin Comments: Search, Sort & Pagination

## Context

The comments moderation page (`/admin/comments`) calls `getPendingComments()` which returns all unapproved comments in a flat table. No search, filtering, sorting, or pagination. If moderation volume is high (many datasets, active commenting), this page becomes hard to manage.

Additionally, the page only shows pending (unapproved) comments. Admins may want to see all comments or filter by approval status.

## Approach

Add a `searchComments()` function that supports search, status filtering, pagination, and sort. Create a `CommentFilterBar` client component. Update the page to use URL search params.

## Step 1: Add `searchComments()` function

**File:** `src/lib/services/comments.ts`

```ts
export async function searchComments(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string; // "pending" | "approved" | "all"
  sort?: string;
}) {
  // pagination: skip/take
  // search: authorName contains OR authorEmail contains OR content contains (AND for multi-word)
  // status: pending (approved: false, default), approved (approved: true), all (no filter)
  // sort: created_desc (default) | created_asc
  // include dataset title for display
  // return { comments, total }
}
```

Keep `getPendingComments()` unchanged for backward compatibility (notification center uses it).

**Tests** in `src/lib/services/comments.test.ts`:
- Returns `{comments, total}` with pagination
- Filters by approval status
- Applies search filter
- Defaults to pending status

## Step 2: Create `CommentFilterBar` component

**New file:** `src/components/admin/CommentFilterBar.tsx` (client component)

Horizontal row with two `NativeSelect` dropdowns + clear button:
- **Status:** Pending (default) / Approved / All → `?status=`
- **Sort:** Newest first (default) / Oldest first → `?sort=`
- **Clear filters** Button — visible when any filter/search/sort is active

**New test file:** `src/components/admin/CommentFilterBar.test.tsx`
- Renders status and sort dropdowns
- Reads initial values from URL params
- Navigates with updated params on change
- Clear button resets to `/admin/comments`
- Clear button hidden when no filters active

## Step 3: Update admin comments page

**File:** `src/app/admin/comments/page.tsx`

- Accept `searchParams` prop
- Parse: `search`, `page`, `status`, `sort`
- Call `searchComments({ search, status, sort, page, limit: 20 })`
- Add SearchBar + CommentFilterBar
- Result count text
- Pagination below table
- Empty state: distinguish "no comments match filters" vs "no pending comments"
- Approve/delete actions remain unchanged

## Step 4: Add loading skeleton

**New file:** `src/app/admin/comments/loading.tsx`

Skeleton for header, search bar, filter bar, and table rows.

## Key Files

| File | Action |
|------|--------|
| `src/lib/services/comments.ts` | Modify — add `searchComments()` |
| `src/lib/services/comments.test.ts` | Modify — add search tests |
| `src/components/admin/CommentFilterBar.tsx` | New — status/sort dropdowns + clear |
| `src/components/admin/CommentFilterBar.test.tsx` | New — unit tests |
| `src/app/admin/comments/page.tsx` | Modify — add searchParams, search, filters, pagination |
| `src/app/admin/comments/loading.tsx` | New — skeleton |

## Reusable (no new code needed)

- `SearchBar`, `Pagination`, `NativeSelect`, `Label`, `Button`
- `AdminPageHeader`, `EmptyState`
- `CommentDeleteButton` — existing component

## Verification

1. `npm run test:run` — all tests pass
2. Manual: `/admin/comments` — search by author/content, filter by status, sort, pagination, approve/delete still work
3. `npm run test:e2e` — existing E2E tests pass
