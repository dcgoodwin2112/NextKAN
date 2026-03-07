# Admin Users: Search, Sort & Pagination

## Context

The admin users page (`/admin/users`) calls `listUsers()` which returns all users with no search, sort, or pagination. The `UserList` client component renders a flat table. As organizations grow, finding a specific user by name or email becomes painful.

The users page has a unique constraint: `UserList` is a client component that also handles the inline create-user form. The search/filter/pagination should be server-driven (URL params) like datasets and organizations, but the `UserList` component needs to remain a client component for the create form.

## Approach

Add a `searchUsers()` server function (keep `listUsers()` unchanged). Move search/filter/pagination to the server component page level. `UserList` receives the already-filtered/paginated user array. Create a `UserFilterBar` client component for role and org filter dropdowns + sort.

## Step 1: Add `searchUsers()` function

**File:** `src/lib/actions/users.ts`

```ts
export async function searchUsers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  organizationId?: string;
  sort?: string;
}) {
  // pagination: skip/take
  // search: name contains OR email contains (AND for multi-word)
  // role filter: exact match
  // organizationId filter: exact match
  // sort map: name_asc | name_desc | email_asc | email_desc | created_desc (default) | created_asc | role_asc | role_desc
  // return { users, total }
}
```

Search builds `where` with `AND` for multi-word, `OR` across `name` and `email` per term. Same pattern as `searchOrganizations()`.

**Tests** in `src/lib/actions/users.test.ts`:
- Returns `{users, total}` with pagination
- Applies search filter on name/email
- Applies role filter
- Applies org filter
- Applies sort parameter
- Defaults to `created_desc` sort

## Step 2: Create `UserFilterBar` component

**New file:** `src/components/admin/UserFilterBar.tsx` (client component)

Horizontal row with three `NativeSelect` dropdowns + clear button:
- **Role:** All / Admin / Org Admin / Editor / Viewer → `?role=`
- **Organization:** All / [org list] → `?org=`
- **Sort:** Created (newest, default) / Created (oldest) / Name A-Z / Name Z-A / Email A-Z / Email Z-A → `?sort=`
- **Clear filters** Button — visible when any filter/search/sort is active

Each onChange: reads `useSearchParams()`, sets/deletes the param, deletes `page`, calls `router.push()`.

**New test file:** `src/components/admin/UserFilterBar.test.tsx`
- Renders role, org, and sort dropdowns
- Reads initial values from URL params
- Navigates with updated params on change
- Clear button resets to `/admin/users`
- Clear button hidden when no filters active

## Step 3: Update admin users page

**File:** `src/app/admin/users/page.tsx`

Transform to accept `searchParams` prop:
- Parse: `search`, `page`, `role`, `org`, `sort` from URL params
- Call `searchUsers({ search, role, organizationId: org, sort, page, limit: 20 })`
- Still call `listOrganizations()` for filter dropdown options
- Render: AdminPageHeader → SearchBar (action="/admin/users") → UserFilterBar → result count → UserList (pass filtered users) → Pagination
- Empty state: distinguish "no users match filters" vs "no users yet"

## Step 4: Add loading skeleton

**New file:** `src/app/admin/users/loading.tsx`

Skeleton placeholders for header, search bar, filter bar, and table rows.

## Key Files

| File | Action |
|------|--------|
| `src/lib/actions/users.ts` | Modify — add `searchUsers()` |
| `src/lib/actions/users.test.ts` | Modify — add search tests |
| `src/components/admin/UserFilterBar.tsx` | New — role/org/sort dropdowns + clear |
| `src/components/admin/UserFilterBar.test.tsx` | New — unit tests |
| `src/app/admin/users/page.tsx` | Modify — add searchParams, search, filters, pagination |
| `src/app/admin/users/loading.tsx` | New — skeleton |

## Reusable (no new code needed)

- `SearchBar`, `Pagination`, `NativeSelect`, `Label`, `Button`
- `AdminPageHeader`, `EmptyState`
- `UserList` — receives pre-filtered array (no changes needed to internals)

## Verification

1. `npm run test:run` — all tests pass
2. Manual: `/admin/users` — search by name/email, filter by role/org, sort, pagination, clear button, URL params preserved
3. `npm run test:e2e` — existing E2E tests pass
