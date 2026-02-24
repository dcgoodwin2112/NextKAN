import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const url = process.env.DATABASE_URL ?? "file:./prisma/e2e-test.db";
const adapter = new PrismaBetterSqlite3({ url });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Seed default themes
  const defaultThemes = [
    { name: "Health", slug: "health", color: "#F44336" },
    { name: "Education", slug: "education", color: "#9C27B0" },
    { name: "Transportation", slug: "transportation", color: "#FF5722" },
  ];
  for (const theme of defaultThemes) {
    await prisma.theme.upsert({
      where: { slug: theme.slug },
      update: {},
      create: theme,
    });
  }

  const org = await prisma.organization.create({
    data: {
      name: "E2E Test Agency",
      slug: "e2e-test-agency",
      description: "Agency for E2E testing",
    },
  });

  const admin = await prisma.user.findFirst({ where: { role: "admin" } });
  if (!admin) throw new Error("Admin user not found — run prisma db seed first");

  // Published dataset
  const dataset = await prisma.dataset.create({
    data: {
      title: "E2E Published Dataset",
      slug: "e2e-published-dataset",
      description: "A published dataset for E2E testing",
      status: "published",
      publisherId: org.id,
      createdById: admin.id,
      accessLevel: "public",
      contactName: "E2E Tester",
      contactEmail: "e2e@example.com",
      modified: new Date(),
    },
  });

  await prisma.datasetKeyword.createMany({
    data: [
      { keyword: "e2e", datasetId: dataset.id },
      { keyword: "testing", datasetId: dataset.id },
    ],
  });

  await prisma.distribution.create({
    data: {
      datasetId: dataset.id,
      title: "CSV Download",
      downloadURL: "https://example.com/data.csv",
      format: "CSV",
      mediaType: "text/csv",
    },
  });

  // Draft dataset (should not appear publicly)
  await prisma.dataset.create({
    data: {
      title: "E2E Draft Dataset",
      slug: "e2e-draft-dataset",
      description: "A draft dataset that should not appear publicly",
      status: "draft",
      publisherId: org.id,
      createdById: admin.id,
      modified: new Date(),
    },
  });

  console.log("E2E test data seeded");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
