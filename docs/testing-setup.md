# Testing Infrastructure Setup

## Applies to: All Tiers

This document defines the testing stack, configuration, and conventions for NextKAN. Read this BEFORE implementing any tier — testing setup should happen during Tier 1 project initialization, and all subsequent features should include tests.

---

## Testing Stack Decision

Based on current Next.js 15 official documentation and ecosystem best practices (as of 2025):

| Layer | Tool | Purpose |
|-------|------|---------|
| **Unit tests** | Vitest | Pure functions, Zod schemas, transformers, utilities |
| **Component tests** | Vitest + React Testing Library | Client components, synchronous server components |
| **API route tests** | Vitest | Route handlers called directly with mocked NextRequest |
| **Server action tests** | Vitest | Actions called directly with mocked Prisma |
| **Integration tests** | Vitest + test database | Multi-layer flows using a real SQLite test database |
| **E2E tests** | Playwright | Full browser tests for async server components, critical user flows |

### Why Vitest over Jest

- Next.js official docs list Vitest as a first-class testing option alongside Jest
- Faster execution (native ESM, no transform overhead)
- Better TypeScript/ESM compatibility with Next.js 15 App Router
- Compatible API — nearly identical to Jest, so patterns transfer
- `vi.mock()` works the same as `jest.mock()`
- Growing community consensus: developers report fewer configuration issues than Jest with Next.js 15

### Key Limitation

Vitest does **not** support async Server Components (components with `async function` that fetch data). For these, use Playwright E2E tests. Synchronous server components and client components work fine with Vitest + React Testing Library.

---

## Installation

Add to the Tier 1 initialization step (Step 1):

```bash
# Unit & Component testing
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom @testing-library/user-event @testing-library/jest-dom vite-tsconfig-paths

# E2E testing
npm install -D @playwright/test
npx playwright install --with-deps chromium
```

---

## Configuration Files

### vitest.config.mts

Create in project root:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.spec.{ts,tsx}",
        "src/types/**",
        "src/**/*.d.ts",
      ],
    },
  },
});
```

### vitest.setup.ts

Create in project root:

```typescript
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock next/navigation (used by many components)
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

// Mock next/headers (used by server components/actions)
vi.mock("next/headers", () => ({
  cookies: () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  }),
  headers: () => new Headers(),
}));
```

### playwright.config.ts

Create in project root:

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev -- --port 3001",
    url: "http://localhost:3001",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      DATABASE_URL: "file:./prisma/e2e-test.db",
    },
  },
});
```

### e2e/global-setup.ts

Creates and seeds a fresh E2E database before tests run. Uses port 3001 to avoid conflicts with the dev server.

```typescript
import { execSync } from "child_process";

export default function globalSetup() {
  const env = { ...process.env, DATABASE_URL: "file:./prisma/e2e-test.db" };
  execSync("npx prisma db push --force-reset --accept-data-loss", { env });
  execSync("npx prisma db seed", { env });
}
```

### package.json scripts

