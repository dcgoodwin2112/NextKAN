/**
 * Seed a fully-profiled dataset for browser testing of the agent-first pivot.
 * Mirrors what the upload UI does: creates a Distribution then runs the
 * profileDistribution sidecar (Phase 4) against test-data/sales-mixed.csv.
 *
 * Usage: npx tsx test-data/seed-pivot-fixture.ts
 */
import { promises as fs } from "node:fs";
import path from "node:path";

import { prisma } from "@/lib/db";
import { profileDistribution } from "@/lib/services/profile-distribution";
import { profileResource } from "@/lib/profiling";

async function main() {
  const fixture = path.resolve("test-data/sales-mixed.csv");
  await fs.access(fixture);

  // Reuse the seeded admin org.
  const publisher = await prisma.organization.findFirst({
    where: { slug: { not: undefined } },
    orderBy: { createdAt: "asc" },
  });
  if (!publisher) throw new Error("no publisher in DB — run prisma db seed first");

  // Clean slate.
  await prisma.dataset.deleteMany({ where: { slug: "pivot-browser-test" } });

  const dataset = await prisma.dataset.create({
    data: {
      slug: "pivot-browser-test",
      identifier: "pivot-browser-test",
      title: "Pivot browser test dataset",
      description: "Seeded for browser-based pivot verification.",
      modified: new Date(),
      accessLevel: "public",
      status: "published",
      publisherId: publisher.id,
    },
  });

  // Mirror the legacy upload path: copy the fixture into public/uploads and
  // populate Distribution.filePath. The profileDistribution sidecar reads
  // from filePath and copies into the storage tree itself.
  const legacyDir = path.resolve("public/uploads");
  await fs.mkdir(legacyDir, { recursive: true });
  const legacyPath = path.join(legacyDir, "sales-mixed.csv");
  await fs.copyFile(fixture, legacyPath);

  const tmpDist = await prisma.distribution.create({
    data: {
      datasetId: dataset.id,
      title: "Sales (mixed types)",
      mediaType: "text/csv",
      format: "CSV",
      fileName: "sales-mixed.csv",
      filePath: legacyPath,
      fileSize: (await fs.stat(legacyPath)).size,
    },
  });

  // The worker-thread default profiler can't resolve tsx aliases when run
  // outside Next.js. Inject the in-process profileResource to exercise the
  // same persistence path the upload sidecar uses.
  await profileDistribution(tmpDist.id, {
    profiler: async ({ sourcePath, parquetTargetPath, mediaType }) =>
      profileResource({ sourcePath, parquetTargetPath, mediaType }),
  });

  const reloaded = await prisma.distribution.findUnique({
    where: { id: tmpDist.id },
    include: { dataDictionary: { include: { fields: true } } },
  });

  console.log(JSON.stringify({
    datasetId: dataset.id,
    distributionId: tmpDist.id,
    profileStatus: reloaded?.profileStatus,
    parquetPath: reloaded?.parquetPath,
    rowCount: reloaded?.rowCount,
    fields: reloaded?.dataDictionary?.fields.map((f) => ({
      name: f.name, type: f.type, filterable: f.filterable,
      aggregatable: f.aggregatable, isPii: f.isPii,
      enumValues: f.enumValues, distinctCount: f.distinctCount,
    })),
  }, null, 2));
}

main().catch((err) => { console.error(err); process.exit(1); });
