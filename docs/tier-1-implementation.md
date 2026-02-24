# Tier 1 — MVP Implementation Plan

## Project: NextKAN (Next.js Open Data Platform)

You are building a lightweight, open-source open data catalog platform as an alternative to CKAN and DKAN. The platform must be DCAT-US v1.1 compliant and deployable in under 5 minutes.

---

## Tech Stack

- **Framework:** Next.js 15 with App Router
- **Language:** TypeScript (strict mode)
- **Database:** SQLite (default) via Prisma ORM, with PostgreSQL as an optional production target
- **Validation:** Zod
- **Styling:** Tailwind CSS 4
- **Auth:** NextAuth.js v5 (Auth.js)
- **File uploads:** Local filesystem (public/uploads/) with abstraction layer for future S3 support
- **Package manager:** npm

---

## Project Initialization

### Step 1: Scaffold the project

```bash
npx create-next-app@latest nextkan --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd nextkan
npm install prisma @prisma/client zod next-auth@5.0.0-beta.25 slugify uuid bcryptjs
npm install -D @types/uuid @types/bcryptjs prisma

# Testing dependencies (see testing-setup.md for full details)
npm install -D vitest @vitejs/plugin-react jsdom vite-tsconfig-paths vitest-mock-extended
npm install -D @testing-library/react @testing-library/dom @testing-library/user-event @testing-library/jest-dom
npm install -D @playwright/test
npx playwright install --with-deps chromium

npx prisma init --datasource-provider sqlite
```

**IMPORTANT:** Before writing any feature code, set up the testing infrastructure by reading and following `testing-setup.md`. Create `vitest.config.mts`, `vitest.setup.ts`, `playwright.config.ts`, and `src/__mocks__/prisma.ts` as specified in that document. Every feature implemented below must include its corresponding tests from `testing-addenda.md` (Tier 1 section).

### Step 2: Configure TypeScript (tsconfig.json)

Ensure strict mode is enabled and path aliases are set:
```json
{
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Step 3: Environment variables (.env)

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="generate-a-random-secret-here"
NEXTAUTH_URL="http://localhost:3000"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="changeme"
UPLOAD_DIR="./public/uploads"
SITE_NAME="NextKAN"
SITE_URL="http://localhost:3000"
```

---

## Directory Structure

Create this exact directory structure:

