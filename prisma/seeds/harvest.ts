import { PrismaClient } from "../../src/generated/prisma/client";

interface HarvestOrgIds {
  springfieldId: string;
  envAgencyId: string;
}

export async function seedHarvest(
  prisma: PrismaClient,
  orgIds: HarvestOrgIds
) {
  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000);

  // Source 1: successful DCAT-US feed
  const source1 = await prisma.harvestSource.create({
    data: {
      name: "Data.gov DCAT-US Feed",
      url: "https://catalog.data.gov/data.json",
      type: "dcat-us",
      schedule: "0 2 * * *",
      enabled: true,
      organizationId: orgIds.springfieldId,
      lastHarvestAt: hoursAgo(6),
      lastStatus: "success",
      datasetCount: 3,
    },
  });

  // Source 2: errored CKAN portal
  const source2 = await prisma.harvestSource.create({
    data: {
      name: "State CKAN Portal",
      url: "https://data.state.example.gov",
      type: "ckan",
      schedule: "0 3 * * 1",
      enabled: false,
      organizationId: orgIds.envAgencyId,
      lastHarvestAt: daysAgo(3),
      lastStatus: "error",
      lastErrorMsg: "Connection timeout after 30s — remote server unresponsive",
      datasetCount: 0,
    },
  });

  // Job 1: recent success for source 1
  await prisma.harvestJob.create({
    data: {
      sourceId: source1.id,
      status: "success",
      datasetsCreated: 3,
      datasetsUpdated: 1,
      datasetsDeleted: 0,
      startedAt: hoursAgo(6),
      completedAt: hoursAgo(5),
    },
  });

  // Job 2: error for source 2
  await prisma.harvestJob.create({
    data: {
      sourceId: source2.id,
      status: "error",
      datasetsCreated: 0,
      datasetsUpdated: 0,
      datasetsDeleted: 0,
      errors: JSON.stringify([
        "Connection timeout after 30s — remote server unresponsive",
      ]),
      startedAt: daysAgo(3),
      completedAt: daysAgo(3),
    },
  });

  // Job 3: older success for source 1
  await prisma.harvestJob.create({
    data: {
      sourceId: source1.id,
      status: "success",
      datasetsCreated: 2,
      datasetsUpdated: 0,
      datasetsDeleted: 0,
      startedAt: daysAgo(7),
      completedAt: daysAgo(7),
    },
  });

  console.log("Seed: 2 harvest sources + 3 harvest jobs created");
}