Add to the `scripts` section:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "vitest run && playwright test"
  }
}
```

---

## Directory Structure for Tests

Tests are **colocated** with source files (Next.js and Vitest both recommend this). E2E tests live in a top-level `e2e/` directory.

```
src/
├── lib/
│   ├── schemas/
│   │   ├── dataset.ts
│   │   ├── dataset.test.ts              ← Unit test for Zod schema
│   │   ├── dcat-us.ts
│   │   └── dcat-us.test.ts              ← Unit test for transformer
│   ├── actions/
│   │   ├── datasets.ts
│   │   └── datasets.test.ts             ← Unit test for server actions
│   └── utils/
│       ├── search.ts
│       └── search.test.ts               ← Unit test for search builder
├── app/
│   ├── api/
│   │   ├── datasets/
│   │   │   ├── route.ts
│   │   │   └── route.test.ts            ← API route unit test
│   │   └── data.json/
│   │       ├── route.ts
│   │       └── route.test.ts            ← Critical compliance test
│   └── (public)/
│       └── datasets/
│           └── [slug]/
│               └── page.tsx             ← Tested via Playwright (async component)
├── components/
│   ├── datasets/
│   │   ├── DatasetCard.tsx
│   │   ├── DatasetCard.test.tsx          ← Component test
│   │   ├── DatasetForm.tsx
│   │   └── DatasetForm.test.tsx          ← Component test with user interaction
│   └── ui/
│       ├── SearchBar.tsx
│       └── SearchBar.test.tsx            ← Component test
├── __mocks__/                            ← Shared manual mocks
│   └── prisma.ts                         ← Prisma client mock
e2e/
├── data-json.spec.ts                     ← E2E: DCAT-US compliance
├── datasets.spec.ts                      ← E2E: admin dataset CRUD flow
├── public-pages.spec.ts                  ← E2E: public listing, detail, org pages
├── search.spec.ts                        ← E2E: search functionality
└── auth.spec.ts                          ← E2E: login/logout flow
```

---

## Prisma Mocking Strategy

### For unit tests: Mock Prisma entirely

Create `src/__mocks__/prisma.ts`:

```typescript
import { PrismaClient } from "@/generated/prisma/client";
import { beforeEach } from "vitest";
import { mockDeep, mockReset, DeepMockProxy } from "vitest-mock-extended";

export const prismaMock = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>;

beforeEach(() => {
  mockReset(prismaMock);
});

export default prismaMock;
```

Install the mock library:
```bash
npm install -D vitest-mock-extended
```

In test files, mock the db module:

```typescript
import { vi, describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "@/__mocks__/prisma";

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}));
```

### For integration tests: Use a real test database

Add to `.gitignore`: `prisma/e2e-test.db` and `prisma/test.db`.

Create `prisma/.env.test`:
```env
DATABASE_URL="file:./test.db"
```

Create `src/lib/test-utils/db.ts`:

```typescript
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { execSync } from "child_process";

let testPrisma: PrismaClient;

export function getTestPrisma(): PrismaClient {
  if (!testPrisma) {
    const url = "file:./prisma/test.db";
    process.env.DATABASE_URL = url;
    const adapter = new PrismaBetterSqlite3({ url });
    testPrisma = new PrismaClient({ adapter });
  }
  return testPrisma;
}

export async function resetTestDatabase() {
  execSync("npx prisma db push --force-reset --accept-data-loss", {
    env: { ...process.env, DATABASE_URL: "file:./prisma/test.db" },
  });
}

export async function cleanupTestDatabase() {
  const prisma = getTestPrisma();
  // Delete in order respecting foreign keys
  await prisma.datasetKeyword.deleteMany();
  await prisma.distribution.deleteMany();
  await prisma.dataset.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();
}
```

---

## Testing Patterns

### Pattern 1: Zod Schema Validation Test

```typescript
// src/lib/schemas/dataset.test.ts
import { describe, it, expect } from "vitest";
import { datasetCreateSchema } from "./dataset";