```
src/
├── app/
│   ├── (public)/                    # Public-facing pages (no auth required)
│   │   ├── page.tsx                 # Homepage (hero + recent datasets + search)
│   │   ├── login/
│   │   │   └── page.tsx             # Login page (email/password form)
│   │   ├── datasets/
│   │   │   ├── page.tsx             # Dataset search/listing page
│   │   │   └── [slug]/
│   │   │       └── page.tsx         # Dataset detail page
│   │   └── organizations/
│   │       ├── page.tsx             # Organization listing
│   │       └── [slug]/
│   │           └── page.tsx         # Organization detail + its datasets
│   ├── admin/                       # Admin dashboard (auth required)
│   │   ├── layout.tsx               # Admin layout with sidebar nav
│   │   ├── page.tsx                 # Admin dashboard home
│   │   ├── datasets/
│   │   │   ├── page.tsx             # Dataset management list
│   │   │   ├── new/
│   │   │   │   └── page.tsx         # Create dataset form
│   │   │   └── [id]/
│   │   │       └── edit/
│   │   │           └── page.tsx     # Edit dataset form
│   │   └── organizations/
│   │       ├── page.tsx             # Organization management list
│   │       ├── new/
│   │       │   └── page.tsx         # Create organization form
│   │       └── [id]/
│   │           └── edit/
│   │               └── page.tsx     # Edit organization form
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts         # NextAuth.js route handler
│   │   ├── datasets/
│   │   │   ├── route.ts             # GET (list), POST (create)
│   │   │   └── [id]/
│   │   │       └── route.ts         # GET (single), PUT (update), DELETE
│   │   ├── organizations/
│   │   │   ├── route.ts             # GET (list), POST (create)
│   │   │   └── [id]/
│   │   │       └── route.ts         # GET (single), PUT (update), DELETE
│   │   ├── upload/
│   │   │   └── route.ts             # POST file upload
│   │   └── data.json/
│   │       └── route.ts             # GET — DCAT-US compliant catalog
│   ├── layout.tsx                   # Root layout
│   └── globals.css                  # Tailwind imports
├── lib/
│   ├── db.ts                        # Prisma client singleton
│   ├── auth.ts                      # NextAuth.js configuration
│   ├── schemas/
│   │   ├── dataset.ts               # Zod schema for dataset metadata
│   │   ├── distribution.ts          # Zod schema for distributions
│   │   ├── organization.ts          # Zod schema for organizations
│   │   └── dcat-us.ts               # DCAT-US v1.1 output schema + transformer
│   ├── actions/
│   │   ├── datasets.ts              # Server actions for dataset CRUD
│   │   ├── organizations.ts         # Server actions for organization CRUD
│   │   └── upload.ts                # Server action for file uploads
│   └── utils/
│       ├── api.ts                   # API error handling utilities
│       ├── slug.ts                  # Slug generation utility
│       ├── upload.ts                # File upload/storage helpers
│       └── search.ts                # Search query builder
├── components/
│   ├── ui/                          # Reusable UI primitives
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Textarea.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Pagination.tsx
│   │   └── SearchBar.tsx
│   ├── datasets/
│   │   ├── DatasetForm.tsx          # Create/edit form component
│   │   ├── DatasetCard.tsx          # Card for listing view
│   │   ├── DatasetDetail.tsx        # Full detail view component
│   │   ├── DistributionForm.tsx     # Sub-form for adding distributions
│   │   └── DistributionList.tsx     # Display distributions on detail page
│   ├── organizations/
│   │   ├── OrganizationForm.tsx     # Create/edit form
│   │   └── OrganizationCard.tsx     # Card for listing view
│   ├── layout/
│   │   ├── Header.tsx               # Public site header
│   │   ├── Footer.tsx               # Public site footer
│   │   ├── AdminSidebar.tsx         # Admin navigation sidebar
│   │   └── AdminHeader.tsx          # Admin top bar with user menu
│   └── search/
│       └── SearchResults.tsx        # Search results display
└── types/
    └── index.ts                     # Shared TypeScript types
```

---

## Feature 1: DCAT-US v1.1 Compliant Metadata Schema

### Task 1.1: Prisma Schema

Create the database schema in `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String?
  role      String   @default("admin") // "admin" | "editor" | "viewer"
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  datasets  Dataset[]
}

model Organization {
  id          String   @id @default(uuid())
  name        String
  slug        String   @unique
  description String?
  imageUrl    String?

  // DCAT-US: subOrganizationOf
  parentId    String?
  parent      Organization?  @relation("OrgHierarchy", fields: [parentId], references: [id])
  children    Organization[] @relation("OrgHierarchy")

  datasets    Dataset[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Dataset {
  id          String   @id @default(uuid())
  slug        String   @unique

  // DCAT-US Required fields
  title       String
  description String
  modified    DateTime @default(now())
  accessLevel String   @default("public") // "public" | "restricted public" | "non-public"
  identifier  String   @unique @default(uuid())

  // DCAT-US Required — Publisher (relation)
  publisherId String
  publisher   Organization @relation(fields: [publisherId], references: [id])

  // DCAT-US Required — Contact Point
  contactName  String?
  contactEmail String?

  // DCAT-US Required (Federal only — optional for non-federal)
  bureauCode   String?   // format: "015:11"
  programCode  String?   // format: "015:001"

  // DCAT-US Required-if-Applicable
  license      String?   // URL to license
  rights       String?   // access restriction explanation
  spatial      String?   // geographic coverage
  temporal     String?   // "start-date/end-date" ISO 8601

  // DCAT-US Expanded fields
  issued              DateTime?    // original release date
  accrualPeriodicity  String?      // ISO 8601 duration (e.g., "R/P1Y")
  conformsTo          String?      // URI of data standard
  dataQuality         Boolean?
  describedBy         String?      // URL to data dictionary
  isPartOf            String?      // parent dataset identifier
  landingPage         String?      // URL
  language            String?      // e.g., "en"
  primaryITInvestmentUII String?
  references          String?      // JSON array of URLs (stored as string)
  systemOfRecords     String?      // URL
  theme               String?      // JSON array of themes (stored as string)

  // Internal fields
  status      String   @default("published") // "draft" | "published" | "archived"
  createdById String?
  createdBy   User?    @relation(fields: [createdById], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  distributions Distribution[]
  keywords      DatasetKeyword[]

  @@index([status])
  @@index([publisherId])
}

model Distribution {
  id          String  @id @default(uuid())

  // DCAT-US Distribution fields
  title       String?
  description String?
  downloadURL String?  // direct download link
  accessURL   String?  // landing page or API endpoint
  mediaType   String?  // MIME type (e.g., "text/csv")
  format      String?  // human-readable format (e.g., "CSV")
  conformsTo  String?  // URI of data standard
  describedBy String?  // URL to schema

  // Internal fields
  fileName    String?  // original uploaded filename
  filePath    String?  // server-side path to uploaded file
  fileSize    Int?     // bytes

  datasetId   String
  dataset     Dataset  @relation(fields: [datasetId], references: [id], onDelete: Cascade)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([datasetId])
}

model DatasetKeyword {
  id        String  @id @default(uuid())
  keyword   String
  datasetId String
  dataset   Dataset @relation(fields: [datasetId], references: [id], onDelete: Cascade)

  @@unique([datasetId, keyword])
  @@index([keyword])
}
```

