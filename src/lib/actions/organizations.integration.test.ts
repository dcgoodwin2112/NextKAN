// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { execSync } from "child_process";

let prisma: PrismaClient;

// Separate database to avoid SQLite lock with datasets.integration.test.ts
const DB_URL = "file:./prisma/org-test.db";

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
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Organization integration tests", () => {
  it("full create → read → update → delete lifecycle", async () => {
    // Create
    const org = await prisma.organization.create({
      data: {
        name: "Test Organization",
        slug: "test-organization",
        description: "A test org",
      },
    });
    expect(org.name).toBe("Test Organization");
    expect(org.slug).toBe("test-organization");

    // Read
    const found = await prisma.organization.findUnique({
      where: { id: org.id },
    });
    expect(found).not.toBeNull();
    expect(found!.name).toBe("Test Organization");

    // Update
    const updated = await prisma.organization.update({
      where: { id: org.id },
      data: { name: "Updated Organization", slug: "updated-organization" },
    });
    expect(updated.name).toBe("Updated Organization");

    // Delete
    await prisma.organization.delete({ where: { id: org.id } });
    const deleted = await prisma.organization.findUnique({
      where: { id: org.id },
    });
    expect(deleted).toBeNull();
  });

  it("cannot delete organization that has datasets", async () => {
    // Create user for dataset
    const user = await prisma.user.create({
      data: {
        email: "orgtest@example.com",
        password: "hashed",
        name: "Test User",
        role: "admin",
      },
    });

    const org = await prisma.organization.create({
      data: {
        name: "Org With Datasets",
        slug: "org-with-datasets",
      },
    });

    await prisma.dataset.create({
      data: {
        title: "Linked Dataset",
        slug: "linked-dataset",
        description: "Dataset linked to org",
        publisherId: org.id,
        createdById: user.id,
        modified: new Date(),
      },
    });

    // Attempting to delete should fail due to FK constraint
    await expect(
      prisma.organization.delete({ where: { id: org.id } })
    ).rejects.toThrow();

    // Cleanup
    await prisma.dataset.deleteMany({ where: { publisherId: org.id } });
    await prisma.organization.delete({ where: { id: org.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });
});