describe("datasetCreateSchema", () => {
  const validInput = {
    title: "Census Data 2024",
    description: "Annual census data for all counties",
    accessLevel: "public" as const,
    publisherId: "550e8400-e29b-41d4-a716-446655440000",
    keywords: ["census", "population", "demographics"],
    contactName: "Jane Smith",
    contactEmail: "jane@example.gov",
  };

  it("accepts valid input", () => {
    const result = datasetCreateSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = datasetCreateSchema.safeParse({ ...validInput, title: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.title).toBeDefined();
    }
  });

  it("rejects empty keywords array", () => {
    const result = datasetCreateSchema.safeParse({ ...validInput, keywords: [] });
    expect(result.success).toBe(false);
  });

  it("rejects invalid accessLevel", () => {
    const result = datasetCreateSchema.safeParse({ ...validInput, accessLevel: "secret" });
    expect(result.success).toBe(false);
  });

  it("accepts valid bureauCode format", () => {
    const result = datasetCreateSchema.safeParse({ ...validInput, bureauCode: "015:11" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid bureauCode format", () => {
    const result = datasetCreateSchema.safeParse({ ...validInput, bureauCode: "15:1" });
    expect(result.success).toBe(false);
  });

  it("allows optional fields to be omitted", () => {
    const result = datasetCreateSchema.safeParse({
      title: "Minimal Dataset",
      description: "Minimal",
      publisherId: "550e8400-e29b-41d4-a716-446655440000",
      keywords: ["test"],
    });
    expect(result.success).toBe(true);
  });
});
```

### Pattern 2: DCAT-US Transformer Test

```typescript
// src/lib/schemas/dcat-us.test.ts
import { describe, it, expect } from "vitest";
import { transformDatasetToDCATUS, buildCatalog } from "./dcat-us";

const mockDataset = {
  id: "test-id",
  slug: "test-dataset",
  title: "Test Dataset",
  description: "A test dataset",
  modified: new Date("2024-01-15"),
  accessLevel: "public",
  identifier: "test-identifier",
  contactName: "John Doe",
  contactEmail: "john@example.gov",
  bureauCode: "015:11",
  programCode: "015:001",
  license: "https://creativecommons.org/publicdomain/zero/1.0/",
  rights: null,
  spatial: "United States",
  temporal: "2020-01-01/2024-12-31",
  issued: new Date("2020-01-01"),
  accrualPeriodicity: "R/P1Y",
  conformsTo: null,
  dataQuality: true,
  describedBy: null,
  isPartOf: null,
  landingPage: "https://example.gov/datasets/test",
  language: "en",
  primaryITInvestmentUII: null,
  references: null,
  systemOfRecords: null,
  theme: '["Health","Education"]',
  status: "published",
  publisherId: "pub-id",
  createdById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  publisher: {
    id: "pub-id",
    name: "Department of Testing",
    slug: "dept-testing",
    description: null,
    imageUrl: null,
    parentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  distributions: [
    {
      id: "dist-1",
      title: "CSV Download",
      description: "Full dataset as CSV",
      downloadURL: "https://example.gov/data/test.csv",
      accessURL: null,
      mediaType: "text/csv",
      format: "CSV",
      conformsTo: null,
      describedBy: null,
      fileName: null,
      filePath: null,
      fileSize: null,
      datasetId: "test-id",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  keywords: [
    { id: "kw-1", keyword: "health", datasetId: "test-id" },
    { id: "kw-2", keyword: "education", datasetId: "test-id" },
  ],
};

describe("transformDatasetToDCATUS", () => {
  it("includes all required DCAT-US fields", () => {
    const result = transformDatasetToDCATUS(mockDataset as any);
    expect(result["@type"]).toBe("dcat:Dataset");
    expect(result.title).toBe("Test Dataset");
    expect(result.description).toBe("A test dataset");
    expect(result.keyword).toEqual(["health", "education"]);
    expect(result.modified).toBe("2024-01-15");
    expect(result.identifier).toBe("test-identifier");
    expect(result.accessLevel).toBe("public");
  });

  it("formats publisher correctly", () => {
    const result = transformDatasetToDCATUS(mockDataset as any);
    expect(result.publisher).toEqual({
      "@type": "org:Organization",
      name: "Department of Testing",
    });
  });

  it("formats contactPoint as vCard", () => {
    const result = transformDatasetToDCATUS(mockDataset as any);
    expect(result.contactPoint).toEqual({
      "@type": "vcard:Contact",
      fn: "John Doe",
      hasEmail: "mailto:john@example.gov",
    });
  });

  it("includes distributions with correct structure", () => {
    const result = transformDatasetToDCATUS(mockDataset as any);
    expect(result.distribution).toHaveLength(1);
    expect(result.distribution![0]["@type"]).toBe("dcat:Distribution");
    expect(result.distribution![0].downloadURL).toBe("https://example.gov/data/test.csv");
    expect(result.distribution![0].mediaType).toBe("text/csv");
  });

  it("includes federal fields when present", () => {
    const result = transformDatasetToDCATUS(mockDataset as any);
    expect(result.bureauCode).toEqual(["015:11"]);
    expect(result.programCode).toEqual(["015:001"]);
  });

  it("omits null optional fields", () => {
    const result = transformDatasetToDCATUS(mockDataset as any);
    expect(result).not.toHaveProperty("conformsTo");
    expect(result).not.toHaveProperty("describedBy");
    expect(result).not.toHaveProperty("systemOfRecords");
  });

  it("parses JSON theme field", () => {
    const result = transformDatasetToDCATUS(mockDataset as any);
    expect(result.theme).toEqual(["Health", "Education"]);
  });
});

describe("buildCatalog", () => {
  it("produces valid DCAT-US catalog structure", () => {
    const catalog = buildCatalog([mockDataset as any], "https://example.gov");
    expect(catalog["@context"]).toBe("https://project-open-data.cio.gov/v1.1/schema/catalog.jsonld");
    expect(catalog["@type"]).toBe("dcat:Catalog");
    expect(catalog.conformsTo).toBe("https://project-open-data.cio.gov/v1.1/schema");
    expect(catalog.dataset).toHaveLength(1);
  });

  it("sets catalog @id to data.json URL", () => {
    const catalog = buildCatalog([], "https://example.gov");
    expect(catalog["@id"]).toBe("https://example.gov/data.json");
  });

  it("returns empty dataset array for empty catalog", () => {
    const catalog = buildCatalog([], "https://example.gov");
    expect(catalog.dataset).toEqual([]);
  });
});
```

### Pattern 3: API Route Handler Test

```typescript
// src/app/api/data.json/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { prismaMock } from "@/__mocks__/prisma";

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}));

describe("GET /data.json", () => {
  beforeEach(() => {
    vi.stubEnv("SITE_URL", "https://test.example.gov");
  });

  it("returns valid DCAT-US catalog JSON", async () => {
    prismaMock.dataset.findMany.mockResolvedValue([]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.conformsTo).toBe("https://project-open-data.cio.gov/v1.1/schema");
    expect(body["@type"]).toBe("dcat:Catalog");
    expect(Array.isArray(body.dataset)).toBe(true);
  });

  it("sets correct headers", async () => {
    prismaMock.dataset.findMany.mockResolvedValue([]);

    const response = await GET();

    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });

  it("only returns published datasets", async () => {
    prismaMock.dataset.findMany.mockResolvedValue([]);

    await GET();

    expect(prismaMock.dataset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "published" },
      })
    );
  });
});
```

### Pattern 4: Server Action Test (with Prisma mock)

```typescript
// src/lib/actions/datasets.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "@/__mocks__/prisma";

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}));

