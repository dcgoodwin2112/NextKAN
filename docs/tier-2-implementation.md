# Tier 2 — Core Experience Implementation Plan

> **Status: COMPLETE** — All features implemented and tested. 226 unit/component/integration tests passing, 24 E2E tests passing.
>
> **Adjustments from original spec:**
> - Feature 14 (Datastore) — initially deferred, then completed as standalone effort (see `docs/backlog-completed.md`)
> - Feature 15 (Contact Point model) — skipped; existing `contactName`/`contactEmail` fields + DCAT-US transformer already output proper `vcard:Contact` with `mailto:` prefix
> - Full WCAG audit — deferred to Tier 3 (basic semantic HTML + focus indicators done)
> - CSS theming adapted for Tailwind 4 (`@theme inline` block, not `:root` vars)
> - User role default changed from `"admin"` to `"editor"`

## Prerequisites

Tier 1 must be fully implemented. You should have a working Next.js 15 app with:
- Prisma + SQLite database with Dataset, Distribution, Organization, DatasetKeyword, User models
- DCAT-US v1.1 compliant `/data.json` endpoint
- Admin CRUD for datasets, distributions, organizations
- Public listing and detail pages
- Basic search, auth, REST API

---

## New Dependencies

```bash
npm install @tanstack/react-table papaparse
npm install -D @types/papaparse
```

## Testing Requirements

All features in this tier must include tests as specified in `testing-addenda.md` (Tier 2 section). Key testing notes for Tier 2:

- **Faceted search**: Unit test the query builder with all filter combinations. Component test the FacetSidebar for URL param generation.
- **Data Preview**: Component test the table rendering. The preview API route needs unit tests for row limiting and truncation.
- **Datastore**: This is the most complex feature — requires both unit tests (with mocked Prisma) AND integration tests (import a real CSV into a test database and query it).
- **Roles**: Unit test the `hasPermission` function exhaustively. E2E test critical role restrictions.

---

## Feature 11: Faceted Search & Filtering

### Task 11.1: Schema Changes

No new Prisma models needed. Faceted search aggregates existing fields: organization, keywords, format, theme, accessLevel.

### Task 11.2: Facet Aggregation Query

Create `src/lib/actions/facets.ts`:

Implement a function that returns facet counts for the current search context:

```typescript
interface FacetCounts {
  organizations: { id: string; name: string; count: number }[];
  keywords: { keyword: string; count: number }[];
  formats: { format: string; count: number }[];
  themes: { theme: string; count: number }[];
  accessLevels: { level: string; count: number }[];
}

export async function getFacetCounts(searchQuery?: string): Promise<FacetCounts>
```

Implementation approach for SQLite:
- Query organizations with `_count` on datasets relation
- Query DatasetKeyword grouped by keyword with count
- Query Distribution grouped by format with count (use `DISTINCT datasetId` to avoid double-counting)
- For themes: since themes are stored as JSON strings in the dataset `theme` field, you will need to fetch all datasets and extract/count themes in JS. In future (PostgreSQL), this can use JSON functions.

### Task 11.3: Enhanced Search Parameters

Update `src/lib/utils/search.ts` to accept filter parameters:

```typescript
interface SearchParams {
  query?: string;
  organizationId?: string;
  keyword?: string;
  format?: string;
  theme?: string;
  accessLevel?: string;
  page?: number;
  limit?: number;
}

export function buildSearchWhere(params: SearchParams): Prisma.DatasetWhereInput
```

The `format` filter requires joining through distributions:
```typescript
if (params.format) {
  where.distributions = { some: { format: params.format } };
}
```

The `keyword` filter:
```typescript
if (params.keyword) {
  where.keywords = { some: { keyword: params.keyword } };
}
```

### Task 11.4: Faceted Search UI

Create `src/components/search/FacetSidebar.tsx`:

- Renders on the left side of the dataset listing page
- Shows collapsible sections for each facet type
- Each facet value is a clickable link/checkbox that adds/removes URL search params
- Shows count next to each value (e.g., "Transportation (12)")
- Active filters shown as removable chips/badges above the results
- Uses `useSearchParams` and `useRouter` for URL-based state management

Update `src/app/(public)/datasets/page.tsx`:
- Add the sidebar layout (sidebar + results grid)
- Read all filter params from the URL
- Pass them to the search query builder
- Fetch facet counts and pass to sidebar

URL pattern: `/datasets?search=census&org=abc123&keyword=population&format=CSV&page=2`

---

## Feature 12: Dataset Categories/Themes

### Task 12.1: Schema Changes

Add a Theme model to `prisma/schema.prisma`:

```prisma
model Theme {
  id       String  @id @default(uuid())
  name     String  @unique
  slug     String  @unique
  description String?
  color    String? // hex color for badge display

  datasets DatasetTheme[]
}

model DatasetTheme {
  id        String  @id @default(uuid())
  datasetId String
  themeId   String
  dataset   Dataset @relation(fields: [datasetId], references: [id], onDelete: Cascade)
  theme     Theme   @relation(fields: [themeId], references: [id], onDelete: Cascade)

  @@unique([datasetId, themeId])
}
```

Update the `Dataset` model:
- Add `themes DatasetTheme[]` relation
- Remove the `theme` string field (migrate existing JSON data to the new relation)

Run: `npx prisma db push`

### Task 12.2: Seed Default Themes

Add to `prisma/seed.ts` a set of common government data themes:

```typescript
const defaultThemes = [
  { name: "Agriculture", slug: "agriculture" },
  { name: "Business", slug: "business" },
  { name: "Climate", slug: "climate" },
  { name: "Consumer", slug: "consumer" },
  { name: "Ecosystems", slug: "ecosystems" },
  { name: "Education", slug: "education" },
  { name: "Energy", slug: "energy" },
  { name: "Finance", slug: "finance" },
  { name: "Health", slug: "health" },
  { name: "Local Government", slug: "local-government" },
  { name: "Manufacturing", slug: "manufacturing" },
  { name: "Maritime", slug: "maritime" },
  { name: "Ocean", slug: "ocean" },
  { name: "Public Safety", slug: "public-safety" },
  { name: "Science & Research", slug: "science-research" },
  { name: "Transportation", slug: "transportation" },
];
```

### Task 12.3: Update Dataset Form

In the `DatasetForm` component:
- Replace the `theme` text field with a multi-select checkbox list or tag selector
- Fetch available themes from the API
- On save, create/update `DatasetTheme` join records

### Task 12.4: Update DCAT-US Transformer

In `src/lib/schemas/dcat-us.ts`:
- Update `transformDatasetToDCATUS` to read themes from the new relation instead of the JSON string field
- Output as `theme: ["Health", "Education"]` in the data.json

### Task 12.5: Public Theme Browse Page

Create `src/app/(public)/themes/page.tsx`:
- Grid of theme cards with dataset counts
- Each card links to `/datasets?theme={slug}`

---

## Feature 13: Data Preview

### Task 13.1: CSV Preview Component

Create `src/components/datasets/DataPreview.tsx`:

This component accepts a distribution's `downloadURL` and `mediaType`, and renders an appropriate preview:

For CSV files (`text/csv`):
- Fetch the file via the URL
- Parse with PapaParse (client-side)
- Display first 100 rows in a sortable table using `@tanstack/react-table`
- Show column headers
- Show a "Download full dataset" link
- Handle large files: only fetch the first 500KB for preview (use Range header or server-side truncation)

For JSON files (`application/json`):
- Fetch and display with syntax highlighting in a `<pre>` block
- If the JSON is an array of objects, also offer a table view

For PDF files (`application/pdf`):
- Embed with `<iframe>` or `<object>` tag

For other types:
- Show file metadata (name, size, format) and download link only

### Task 13.2: Preview API Route (for large files)

Create `src/app/api/preview/[distributionId]/route.ts`:

```
GET /api/preview/:distributionId?rows=100

- Reads the file from disk (using the distribution's filePath)
- For CSV: returns first N rows as JSON array
- For JSON: returns first 500KB
- Response: { columns: string[], rows: any[][], totalRows: number, truncated: boolean }
```

This avoids sending large files to the client for preview.

### Task 13.3: Integration with Detail Page

Update `src/app/(public)/datasets/[slug]/page.tsx`:
- For each distribution, render a tab or accordion panel
- Include the `DataPreview` component inside it
- Default to showing the first distribution's preview

---

## Feature 14: Datastore (Queryable Tabular Data) — COMPLETE

> **Implemented as standalone effort.** See `docs/backlog-completed.md` for original deferral context.
> See `src/lib/services/datastore.ts` and `src/app/api/datastore/` for implementation.

---

## Feature 15: Contact Point Management — SKIPPED

> **Skipped.** The Tier 1 DCAT-US transformer already outputs proper `vcard:Contact` format with `mailto:` prefix using existing `contactName`/`contactEmail` fields. No `ContactPoint` model needed.

---

## Feature 16: License Management

### Task 16.1: License Registry

Create `src/lib/data/licenses.ts`:

```typescript
export const LICENSES = [
  {
    id: "cc-zero",
    name: "Creative Commons CCZero",
    url: "https://creativecommons.org/publicdomain/zero/1.0/",
  },
  {
    id: "cc-by",
    name: "Creative Commons Attribution",
    url: "https://creativecommons.org/licenses/by/4.0/",
  },
  {
    id: "cc-by-sa",
    name: "Creative Commons Attribution Share-Alike",
    url: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  {
    id: "odc-pddl",
    name: "Open Data Commons Public Domain Dedication and License",
    url: "http://opendefinition.org/licenses/odc-pddl/",
  },
  {
    id: "odc-by",
    name: "Open Data Commons Attribution License",
    url: "http://opendefinition.org/licenses/odc-by/",
  },
  {
    id: "odc-odbl",
    name: "Open Data Commons Open Database License",
    url: "http://opendefinition.org/licenses/odc-odbl/",
  },
  {
    id: "us-pd",
    name: "U.S. Public Domain",
    url: "https://www.usa.gov/government-works",
  },
  {
    id: "other",
    name: "Other (specify URL)",
    url: "",
  },
] as const;
```

### Task 16.2: Update Dataset Form

Replace the free-text license field with a `<select>` dropdown populated from the license registry. If "Other" is selected, show an additional URL input field. Store the URL in the database `license` field.

---

## Feature 17: Responsive Design & Theming

### Task 17.1: CSS Custom Properties for Theming

> **Adapted for Tailwind 4:** Uses `@theme inline` block in `globals.css` instead of `:root` CSS vars. This registers custom colors as Tailwind utilities (e.g., `bg-primary`, `text-accent`).

Theme colors are defined in the existing `@theme inline` block in `src/app/globals.css`:

```css
@theme inline {
  --color-primary: #1a56db;
  --color-primary-hover: #1e40af;
  --color-secondary: #6b7280;
  --color-accent: #059669;
  --color-surface: #f9fafb;
  --color-text-muted: #6b7280;
  --color-border: #e5e7eb;
}
```

### Task 17.2: Site Configuration

Create `src/lib/config.ts`:

```typescript
export const siteConfig = {
  name: process.env.SITE_NAME || "NextKAN",
  description: process.env.SITE_DESCRIPTION || "An open data catalog powered by NextKAN",
  url: process.env.SITE_URL || "http://localhost:3000",
  logo: process.env.SITE_LOGO || "/logo.svg",
  heroTitle: process.env.HERO_TITLE || "Explore Open Data",
  heroDescription: process.env.HERO_DESCRIPTION || "Search and download public datasets",
};
```

### Task 17.3: Responsive Layout

All pages must be responsive. Key breakpoints:
- Mobile: single column, hamburger menu for nav
- Tablet (768px+): two-column layout for dataset listing (sidebar + content)
- Desktop (1024px+): full layout with persistent sidebar

Ensure all components use Tailwind responsive utilities (`sm:`, `md:`, `lg:`).

### Task 17.4: Accessibility

- All interactive elements must be keyboard accessible
- Use semantic HTML (`<main>`, `<nav>`, `<article>`, `<section>`)
- All images have alt text
- Form inputs have associated labels
- Color contrast meets WCAG 2.1 AA (4.5:1 for normal text)
- Focus indicators on all interactive elements

---

## Feature 18: Metadata Validation

### Task 18.1: Client-side Validation

The DatasetForm component should validate in real-time using the Zod schemas:
- Validate on blur for each field
- Validate all fields on form submit
- Show inline error messages below each invalid field
- Highlight invalid fields with a red border
- Show a summary of errors at the top of the form if submission fails

### Task 18.2: DCAT-US Completeness Indicator

Create `src/components/datasets/MetadataCompleteness.tsx`:

A visual indicator showing how complete the dataset's metadata is:
- Calculate percentage of filled fields (required + expanded)
- Show as a progress bar or score (e.g., "Metadata: 75% complete")
- List missing recommended fields as suggestions
- Display on both the admin edit page and the public detail page

### Task 18.3: Server-side Validation

In all API routes and server actions that accept dataset input:
- Always validate with Zod before database operations
- Return structured error responses:
```json
{
  "error": "Validation failed",
  "details": {
    "title": ["Title is required"],
    "contactEmail": ["Invalid email format"]
  }
}
```

---

## Feature 19: SEO & Structured Data

### Task 19.1: JSON-LD Structured Data

Create `src/components/seo/DatasetJsonLd.tsx`:

Renders a `<script type="application/ld+json">` tag with Schema.org Dataset markup:

```typescript
interface DatasetJsonLdProps {
  dataset: DatasetWithRelations;
  siteUrl: string;
}

// Output Schema.org JSON-LD:
{
  "@context": "https://schema.org",
  "@type": "Dataset",
  "name": dataset.title,
  "description": dataset.description,
  "url": `${siteUrl}/datasets/${dataset.slug}`,
  "identifier": dataset.identifier,
  "dateModified": dataset.modified,
  "datePublished": dataset.issued,
  "license": dataset.license,
  "creator": {
    "@type": "Organization",
    "name": dataset.publisher.name
  },
  "keywords": dataset.keywords.map(k => k.keyword),
  "spatialCoverage": dataset.spatial,
  "temporalCoverage": dataset.temporal,
  "distribution": dataset.distributions.map(d => ({
    "@type": "DataDownload",
    "encodingFormat": d.mediaType,
    "contentUrl": d.downloadURL
  }))
}
```

