// @vitest-environment node
import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { resolve } from "path";

const DB_URL = "file:./prisma/harvest-test.db";
let prisma: PrismaClient;

// Mock @/lib/db to use our test database
vi.mock("@/lib/db", async () => {
  const { PrismaBetterSqlite3 } = await import("@prisma/adapter-better-sqlite3");
  const { PrismaClient } = await import("@/generated/prisma/client");
  const adapter = new PrismaBetterSqlite3({ url: "file:./prisma/harvest-test.db" });
  return { prisma: new PrismaClient({ adapter }) };
});

vi.mock("@/lib/services/email", () => ({
  getEmailService: () => ({ send: vi.fn().mockResolvedValue(undefined) }),
}));

vi.mock("@/lib/email-templates/harvest-complete", () => ({
  harvestCompleteEmail: vi.fn().mockReturnValue({
    subject: "test",
    html: "<p>test</p>",
    text: "test",
  }),
}));

vi.mock("@/lib/email-templates/dataset-created", () => ({
  datasetCreatedEmail: vi.fn().mockReturnValue({
    subject: "test",
    html: "<p>test</p>",
    text: "test",
  }),
}));

vi.mock("@/lib/services/activity", () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
  computeDiff: vi.fn(),
}));

import { runHarvest } from "./harvest";

const fixturePath = resolve(__dirname, "../test-utils/fixtures/test-catalog.json");
const fixtureData = JSON.parse(readFileSync(fixturePath, "utf-8"));

let testOrg: { id: string };
let testSource: { id: string };

beforeAll(async () => {
  execSync("npx prisma db push --force-reset --accept-data-loss", {
    env: {
      ...process.env,
      DATABASE_URL: DB_URL,
      PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: "yes",
    },
  });
  const adapter = new PrismaBetterSqlite3({ url: DB_URL });
  prisma = new PrismaClient({ adapter });

  // Create test organization
  testOrg = await prisma.organization.create({
    data: { name: "Harvest Test Org", slug: "harvest-test-org" },
  });
});

afterEach(async () => {
  // Clean up in dependency order
  await prisma.activityLog.deleteMany();
  await prisma.datasetKeyword.deleteMany();
  await prisma.distribution.deleteMany();
  await prisma.dataset.deleteMany();
  await prisma.harvestJob.deleteMany();
  await prisma.harvestSource.deleteMany();
});

afterAll(async () => {
  await prisma.organization.deleteMany();
  await prisma.$disconnect();
});

async function createSource() {
  return prisma.harvestSource.create({
    data: {
      name: "Test DCAT-US Source",
      url: "http://example.com/data.json",
      type: "dcat-us",
      organizationId: testOrg.id,
    },
  });
}

describe("Harvest integration tests", () => {
  it("harvests fixture catalog and creates datasets", async () => {
    const source = await createSource();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => fixtureData,
    });

    const result = await runHarvest(source.id);

    expect(result.datasetsCreated).toBe(2);
    expect(result.datasetsUpdated).toBe(0);
    expect(result.errors).toHaveLength(0);

    // Verify datasets were created in DB
    const datasets = await prisma.dataset.findMany({
      where: { harvestSourceId: source.id },
      include: { keywords: true, distributions: true },
      orderBy: { title: "asc" },
    });

    expect(datasets).toHaveLength(2);
    expect(datasets[0].title).toBe("Test Harvest Dataset 1");
    expect(datasets[0].harvestIdentifier).toBe("test-harvest-1");
    expect(datasets[1].title).toBe("Test Harvest Dataset 2");
    expect(datasets[1].harvestIdentifier).toBe("test-harvest-2");

    // First dataset should have a distribution
    expect(datasets[0].distributions).toHaveLength(1);
    expect(datasets[0].distributions[0].downloadURL).toBe("http://example.com/data1.csv");
  });

  it("re-harvest updates existing datasets", async () => {
    const source = await createSource();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => fixtureData,
    });

    // First harvest — creates datasets
    await runHarvest(source.id);

    const beforeUpdate = await prisma.dataset.findMany({
      where: { harvestSourceId: source.id },
    });
    expect(beforeUpdate).toHaveLength(2);

    // Second harvest — should update, not create duplicates
    const result = await runHarvest(source.id);

    expect(result.datasetsCreated).toBe(0);
    expect(result.datasetsUpdated).toBe(2);

    const afterUpdate = await prisma.dataset.findMany({
      where: { harvestSourceId: source.id },
    });
    expect(afterUpdate).toHaveLength(2);
  });

  it("re-harvest archives datasets removed from remote", async () => {
    const source = await createSource();

    // First harvest with 2 datasets
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => fixtureData,
    });
    await runHarvest(source.id);

    // Second harvest with empty catalog — should archive both
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ...fixtureData, dataset: [] }),
    });

    const result = await runHarvest(source.id);

    expect(result.datasetsDeleted).toBe(2);

    const archived = await prisma.dataset.findMany({
      where: { harvestSourceId: source.id, status: "archived" },
    });
    expect(archived).toHaveLength(2);
  });

  it("sets harvestSourceId and harvestIdentifier on created datasets", async () => {
    const source = await createSource();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => fixtureData,
    });

    await runHarvest(source.id);

    const datasets = await prisma.dataset.findMany({
      where: { harvestSourceId: source.id },
    });

    for (const ds of datasets) {
      expect(ds.harvestSourceId).toBe(source.id);
      expect(ds.harvestIdentifier).toBeTruthy();
    }
  });
});