// Import AFTER mocking
import { createDataset, getDataset, listDatasets } from "./datasets";

describe("createDataset", () => {
  it("creates a dataset with keywords in a transaction", async () => {
    const input = {
      title: "Test Dataset",
      description: "A test dataset description",
      publisherId: "org-123",
      keywords: ["test", "data"],
      accessLevel: "public" as const,
    };

    const expectedDataset = {
      id: "ds-123",
      slug: "test-dataset",
      title: "Test Dataset",
      ...input,
    };

    prismaMock.$transaction.mockImplementation(async (fn: any) => {
      return fn(prismaMock);
    });
    prismaMock.dataset.create.mockResolvedValue(expectedDataset as any);

    const result = await createDataset(input);
    expect(result.title).toBe("Test Dataset");
    expect(prismaMock.dataset.create).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid input", async () => {
    const input = { title: "", description: "", publisherId: "not-a-uuid", keywords: [] };
    await expect(createDataset(input as any)).rejects.toThrow();
  });
});

describe("listDatasets", () => {
  it("returns paginated results", async () => {
    prismaMock.dataset.findMany.mockResolvedValue([]);
    prismaMock.dataset.count.mockResolvedValue(0);

    const result = await listDatasets({ page: 1, limit: 20 });
    expect(result).toHaveProperty("datasets");
    expect(result).toHaveProperty("total");
  });

  it("applies search filter", async () => {
    prismaMock.dataset.findMany.mockResolvedValue([]);
    prismaMock.dataset.count.mockResolvedValue(0);

    await listDatasets({ search: "census" });

    expect(prismaMock.dataset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.any(Array),
        }),
      })
    );
  });
});
```

### Pattern 5: Client Component Test

```typescript
// src/components/datasets/DatasetCard.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DatasetCard } from "./DatasetCard";