After creating the schema, run:
```bash
npx prisma db push
npx prisma generate
```

### Task 1.2: Prisma Client Singleton

Create `src/lib/db.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

### Task 1.3: Zod Validation Schemas

Create `src/lib/schemas/dataset.ts`:

```typescript
import { z } from "zod";

export const datasetCreateSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().min(1, "Description is required"),
  identifier: z.string().max(255).optional(), // Custom identifier (e.g., "HHS-2024-0042"); auto-generated UUID if omitted
  accessLevel: z.enum(["public", "restricted public", "non-public"]).default("public"),
  publisherId: z.string().uuid("Publisher is required"),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  keywords: z.array(z.string().min(1)).min(1, "At least one keyword is required"),

  // Federal-only (optional for non-federal publishers)
  bureauCode: z.string().regex(/^\d{3}:\d{2}$/).optional().or(z.literal("")),
  programCode: z.string().regex(/^\d{3}:\d{3}$/).optional().or(z.literal("")),

  // Required-if-applicable
  license: z.string().url().optional().or(z.literal("")),
  rights: z.string().max(255).optional(),
  spatial: z.string().optional(),
  temporal: z.string().optional(), // validated as "startDate/endDate"

  // Expanded
  issued: z.string().datetime().optional().or(z.literal("")),
  accrualPeriodicity: z.string().optional(),
  conformsTo: z.string().url().optional().or(z.literal("")),
  dataQuality: z.boolean().optional(),
  describedBy: z.string().url().optional().or(z.literal("")),
  isPartOf: z.string().optional(),
  landingPage: z.string().url().optional().or(z.literal("")),
  language: z.string().optional().default("en-us"),
  theme: z.array(z.string()).optional(),
  references: z.array(z.string().url()).optional(),
});

export const datasetUpdateSchema = datasetCreateSchema.partial();

export type DatasetCreateInput = z.infer<typeof datasetCreateSchema>;
export type DatasetUpdateInput = z.infer<typeof datasetUpdateSchema>;
```

Create `src/lib/schemas/distribution.ts`:

```typescript
import { z } from "zod";

export const distributionSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  downloadURL: z.string().url().optional().or(z.literal("")),
  accessURL: z.string().url().optional().or(z.literal("")),
  mediaType: z.string().optional(), // MIME type
  format: z.string().optional(),    // human-readable format name
  conformsTo: z.string().url().optional().or(z.literal("")),
  describedBy: z.string().url().optional().or(z.literal("")),
}).refine(
  (data) => data.downloadURL || data.accessURL,
  { message: "Either downloadURL or accessURL is required" }
);

