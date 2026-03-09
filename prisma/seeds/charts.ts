import { PrismaClient } from "../../src/generated/prisma/client";

export async function seedCharts(prisma: PrismaClient) {
  // Find distributions that have datastore tables
  const datastoreDists = await prisma.datastoreTable.findMany({
    where: { status: "ready" },
    include: { distribution: { include: { dataset: true } } },
  });

  if (datastoreDists.length === 0) {
    console.log("Seed: skipping charts — no datastore tables found");
    return;
  }

  // Map by dataset slug for easy lookup
  const distBySlug = new Map<string, (typeof datastoreDists)[0]>();
  for (const dt of datastoreDists) {
    distBySlug.set(dt.distribution.dataset.slug, dt);
  }

  let created = 0;

  // Bar chart on annual-budget distribution
  const budgetDist = distBySlug.get("annual-budget-data");
  if (budgetDist) {
    const cols = JSON.parse(budgetDist.columns) as { name: string }[];
    const colNames = cols.map((c) => c.name);
    const xCol = colNames.find((n) => n.includes("department")) ?? colNames[0];
    const yCol = colNames.find((n) => n.includes("amount")) ?? colNames[1];
    await prisma.savedChart.create({
      data: {
        distributionId: budgetDist.distributionId,
        title: "Budget by Department",
        chartType: "bar",
        config: JSON.stringify({
          xColumn: xCol,
          yColumns: [yCol],
          options: { showLegend: true },
        }),
      },
    });
    created++;
  }

  // Line chart on air-quality distribution
  const airDist = distBySlug.get("air-quality-monitoring");
  if (airDist) {
    const cols = JSON.parse(airDist.columns) as { name: string }[];
    const colNames = cols.map((c) => c.name);
    const xCol = colNames.find((n) => n.includes("date")) ?? colNames[0];
    const yCol = colNames.find((n) => n.includes("aqi")) ?? colNames[1];
    await prisma.savedChart.create({
      data: {
        distributionId: airDist.distributionId,
        title: "Air Quality Index Over Time",
        chartType: "line",
        config: JSON.stringify({
          xColumn: xCol,
          yColumns: [yCol],
          options: { showLegend: true },
        }),
      },
    });
    created++;
  }

  // Pie chart on energy-consumption distribution
  const energyDist = distBySlug.get("energy-consumption-by-sector");
  if (energyDist) {
    const cols = JSON.parse(energyDist.columns) as { name: string }[];
    const colNames = cols.map((c) => c.name);
    const xCol = colNames.find((n) => n.includes("sector")) ?? colNames[0];
    const yCol =
      colNames.find((n) => n.includes("consumption")) ?? colNames[1];
    await prisma.savedChart.create({
      data: {
        distributionId: energyDist.distributionId,
        title: "Energy Consumption by Sector",
        chartType: "pie",
        config: JSON.stringify({
          xColumn: xCol,
          yColumns: [yCol],
          options: { showLegend: true },
        }),
      },
    });
    created++;
  }

  console.log(`Seed: ${created} saved charts created`);
}