Include this component in the dataset detail page.

### Task 19.2: Metadata & Open Graph

In the root layout and all public pages, ensure:
- `<title>` follows pattern: `{Page Title} | {Site Name}`
- `<meta name="description">` is set
- Open Graph tags (`og:title`, `og:description`, `og:type`, `og:url`, `og:image`)
- Twitter card meta tags
- Canonical URL

### Task 19.3: Sitemap

Create `src/app/sitemap.ts`:

```typescript
import { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const datasets = await prisma.dataset.findMany({
    where: { status: "published" },
    select: { slug: true, updatedAt: true },
  });

  const siteUrl = process.env.SITE_URL || "http://localhost:3000";

  return [
    { url: siteUrl, lastModified: new Date() },
    { url: `${siteUrl}/datasets`, lastModified: new Date() },
    ...datasets.map((d) => ({
      url: `${siteUrl}/datasets/${d.slug}`,
      lastModified: d.updatedAt,
    })),
  ];
}
```

### Task 19.4: Robots.txt

Create `src/app/robots.ts`:

```typescript
import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/admin/" },
    sitemap: `${process.env.SITE_URL}/sitemap.xml`,
  };
}
```

---

## Feature 20: Multi-role Authorization

### Task 20.1: Role Definitions

Define roles in `src/lib/auth/roles.ts`:

```typescript
export const ROLES = {
  admin: {
    label: "Administrator",
    permissions: ["*"], // all permissions
  },
  orgAdmin: {
    label: "Organization Admin",
    permissions: [
      "dataset:create",
      "dataset:edit:own_org",
      "dataset:delete:own_org",
      "dataset:view",
      "distribution:manage",
      "organization:edit:own",
      "user:view",
    ],
  },
  editor: {
    label: "Editor",
    permissions: [
      "dataset:create",
      "dataset:edit:own",
      "dataset:view",
      "distribution:manage",
    ],
  },
  viewer: {
    label: "Viewer",
    permissions: ["dataset:view"],
  },
} as const;

export type Role = keyof typeof ROLES;

export function hasPermission(role: Role, permission: string): boolean {
  const rolePerms = ROLES[role].permissions;
  if (rolePerms.includes("*")) return true;
  return rolePerms.includes(permission);
}
```

### Task 20.2: Update User Model

The User model already has a `role` field. Update the schema to add an optional `organizationId` for org-scoped roles:

```prisma
model User {
  // ... existing fields ...
  role           String   @default("editor")
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id])
}
```

Add to Organization model: `users User[]`

### Task 20.3: Permission Checking Middleware

Create `src/lib/auth/check-permission.ts`:

```typescript
import { auth } from "@/lib/auth";
import { hasPermission, Role } from "@/lib/auth/roles";

export async function requirePermission(permission: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const role = (session.user as any).role as Role;
  if (!hasPermission(role, permission)) {
    throw new Error("Forbidden");
  }

  return session;
}
```

Use this in all server actions and API routes that require specific permissions.

### Task 20.4: Admin User Management Page

Create `src/app/admin/users/page.tsx`:
- List all users with role, email, organization
- Only accessible by admin role
- Allow admin to change user roles and organization assignments
- Allow admin to create new user accounts

---

## Tier 2 Completion Checklist

- [x] Faceted search sidebar works with URL-based filters
- [x] Themes/categories can be managed and assigned to datasets
- [x] CSV data preview renders a sortable table on dataset detail pages
- [x] License dropdown shows predefined options
- [x] Site is responsive at mobile, tablet, desktop breakpoints
- [x] Basic semantic HTML + focus indicators (full WCAG audit deferred to Tier 3)
- [x] Real-time form validation with clear error messages
- [x] JSON-LD structured data renders on dataset pages
- [x] Sitemap and robots.txt generate correctly
- [x] Multi-role auth restricts actions appropriately
- [x] Admin can manage users and assign roles
- [x] Theme browse page at `/themes` with dataset counts
- [x] Datastore imports CSVs and exposes query API

### Testing Checklist
- [x] Faceted search query builder tested with all filter combinations
- [x] `hasPermission` role function has exhaustive unit tests for all role/permission combos
- [x] MetadataCompleteness component tested for scoring accuracy
- [x] JSON-LD output tested against Schema.org Dataset spec
- [x] DataPreview component tested for CSV table and download link rendering
- [x] License registry data validated (no duplicates, valid URLs)
- [x] 226 unit/component/integration tests passing
- [x] 24 E2E tests passing
- [x] Datastore import/query API tests