export type DistributionInput = z.infer<typeof distributionSchema>;
```

Create `src/lib/schemas/organization.ts`:

```typescript
import { z } from "zod";

export const organizationSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  parentId: z.string().uuid().optional().or(z.literal("")),
});

export type OrganizationInput = z.infer<typeof organizationSchema>;
```

---

## Feature 2: Dynamic `/data.json` Endpoint

### Task 2.1: DCAT-US Transformer

Create `src/lib/schemas/dcat-us.ts`:

This module transforms database records into the DCAT-US v1.1 JSON format.

```typescript
// This file transforms internal database models into the DCAT-US v1.1 JSON output format.
// Reference: https://resources.data.gov/resources/dcat-us/

import { Dataset, Distribution, Organization, DatasetKeyword } from "@prisma/client";

type OrganizationWithParent = Organization & {
  parent: Organization | null;
};

type DatasetWithRelations = Dataset & {
  publisher: OrganizationWithParent;
  distributions: Distribution[];
  keywords: DatasetKeyword[];
};

interface DCATUSCatalog {
  "@context": string;
  "@id": string;
  "@type": string;
  conformsTo: string;
  describedBy: string;
  dataset: DCATUSDataset[];
}

interface DCATUSDataset {
  "@type": string;
  title: string;
  description: string;
  keyword: string[];
  modified: string;
  publisher: {
    "@type": string;
    name: string;
    subOrganizationOf?: {
      "@type": string;
      name: string;
    };
  };
  contactPoint: {
    "@type": string;
    fn: string;
    hasEmail: string;
  };
  identifier: string;
  accessLevel: string;
  bureauCode?: string[];
  programCode?: string[];
  license?: string;
  rights?: string;
  spatial?: string;
  temporal?: string;
  distribution?: DCATUSDistribution[];
  accrualPeriodicity?: string;
  conformsTo?: string;
  dataQuality?: boolean;
  describedBy?: string;
  isPartOf?: string;
  issued?: string;
  language?: string[];
  landingPage?: string;
  references?: string[];
  systemOfRecords?: string;
  theme?: string[];
}

interface DCATUSDistribution {
  "@type": string;
  title?: string;
  description?: string;
  downloadURL?: string;
  accessURL?: string;
  mediaType?: string;
  format?: string;
  conformsTo?: string;
  describedBy?: string;
}

export function transformDatasetToDCATUS(dataset: DatasetWithRelations): DCATUSDataset {
  const result: DCATUSDataset = {
    "@type": "dcat:Dataset",
    title: dataset.title,
    description: dataset.description,
    keyword: dataset.keywords.map((k) => k.keyword),
    modified: dataset.modified.toISOString().split("T")[0],
    publisher: {
      "@type": "org:Organization",
      name: dataset.publisher.name,
      ...(dataset.publisher.parent && {
        subOrganizationOf: {
          "@type": "org:Organization",
          name: dataset.publisher.parent.name,
        },
      }),
    },
    contactPoint: {
      "@type": "vcard:Contact",
      fn: dataset.contactName || "",
      hasEmail: dataset.contactEmail ? `mailto:${dataset.contactEmail}` : "",
    },
    identifier: dataset.identifier,
    accessLevel: dataset.accessLevel,
  };

  // Required federal-only fields (include only if present)
  if (dataset.bureauCode) result.bureauCode = [dataset.bureauCode];
  if (dataset.programCode) result.programCode = [dataset.programCode];

  // Required-if-applicable fields
  if (dataset.license) result.license = dataset.license;
  if (dataset.rights) result.rights = dataset.rights;
  if (dataset.spatial) result.spatial = dataset.spatial;
  if (dataset.temporal) result.temporal = dataset.temporal;

  // Distributions
  if (dataset.distributions.length > 0) {
    result.distribution = dataset.distributions.map(transformDistribution);
  }

  // Expanded fields (include only if present)
  if (dataset.accrualPeriodicity) result.accrualPeriodicity = dataset.accrualPeriodicity;
  if (dataset.conformsTo) result.conformsTo = dataset.conformsTo;
  if (dataset.dataQuality !== null) result.dataQuality = dataset.dataQuality;
  if (dataset.describedBy) result.describedBy = dataset.describedBy;
  if (dataset.isPartOf) result.isPartOf = dataset.isPartOf;
  if (dataset.issued) result.issued = dataset.issued.toISOString().split("T")[0];
  if (dataset.language) result.language = [dataset.language];
  if (dataset.landingPage) result.landingPage = dataset.landingPage;
  if (dataset.systemOfRecords) result.systemOfRecords = dataset.systemOfRecords;

  // JSON-stored array fields
  if (dataset.references) {
    try { result.references = JSON.parse(dataset.references); } catch {}
  }
  if (dataset.theme) {
    try { result.theme = JSON.parse(dataset.theme); } catch {}
  }

  return result;
}

