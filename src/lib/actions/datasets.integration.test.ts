import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from "vitest";
import {
  getTestPrisma,
  resetTestDatabase,
  cleanupTestDatabase,
} from "@/lib/test-utils/db";

const { testDb } = vi.hoisted(() => {
  // Use dynamic import resolved at hoisting time — path aliases work with vi.hoisted
  return { testDb: null as any };
});

vi.mock("@/lib/db", async () => {
  const { getTestPrisma } = await import("@/lib/test-utils/db");
  return { prisma: getTestPrisma() };
});

vi.mock("@/lib/services/email", () => ({
  getEmailService: () => ({ send: vi.fn().mockResolvedValue(undefined) }),
}));

vi.mock("@/lib/email-templates/dataset-created", () => ({
  datasetCreatedEmail: vi.fn().mockReturnValue({
    subject: "test",
    html: "<p>test</p>",
    text: "test",
  }),
}));

vi.mock("@/lib/plugins/hooks", () => ({ hooks: { run: vi.fn().mockResolvedValue([]) } }));
vi.mock("@/lib/plugins/loader", () => ({ isPluginsEnabled: vi.fn().mockReturnValue(false) }));

import {
  createDataset,
  getDataset,
  updateDataset,
  deleteDataset,
  listDatasets,
  addDistribution,
} from "./datasets";

const testPrisma = getTestPrisma();
let testOrg: { id: string };

beforeAll(async () => {
  resetTestDatabase();
  testOrg = await testPrisma.organization.create({
    data: {
      name: "Integration Test Org",
      slug: "integration-test-org",
    },
  });
});

afterEach(async () => {
  await testPrisma.activityLog.deleteMany();
  await testPrisma.datasetKeyword.deleteMany();
  await testPrisma.distribution.deleteMany();
  await testPrisma.dataset.deleteMany();
});

afterAll(async () => {
  await cleanupTestDatabase();
  await testPrisma.$disconnect();
});

const baseInput = () => ({
  title: "Integration Test Dataset",
  description: "A dataset for integration testing",
  publisherId: testOrg.id,
  keywords: ["integration", "test"],
  accessLevel: "public" as const,
});

describe("Dataset CRUD integration", () => {
  it("full create → read → update → delete lifecycle", async () => {
    // Create
    const created = await createDataset(baseInput());
    expect(created.title).toBe("Integration Test Dataset");
    expect(created.slug).toBe("integration-test-dataset");

    // Read
    const fetched = await getDataset(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.title).toBe("Integration Test Dataset");

    // Update
    const updated = await updateDataset(created.id, {
      title: "Updated Integration Dataset",
    });
    expect(updated.title).toBe("Updated Integration Dataset");
    expect(updated.slug).toBe("updated-integration-dataset");

    // Delete
    await deleteDataset(created.id);
    const deleted = await getDataset(created.id);
    expect(deleted).toBeNull();
  });

  it("keywords are created and queryable", async () => {
    const created = await createDataset(baseInput());
    expect(created.keywords).toHaveLength(2);
    expect(created.keywords.map((k) => k.keyword).sort()).toEqual([
      "integration",
      "test",
    ]);

    // Update keywords
    const updated = await updateDataset(created.id, {
      keywords: ["updated-keyword"],
    });
    expect(updated.keywords).toHaveLength(1);
    expect(updated.keywords[0].keyword).toBe("updated-keyword");
  });

  it("distributions are created with dataset and cascade-deleted", async () => {
    const created = await createDataset(baseInput());

    await addDistribution(created.id, {
      title: "CSV",
      downloadURL: "https://example.com/data.csv",
      mediaType: "text/csv",
      format: "CSV",
    });

    const fetched = await getDataset(created.id);
    expect(fetched!.distributions).toHaveLength(1);
    expect(fetched!.distributions[0].title).toBe("CSV");

    // Delete dataset — distributions should cascade
    await deleteDataset(created.id);
    const distCount = await testPrisma.distribution.count({
      where: { datasetId: created.id },
    });
    expect(distCount).toBe(0);
  });

  it("search returns matching datasets", async () => {
    await createDataset({
      ...baseInput(),
      title: "Climate Change Data",
      keywords: ["climate"],
    });
    await createDataset({
      ...baseInput(),
      title: "Population Statistics",
      keywords: ["population"],
    });

    const result = await listDatasets({ search: "climate" });
    expect(result.datasets).toHaveLength(1);
    expect(result.datasets[0].title).toBe("Climate Change Data");
  });

  it("pagination returns correct slices", async () => {
    for (let i = 0; i < 5; i++) {
      await createDataset({
        ...baseInput(),
        title: `Dataset ${i}`,
        keywords: [`kw-${i}`],
      });
    }

    const page1 = await listDatasets({ page: 1, limit: 2 });
    expect(page1.datasets).toHaveLength(2);
    expect(page1.total).toBe(5);

    const page3 = await listDatasets({ page: 3, limit: 2 });
    expect(page3.datasets).toHaveLength(1);
  });
});
