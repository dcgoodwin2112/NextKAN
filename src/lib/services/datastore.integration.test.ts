// @vitest-environment node
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  vi,
} from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { execSync } from "child_process";
import { writeFileSync, mkdirSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const DB_URL = "file:./prisma/datastore-test.db";

function getDatastoreTestPrisma() {
  const a = new PrismaBetterSqlite3({ url: DB_URL });
  return new PrismaClient({ adapter: a });
}

vi.mock("@/lib/db", async () => {
  const { PrismaClient } = await import("@/generated/prisma/client");
  const { PrismaBetterSqlite3 } = await import(
    "@prisma/adapter-better-sqlite3"
  );
  const a = new PrismaBetterSqlite3({ url: "file:./prisma/datastore-test.db" });
  return { prisma: new PrismaClient({ adapter: a }) };
});

import {
  importCsvToDatastore,
  queryDatastore,
  executeSql,
  validateSql,
  deleteDatastoreTable,
} from "./datastore";
import type { DatastoreColumn } from "@/lib/schemas/datastore";

const testPrisma = getDatastoreTestPrisma();

let testOrg: { id: string };
let testDataset: { id: string };
let testDistribution: Awaited<ReturnType<typeof testPrisma.distribution.create>>;
let csvPath: string;

beforeAll(async () => {
  execSync("npx prisma db push --force-reset --accept-data-loss", {
    env: {
      ...process.env,
      DATABASE_URL: DB_URL,
      PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: "yes",
    },
  });

  const tmpDir = join(tmpdir(), "nextkan-datastore-test");
  mkdirSync(tmpDir, { recursive: true });
  csvPath = join(tmpDir, "test-data.csv");
  writeFileSync(
    csvPath,
    "name,age,score,active\nAlice,30,95.5,true\nBob,25,87.3,false\nCharlie,35,92.1,yes\n"
  );

  // Point datastore service's getDb() at same DB
  process.env.DATABASE_URL = DB_URL;

  testOrg = await testPrisma.organization.create({
    data: { name: "Datastore Test Org", slug: "datastore-test-org" },
  });

  testDataset = await testPrisma.dataset.create({
    data: {
      title: "Datastore Test Dataset",
      description: "Test",
      slug: "datastore-test-dataset",
      publisherId: testOrg.id,
    },
  });

  testDistribution = await testPrisma.distribution.create({
    data: {
      datasetId: testDataset.id,
      title: "Test CSV",
      downloadURL: "https://example.com/test.csv",
      mediaType: "text/csv",
      format: "CSV",
      fileName: "test-data.csv",
      filePath: csvPath,
      fileSize: 100,
    },
  });
});

afterAll(async () => {
  const tables = await testPrisma.datastoreTable.findMany();
  for (const t of tables) {
    try {
      deleteDatastoreTable(t.tableName);
    } catch {
      // table may already be dropped
    }
  }

  await testPrisma.datastoreTable.deleteMany();
  await testPrisma.distribution.deleteMany();
  await testPrisma.dataset.deleteMany();
  await testPrisma.organization.deleteMany();
  await testPrisma.$disconnect();

  try {
    unlinkSync(csvPath);
  } catch {
    // ignore
  }
});

describe("Datastore integration", () => {
  it("imports CSV and creates a queryable table", async () => {
    await importCsvToDatastore(testDistribution);

    const record = await testPrisma.datastoreTable.findUnique({
      where: { distributionId: testDistribution.id },
    });

    expect(record).not.toBeNull();
    expect(record!.status).toBe("ready");
    expect(record!.rowCount).toBe(3);

    const columns: DatastoreColumn[] = JSON.parse(record!.columns);
    expect(columns).toHaveLength(4);
    expect(columns.find((c) => c.name === "name")?.type).toBe("TEXT");
    expect(columns.find((c) => c.name === "age")?.type).toBe("INTEGER");
    expect(columns.find((c) => c.name === "score")?.type).toBe("REAL");
    expect(columns.find((c) => c.name === "active")?.type).toBe("BOOLEAN");
  });

  it("queries structured data with default params", async () => {
    const record = await testPrisma.datastoreTable.findUnique({
      where: { distributionId: testDistribution.id },
    });
    const columns: DatastoreColumn[] = JSON.parse(record!.columns);

    const result = queryDatastore(record!.tableName, columns, {
      limit: 100,
      offset: 0,
      order: "asc",
    });

    expect(result.total).toBe(3);
    expect(result.records).toHaveLength(3);
    expect(result.records[0]).toHaveProperty("name");
    expect(result.records[0]).toHaveProperty("age");
  });

  it("queries with sort and order", async () => {
    const record = await testPrisma.datastoreTable.findUnique({
      where: { distributionId: testDistribution.id },
    });
    const columns: DatastoreColumn[] = JSON.parse(record!.columns);

    const result = queryDatastore(record!.tableName, columns, {
      limit: 100,
      offset: 0,
      sort: "age",
      order: "desc",
    });

    expect(result.records[0].age).toBe(35);
    expect(result.records[2].age).toBe(25);
  });

  it("queries with limit and offset", async () => {
    const record = await testPrisma.datastoreTable.findUnique({
      where: { distributionId: testDistribution.id },
    });
    const columns: DatastoreColumn[] = JSON.parse(record!.columns);

    const result = queryDatastore(record!.tableName, columns, {
      limit: 1,
      offset: 1,
      order: "asc",
    });

    expect(result.records).toHaveLength(1);
    expect(result.total).toBe(3);
  });

  it("filters with equality operator", async () => {
    const record = await testPrisma.datastoreTable.findUnique({
      where: { distributionId: testDistribution.id },
    });
    const columns: DatastoreColumn[] = JSON.parse(record!.columns);

    const result = queryDatastore(record!.tableName, columns, {
      limit: 100,
      offset: 0,
      order: "asc",
      filters: [{ column: "name", operator: "=", value: "Alice" }],
    });

    expect(result.total).toBe(1);
    expect(result.records[0].name).toBe("Alice");
  });

  it("filters with comparison operators", async () => {
    const record = await testPrisma.datastoreTable.findUnique({
      where: { distributionId: testDistribution.id },
    });
    const columns: DatastoreColumn[] = JSON.parse(record!.columns);

    const result = queryDatastore(record!.tableName, columns, {
      limit: 100,
      offset: 0,
      order: "asc",
      filters: [{ column: "age", operator: ">", value: 28 }],
    });

    expect(result.total).toBe(2);
  });

  it("filters with contains operator", async () => {
    const record = await testPrisma.datastoreTable.findUnique({
      where: { distributionId: testDistribution.id },
    });
    const columns: DatastoreColumn[] = JSON.parse(record!.columns);

    const result = queryDatastore(record!.tableName, columns, {
      limit: 100,
      offset: 0,
      order: "asc",
      filters: [{ column: "name", operator: "contains", value: "li" }],
    });

    expect(result.total).toBe(2); // Alice and Charlie
  });

  it("prevents SQL injection via filter values", async () => {
    const record = await testPrisma.datastoreTable.findUnique({
      where: { distributionId: testDistribution.id },
    });
    const columns: DatastoreColumn[] = JSON.parse(record!.columns);

    const result = queryDatastore(record!.tableName, columns, {
      limit: 100,
      offset: 0,
      order: "asc",
      filters: [
        {
          column: "name",
          operator: "=",
          value: "'; DROP TABLE ds_abc12345; --",
        },
      ],
    });

    expect(result.total).toBe(0);
    expect(result.records).toHaveLength(0);
  });

  it("executes raw SQL against datastore table", async () => {
    const record = await testPrisma.datastoreTable.findUnique({
      where: { distributionId: testDistribution.id },
    });

    const result = executeSql(
      `SELECT name, age FROM "${record!.tableName}" WHERE age > 28 ORDER BY age`
    );

    expect(result.columns).toEqual(["name", "age"]);
    expect(result.records).toHaveLength(2);
    expect(result.records[0].name).toBe("Alice");
    expect(result.executionTime).toBeGreaterThanOrEqual(0);
  });

  it("SQL validation rejects DROP statements", () => {
    const result = validateSql("DROP TABLE ds_abc12345");
    expect(result.valid).toBe(false);
  });

  it("SQL validation rejects non-ds_ tables", () => {
    const result = validateSql("SELECT * FROM User");
    expect(result.valid).toBe(false);
  });

  it("deleteDatastoreTable drops the dynamic table", async () => {
    const record = await testPrisma.datastoreTable.findUnique({
      where: { distributionId: testDistribution.id },
    });

    deleteDatastoreTable(record!.tableName);

    // Attempting to query the dropped table should throw
    expect(() =>
      executeSql(`SELECT * FROM "${record!.tableName}"`)
    ).toThrow();
  });
});