function transformDistribution(dist: Distribution): DCATUSDistribution {
  const result: DCATUSDistribution = { "@type": "dcat:Distribution" };
  if (dist.title) result.title = dist.title;
  if (dist.description) result.description = dist.description;
  if (dist.downloadURL) result.downloadURL = dist.downloadURL;
  if (dist.accessURL) result.accessURL = dist.accessURL;
  if (dist.mediaType) result.mediaType = dist.mediaType;
  if (dist.format) result.format = dist.format;
  if (dist.conformsTo) result.conformsTo = dist.conformsTo;
  if (dist.describedBy) result.describedBy = dist.describedBy;
  return result;
}

export function buildCatalog(
  datasets: DatasetWithRelations[],
  siteUrl: string
): DCATUSCatalog {
  return {
    "@context": "https://project-open-data.cio.gov/v1.1/schema/catalog.jsonld",
    "@id": `${siteUrl}/data.json`,
    "@type": "dcat:Catalog",
    conformsTo: "https://project-open-data.cio.gov/v1.1/schema",
    describedBy: "https://project-open-data.cio.gov/v1.1/schema/catalog.json",
    dataset: datasets.map(transformDatasetToDCATUS),
  };
}
```

### Task 2.2: API Route

Create `src/app/api/data.json/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildCatalog } from "@/lib/schemas/dcat-us";

export const dynamic = "force-dynamic"; // Never cache — must always reflect current state

