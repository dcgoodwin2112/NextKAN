import { PrismaClient } from "../../src/generated/prisma/client";

export async function seedSeries(prisma: PrismaClient) {
  const envReports = await prisma.datasetSeries.upsert({
    where: { slug: "annual-environmental-reports" },
    update: {},
    create: {
      title: "Annual Environmental Reports",
      slug: "annual-environmental-reports",
      identifier: "annual-environmental-reports",
      description:
        "A collection of annual environmental monitoring datasets covering air quality, water quality, and energy consumption trends.",
    },
  });

  const healthData = await prisma.datasetSeries.upsert({
    where: { slug: "public-health-data-collection" },
    update: {},
    create: {
      title: "Public Health Data Collection",
      slug: "public-health-data-collection",
      identifier: "public-health-data-collection",
      description:
        "Ongoing collection of public health datasets including hospital readmission rates and chronic disease statistics.",
    },
  });

  console.log("Seed: 2 dataset series created");
  return { envReports, healthData };
}
