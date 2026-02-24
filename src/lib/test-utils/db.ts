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
    env: {
      ...process.env,
      DATABASE_URL: "file:./prisma/test.db",
      PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: "yes",
    },
  });
}

export async function cleanupTestDatabase() {
  const prisma = getTestPrisma();
  await prisma.datasetTheme.deleteMany();
  await prisma.datasetKeyword.deleteMany();
  await prisma.distribution.deleteMany();
  await prisma.dataset.deleteMany();
  await prisma.theme.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();
}