export async function GET() {
  const datasets = await prisma.dataset.findMany({
    where: { status: "published" },
    include: {
      publisher: { include: { parent: true } },
      distributions: true,
      keywords: true,
    },
  });

  const siteUrl = process.env.SITE_URL || "http://localhost:3000";
  const catalog = buildCatalog(datasets, siteUrl);

  return NextResponse.json(catalog, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, must-revalidate",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
```

---

## Feature 3 & 4: Dataset CRUD + Distribution Management

### Task 3.1: Server Actions for Datasets

Create `src/lib/actions/datasets.ts`:

Implement these server actions using Prisma. Each action must:
- Validate input with the Zod schemas from `src/lib/schemas/dataset.ts`
- Use `prisma` from `src/lib/db.ts`
- Handle keyword creation/deletion as a separate step (delete all existing, re-create from input array)
- Generate a slug from the title using the `slugify` package
- Set `modified` to `new Date()` on every update
- Return the full dataset with relations included (`publisher`, `distributions`, `keywords`)

Functions to implement:
- `createDataset(input: DatasetCreateInput): Promise<Dataset>` — Validate, create dataset + keywords in a transaction
- `updateDataset(id: string, input: DatasetUpdateInput): Promise<Dataset>` — Validate, update dataset + sync keywords in a transaction
- `deleteDataset(id: string): Promise<void>` — Delete dataset (cascades to distributions and keywords via Prisma)
- `getDataset(id: string): Promise<Dataset | null>` — Get by ID with all relations
- `getDatasetBySlug(slug: string): Promise<Dataset | null>` — Get by slug with all relations
- `listDatasets(params: { page?: number; limit?: number; search?: string; organizationId?: string; status?: string }): Promise<{ datasets: Dataset[]; total: number }>` — Paginated list with optional filters

### Task 3.2: Server Actions for Distributions

Create distribution management functions within `src/lib/actions/datasets.ts` (or a separate `distributions.ts`):

- `addDistribution(datasetId: string, input: DistributionInput): Promise<Distribution>`
- `updateDistribution(id: string, input: Partial<DistributionInput>): Promise<Distribution>`
- `removeDistribution(id: string): Promise<void>`

When a distribution is created from a file upload, the `downloadURL` should be set to the public URL path of the uploaded file (e.g., `/uploads/{filename}`), and `filePath`, `fileName`, `fileSize` should be populated.

### Task 3.3: Admin Dataset Form Page

Create the admin dataset form at `src/app/admin/datasets/new/page.tsx` and reuse for edit at `src/app/admin/datasets/[id]/edit/page.tsx`.

The `DatasetForm` component (`src/components/datasets/DatasetForm.tsx`) should:
- Accept optional `initialData` prop for edit mode
- Group fields into logical sections with collapsible panels:
  1. **Basic Info** (always visible): title, description, identifier (optional — auto-generated if blank), keywords (tag input), accessLevel
  2. **Publisher & Contact**: publisherId (select dropdown), contactName, contactEmail
  3. **Federal Fields** (collapsed by default): bureauCode, programCode
  4. **Access & License**: license (select from predefined list), rights, landingPage
  5. **Coverage**: spatial (text input), temporal (date range picker)
  6. **Additional Metadata** (collapsed by default): all expanded fields
  7. **Distributions** (inline sub-form): list of distributions with add/remove
- Use controlled form state with React `useState` or `useReducer`
- Call the server action on submit
- Show validation errors inline next to each field
- Redirect to the dataset list on success

### Task 3.4: Admin Dataset List Page

Create `src/app/admin/datasets/page.tsx`:
- Table view with columns: Title, Organization, Status, Modified date, Actions (Edit, Delete)
- Search bar at top
- Pagination controls
- "New Dataset" button linking to `/admin/datasets/new`

---

## Feature 5: File Upload & Storage

### Task 5.1: Upload Utility

Create `src/lib/utils/upload.ts`:

```typescript
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./public/uploads";

// Allowed MIME types for data files
const ALLOWED_TYPES = [
  "text/csv",
  "application/json",
  "application/xml",
  "text/xml",
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/geo+json",
  "text/plain",
  "application/zip",
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export interface UploadResult {
  fileName: string;
  filePath: string;
  publicUrl: string;
  fileSize: number;
  mediaType: string;
}

export async function saveUploadedFile(file: File): Promise<UploadResult> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`File type ${file.type} is not allowed`);
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
  }

  const ext = path.extname(file.name);
  const uniqueName = `${randomUUID()}${ext}`;
  const uploadPath = path.resolve(UPLOAD_DIR);

  await mkdir(uploadPath, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const fullPath = path.join(uploadPath, uniqueName);
  await writeFile(fullPath, buffer);

  return {
    fileName: file.name,
    filePath: fullPath,
    publicUrl: `/uploads/${uniqueName}`,
    fileSize: file.size,
    mediaType: file.type,
  };
}
```

### Task 5.2: Upload API Route

Create `src/app/api/upload/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { saveUploadedFile } from "@/lib/utils/upload";
// Import auth check — only authenticated users can upload

export async function POST(request: NextRequest) {
  // TODO: Check authentication

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  try {
    const result = await saveUploadedFile(file);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
```

---

## Feature 6: Public Dataset Listing & Detail Pages

### Task 6.1: Homepage

Create `src/app/(public)/page.tsx`:

This is a **Server Component** page that serves as a landing page:
- Site name and brief description
- Search bar prominently placed
- Recent datasets (6-8 most recently modified, `take: 8, orderBy: { modified: 'desc' }`)
- "Browse all datasets" link to `/datasets`
- Total dataset count

### Task 6.1b: Dataset Listing Page

Create `src/app/(public)/datasets/page.tsx`:

This is a **Server Component** page that:
- Fetches published datasets from the database using Prisma (paginated, 20 per page)
- Accepts `?search=` and `?page=` query params
- Renders a search bar at the top
- Renders a grid of `DatasetCard` components
- Renders `Pagination` at the bottom
- Shows total dataset count

### Task 6.2: Dataset Detail Page

Create `src/app/(public)/datasets/[slug]/page.tsx`:

This is a **Server Component** page that:
- Fetches the dataset by slug with all relations (publisher, distributions, keywords)
- Returns `notFound()` if the dataset doesn't exist or isn't published
- Renders the full DCAT-US metadata in a readable format
- Lists all distributions with download links
- Generates proper metadata for SEO:

```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const dataset = await getDatasetBySlug(params.slug);
  if (!dataset) return {};
  return {
    title: dataset.title,
    description: dataset.description,
    openGraph: {
      title: dataset.title,
      description: dataset.description,
      type: "website",
    },
  };
}
```

### Task 6.3: DatasetCard Component

Create `src/components/datasets/DatasetCard.tsx`:

Displays:
- Dataset title (linked to detail page)
- Truncated description (first 150 chars)
- Publisher name
- Keywords as badges
- Format badges for each distribution
- Last modified date

---

## Feature 7: Basic Search

### Task 7.1: Search Query Builder

Create `src/lib/utils/search.ts`:

For SQLite, use the `LIKE` operator across title, description, and keywords:

```typescript
import { Prisma } from "@prisma/client";

export function buildSearchWhere(query: string): Prisma.DatasetWhereInput {
  if (!query.trim()) return {};

  const terms = query.trim().split(/\s+/);
  return {
    AND: terms.map((term) => ({
      OR: [
        { title: { contains: term, mode: "insensitive" as const } },
        { description: { contains: term, mode: "insensitive" as const } },
        { keywords: { some: { keyword: { contains: term, mode: "insensitive" as const } } } },
      ],
    })),
  };
}
```

Note: `mode: "insensitive"` is required for case-insensitive search on both SQLite (Prisma 4.8+) and PostgreSQL.

### Task 7.2: SearchBar Component

Create `src/components/ui/SearchBar.tsx`:

- Text input with search icon
- On submit, navigates to `/?search={query}` (or `/datasets?search={query}`)
- Uses `useRouter` and `useSearchParams` from `next/navigation`
- Debounced input (300ms) for optional live-search behavior

---

## Feature 8: Publisher/Organization Support

### Task 8.1: Organization Server Actions

Create `src/lib/actions/organizations.ts`:

Functions to implement:
- `createOrganization(input: OrganizationInput): Promise<Organization>`
- `updateOrganization(id: string, input: Partial<OrganizationInput>): Promise<Organization>`
- `deleteOrganization(id: string): Promise<void>` — Fail if org has datasets
- `getOrganization(id: string): Promise<Organization | null>`
- `getOrganizationBySlug(slug: string): Promise<Organization | null>` — Include datasets
- `listOrganizations(): Promise<Organization[]>`

### Task 8.2: Admin Organization Pages

Follow the same pattern as datasets:
- List page at `/admin/organizations`
- Create form at `/admin/organizations/new`
- Edit form at `/admin/organizations/[id]/edit`

### Task 8.3: Public Organization Pages

- List at `/organizations` showing all orgs with dataset counts
- Detail at `/organizations/[slug]` showing org info + paginated list of its datasets

---

## Feature 9: Authentication & Authorization

### Task 9.1: NextAuth.js Configuration

Create `src/lib/auth.ts`:

```typescript
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
```

### Task 9.2: Login Page

Create `src/app/(public)/login/page.tsx`:

A client component page that:
- Renders email and password inputs with a "Sign In" button
- Calls `signIn("credentials", { email, password, redirect: false })` on submit
- Shows error message on invalid credentials
- Redirects to `/admin` on success via `useRouter().push("/admin")`
- Redirects authenticated users away (if already logged in)

### Task 9.3: Auth Route Handler

Create `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

### Task 9.4: Admin Layout Protection

Create `src/app/admin/layout.tsx`:

```typescript
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return (
    <div className="flex min-h-screen">
      {/* <AdminSidebar /> */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
```

### Task 9.5: Database Seed Script

Create `prisma/seed.ts`:

```typescript
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash(
    process.env.ADMIN_PASSWORD || "changeme",
    12
  );

  await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || "admin@example.com" },
    update: {},
    create: {
      email: process.env.ADMIN_EMAIL || "admin@example.com",
      password: hashedPassword,
      name: "Admin",
      role: "admin",
    },
  });

  console.log("Seed complete: admin user created");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Add to `package.json`:
```json
{
  "prisma": {
    "seed": "npx tsx prisma/seed.ts"
  },
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:all": "vitest run && playwright test"
  }
}
```

Then run: `npm install -D tsx && npx prisma db seed`

---

## Feature 10: REST API

### Task 10.1: Dataset API Routes

Create `src/app/api/datasets/route.ts`:

```
GET  /api/datasets              — List datasets (paginated, searchable)
     Query params: page, limit, search, organizationId, status
     Response: { datasets: Dataset[], total: number, page: number, limit: number }

POST /api/datasets              — Create a dataset (auth required)
     Body: DatasetCreateInput (with distributions array)
     Response: Dataset (201)
```

Create `src/app/api/datasets/[id]/route.ts`:

```
GET    /api/datasets/:id        — Get single dataset by ID
       Response: Dataset with relations

PUT    /api/datasets/:id        — Update dataset (auth required)
       Body: DatasetUpdateInput
       Response: Dataset

DELETE /api/datasets/:id        — Delete dataset (auth required)
       Response: 204
```

### Task 10.2: Organization API Routes

Create `src/app/api/organizations/route.ts` and `src/app/api/organizations/[id]/route.ts`:

Follow the same pattern as datasets. Organizations are simpler (no distributions, no keywords).

### Task 10.3: API Error Handling

Create a shared error handler utility at `src/lib/utils/api.ts`:

```typescript
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Validation failed", details: error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  if (error instanceof Error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function notFound(resource: string) {
  return NextResponse.json({ error: `${resource} not found` }, { status: 404 });
}
```

### Task 10.4: API Auth Middleware

In each protected API route, check authentication:

```typescript
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  // ... handle request
}
```

---

## Tier 1 Completion Checklist

After implementing all features, verify:

- [ ] `npx prisma db push` creates all tables without errors
- [ ] `npx prisma db seed` creates admin user
- [ ] Login page exists at `/login` with email/password form
- [ ] Admin can log in at `/login`
- [ ] Admin can create an organization
- [ ] Admin can create a dataset with keywords and distributions
- [ ] Admin can upload a file and attach it as a distribution
- [ ] Admin can edit and delete datasets
- [ ] Public homepage lists all published datasets
- [ ] Public dataset detail page shows full metadata
- [ ] Public organization pages work
- [ ] Search returns relevant results
- [ ] `GET /data.json` returns valid DCAT-US v1.1 JSON
- [ ] All API endpoints return proper JSON responses
- [ ] Unauthenticated users cannot access admin pages or mutating API endpoints

### Testing Checklist
- [ ] `vitest.config.mts`, `vitest.setup.ts`, `playwright.config.ts` created and working
- [ ] `src/__mocks__/prisma.ts` Prisma mock created with vitest-mock-extended
- [ ] `npm run test` runs all unit/component tests — all pass
- [ ] `npm run test:e2e` runs Playwright tests — all pass
- [ ] All Zod schemas have validation tests (dataset, distribution, organization)
- [ ] DCAT-US transformer has full coverage (dcat-us.test.ts)
- [ ] `/data.json` route handler tested for structure, headers, and published-only filter
- [ ] Dataset CRUD server actions tested (create, update, delete, list, search)
- [ ] Dataset integration tests pass against real test database
- [ ] DatasetCard, DatasetForm, SearchBar have component tests
- [ ] Upload utility tested for allowed types, size limits, path generation
- [ ] API route handlers tested for success, validation errors, and auth
- [ ] E2E: data.json compliance, dataset browsing, search, admin login/CRUD
- [ ] `npm run test:coverage` shows 80%+ coverage on `src/lib/`
