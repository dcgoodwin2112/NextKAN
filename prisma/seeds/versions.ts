import { PrismaClient } from "../../src/generated/prisma/client";

export async function seedVersions(prisma: PrismaClient) {
  // Get 2 published datasets with their full relations
  const datasets = await prisma.dataset.findMany({
    where: { status: "published", deletedAt: null },
    include: {
      publisher: true,
      keywords: true,
      distributions: true,
    },
    take: 2,
    orderBy: { createdAt: "asc" },
  });

  if (datasets.length < 2) {
    console.log("Seed: skipping versions — not enough published datasets");
    return;
  }

  const users = await prisma.user.findMany({ take: 1 });
  const createdById = users[0]?.id ?? null;

  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);

  let created = 0;

  for (const ds of datasets) {
    // Build a DCAT-US-style snapshot (matches createVersion() output)
    const snapshot = {
      title: ds.title,
      description: ds.description,
      identifier: ds.identifier,
      accessLevel: ds.accessLevel,
      license: ds.license,
      contactPoint: {
        fn: ds.contactName,
        hasEmail: ds.contactEmail ? `mailto:${ds.contactEmail}` : undefined,
      },
      publisher: { name: ds.publisher.name },
      keyword: ds.keywords.map((k) => k.keyword),
      distribution: ds.distributions.map((d) => ({
        title: d.title,
        downloadURL: d.downloadURL,
        mediaType: d.mediaType,
        format: d.format,
      })),
      temporal: ds.temporal,
      spatial: ds.spatial,
      accrualPeriodicity: ds.accrualPeriodicity,
      issued: ds.issued?.toISOString(),
      language: ds.language,
    };

    // Version 1.0 — initial release
    const existing1 = await prisma.datasetVersion.findUnique({
      where: { datasetId_version: { datasetId: ds.id, version: "1.0" } },
    });
    if (!existing1) {
      await prisma.datasetVersion.create({
        data: {
          datasetId: ds.id,
          version: "1.0",
          snapshot: JSON.stringify(snapshot),
          changelog: "Initial dataset publication",
          createdById,
          createdAt: daysAgo(60),
        },
      });
      created++;
    }

    // Version 1.1 — minor update
    const updatedSnapshot = {
      ...snapshot,
      description: ds.description + " Updated with latest data.",
    };
    const existing2 = await prisma.datasetVersion.findUnique({
      where: { datasetId_version: { datasetId: ds.id, version: "1.1" } },
    });
    if (!existing2) {
      await prisma.datasetVersion.create({
        data: {
          datasetId: ds.id,
          version: "1.1",
          snapshot: JSON.stringify(updatedSnapshot),
          changelog:
            "Updated description and added latest data through current period",
          createdById,
          createdAt: daysAgo(15),
        },
      });
      created++;
    }
  }

  console.log(`Seed: ${created} dataset versions created`);
}