const mockDataset = {
  id: "1",
  slug: "test-dataset",
  title: "Census Population Data",
  description: "Annual population estimates for all US counties and states",
  modified: new Date("2024-06-15"),
  publisher: { name: "Census Bureau", slug: "census-bureau" },
  keywords: [
    { id: "1", keyword: "population", datasetId: "1" },
    { id: "2", keyword: "census", datasetId: "1" },
  ],
  distributions: [
    { id: "1", format: "CSV", mediaType: "text/csv" },
    { id: "2", format: "JSON", mediaType: "application/json" },
  ],
};

describe("DatasetCard", () => {
  it("renders dataset title as a link", () => {
    render(<DatasetCard dataset={mockDataset as any} />);
    const link = screen.getByRole("link", { name: /Census Population Data/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/datasets/test-dataset");
  });

  it("displays publisher name", () => {
    render(<DatasetCard dataset={mockDataset as any} />);
    expect(screen.getByText(/Census Bureau/i)).toBeInTheDocument();
  });

  it("renders keyword badges", () => {
    render(<DatasetCard dataset={mockDataset as any} />);
    expect(screen.getByText("population")).toBeInTheDocument();
    expect(screen.getByText("census")).toBeInTheDocument();
  });

  it("renders format badges for distributions", () => {
    render(<DatasetCard dataset={mockDataset as any} />);
    expect(screen.getByText("CSV")).toBeInTheDocument();
    expect(screen.getByText("JSON")).toBeInTheDocument();
  });

  it("truncates long descriptions", () => {
    const longDesc = "A".repeat(300);
    render(<DatasetCard dataset={{ ...mockDataset, description: longDesc } as any} />);
    const text = screen.getByText(/A+/);
    expect(text.textContent!.length).toBeLessThan(300);
  });
});
```

### Pattern 6: Form Component Test with User Interaction

```typescript
// src/components/ui/SearchBar.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchBar } from "./SearchBar";

// Mock useRouter since we already mock next/navigation in setup
const mockPush = vi.fn();
vi.mock("next/navigation", async () => {
  return {
    useRouter: () => ({ push: mockPush }),
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => "/",
  };
});

describe("SearchBar", () => {
  it("renders search input", () => {
    render(<SearchBar />);
    expect(screen.getByRole("searchbox") || screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it("navigates on form submit", async () => {
    const user = userEvent.setup();
    render(<SearchBar />);

    const input = screen.getByRole("searchbox") || screen.getByPlaceholderText(/search/i);
    await user.type(input, "census data");
    await user.keyboard("{Enter}");

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("search=census")
    );
  });
});
```

### Pattern 7: Playwright E2E Test

```typescript
// e2e/data-json.spec.ts
import { test, expect } from "@playwright/test";

test.describe("DCAT-US /data.json endpoint", () => {
  test("returns valid DCAT-US v1.1 catalog", async ({ request }) => {
    const response = await request.get("/data.json");
    expect(response.ok()).toBe(true);

    const catalog = await response.json();
    expect(catalog).toHaveProperty("@context");
    expect(catalog).toHaveProperty("conformsTo", "https://project-open-data.cio.gov/v1.1/schema");
    expect(catalog).toHaveProperty("@type", "dcat:Catalog");
    expect(catalog).toHaveProperty("dataset");
    expect(Array.isArray(catalog.dataset)).toBe(true);
  });

  test("serves with correct content type", async ({ request }) => {
    const response = await request.get("/data.json");
    expect(response.headers()["content-type"]).toContain("application/json");
  });

  test("allows cross-origin access", async ({ request }) => {
    const response = await request.get("/data.json");
    expect(response.headers()["access-control-allow-origin"]).toBe("*");
  });
});

// e2e/public-pages.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Public pages", () => {
  test("homepage loads and shows recent datasets", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("dataset listing page loads", async ({ page }) => {
    await page.goto("/datasets");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("dataset detail page loads", async ({ page }) => {
    await page.goto("/datasets");
    const firstLink = page.getByRole("link").filter({ hasText: /.+/ }).first();
    if (await firstLink.isVisible()) {
      await firstLink.click();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
  });
});

// e2e/auth.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("admin pages redirect to login when unauthenticated", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/login/);
  });

  test("admin can log in", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("admin@example.com");
    await page.getByLabel(/password/i).fill("changeme");
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await expect(page).toHaveURL(/admin/);
  });
});
```

### Pattern 8: Integration Test with Test Database

```typescript
// src/lib/actions/datasets.integration.test.ts
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { getTestPrisma, resetTestDatabase, cleanupTestDatabase } from "@/lib/test-utils/db";

// Do NOT mock Prisma for integration tests
// Instead, override the db module to use the test database
vi.mock("@/lib/db", () => ({
  prisma: getTestPrisma(),
}));

import { createDataset, getDataset, listDatasets, deleteDataset } from "./datasets";

describe("Dataset CRUD integration", () => {
  let testOrgId: string;

  beforeAll(async () => {
    await resetTestDatabase();
    const prisma = getTestPrisma();
    const org = await prisma.organization.create({
      data: { name: "Test Org", slug: "test-org" },
    });
    testOrgId = org.id;
  });

  afterEach(async () => {
    const prisma = getTestPrisma();
    await prisma.datasetKeyword.deleteMany();
    await prisma.distribution.deleteMany();
    await prisma.dataset.deleteMany();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    await getTestPrisma().$disconnect();
  });

  it("creates and retrieves a dataset", async () => {
    const dataset = await createDataset({
      title: "Integration Test Dataset",
      description: "Created during integration test",
      publisherId: testOrgId,
      keywords: ["integration", "test"],
      accessLevel: "public",
    });

    expect(dataset.id).toBeDefined();
    expect(dataset.slug).toBe("integration-test-dataset");

    const retrieved = await getDataset(dataset.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.title).toBe("Integration Test Dataset");
  });

  it("lists datasets with search", async () => {
    await createDataset({
      title: "Searchable Dataset",
      description: "Contains unique keyword",
      publisherId: testOrgId,
      keywords: ["searchable"],
      accessLevel: "public",
    });

    const results = await listDatasets({ search: "Searchable" });
    expect(results.total).toBe(1);
    expect(results.datasets[0].title).toBe("Searchable Dataset");
  });

  it("deletes a dataset and its keywords", async () => {
    const dataset = await createDataset({
      title: "To Be Deleted",
      description: "This will be deleted",
      publisherId: testOrgId,
      keywords: ["delete-me"],
      accessLevel: "public",
    });

    await deleteDataset(dataset.id);
    const retrieved = await getDataset(dataset.id);
    expect(retrieved).toBeNull();
  });
});
```

---

## Test Naming Conventions

- Unit test files: `*.test.ts` or `*.test.tsx` (colocated with source)
- Integration test files: `*.integration.test.ts` (colocated with source)
- E2E test files: `e2e/*.spec.ts`
- Describe blocks: name the module/component being tested
- Test names: start with a verb describing the expected behavior ("renders...", "returns...", "rejects...", "creates...")

---

## CI Integration

Add to `.github/workflows/test.yml` (or equivalent):

```yaml
name: Tests
on: [push, pull_request]
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx prisma generate
      - run: npm run test:run

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx prisma generate
      - run: npx prisma db push
      - run: npx prisma db seed
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
```
