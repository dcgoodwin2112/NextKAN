import { PrismaClient } from "../../src/generated/prisma/client";

export async function seedAnalytics(prisma: PrismaClient) {
  const datasets = await prisma.dataset.findMany({
    where: { status: "published", deletedAt: null },
    include: { distributions: { take: 1 } },
    orderBy: { createdAt: "asc" },
  });

  if (datasets.length === 0) {
    console.log("Seed: skipping analytics — no published datasets");
    return;
  }

  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);

  const events: {
    eventType: string;
    entityType: string | null;
    entityId: string | null;
    metadata: string | null;
    createdAt: Date;
  }[] = [];

  // 25 page_view events spread across 90 days
  for (let i = 0; i < 25; i++) {
    const ds = datasets[i % datasets.length];
    events.push({
      eventType: "page_view",
      entityType: "dataset",
      entityId: ds.id,
      metadata: JSON.stringify({
        userAgent: "Mozilla/5.0",
        referer: i % 3 === 0 ? "https://google.com" : null,
      }),
      createdAt: daysAgo(Math.floor((i * 90) / 25)),
    });
  }

  // 10 download events
  for (let i = 0; i < 10; i++) {
    const ds = datasets[i % datasets.length];
    const dist = ds.distributions[0];
    events.push({
      eventType: "download",
      entityType: "distribution",
      entityId: dist?.id ?? ds.id,
      metadata: JSON.stringify({ format: dist?.format ?? "CSV" }),
      createdAt: daysAgo(Math.floor((i * 90) / 10)),
    });
  }

  // 10 api_call events
  for (let i = 0; i < 10; i++) {
    events.push({
      eventType: "api_call",
      entityType: null,
      entityId: null,
      metadata: JSON.stringify({
        endpoint: [
          "/data.json",
          "/api/datasets",
          "/api/3/action/package_list",
          "/api/3/action/package_search",
          "/api/datasets?q=health",
        ][i % 5],
      }),
      createdAt: daysAgo(Math.floor((i * 90) / 10)),
    });
  }

  // 5 search events
  const searchQueries = [
    "air quality",
    "budget data",
    "health statistics",
    "transportation",
    "energy consumption",
  ];
  for (let i = 0; i < 5; i++) {
    events.push({
      eventType: "search",
      entityType: null,
      entityId: null,
      metadata: JSON.stringify({
        query: searchQueries[i],
        resultsCount: [4, 2, 3, 5, 1][i],
      }),
      createdAt: daysAgo(Math.floor((i * 90) / 5)),
    });
  }

  for (const event of events) {
    await prisma.analyticsEvent.create({ data: event });
  }

  console.log(`Seed: ${events.length} analytics events created`);
}
