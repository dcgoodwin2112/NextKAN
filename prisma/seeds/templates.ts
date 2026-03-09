import { PrismaClient } from "../../src/generated/prisma/client";

interface TemplateOrgIds {
  envAgencyId: string;
  springfieldId: string;
}

export async function seedTemplates(
  prisma: PrismaClient,
  orgIds: TemplateOrgIds
) {
  const templates = [
    {
      name: "Federal Dataset",
      description:
        "Standard template for federal agency datasets with required DCAT-US fields pre-filled.",
      fields: JSON.stringify({
        accessLevel: "public",
        language: "en",
        bureauCode: "015:11",
        programCode: "015:001",
        license: "https://creativecommons.org/publicdomain/zero/1.0/",
        accrualPeriodicity: "R/P1Y",
      }),
      organizationId: null,
    },
    {
      name: "Environmental Monitoring",
      description:
        "Template for environmental monitoring datasets with pre-filled contact and theme information.",
      fields: JSON.stringify({
        accessLevel: "public",
        language: "en",
        contactName: "Priya Sharma",
        contactEmail: "data@state-env.gov",
        license: "https://creativecommons.org/licenses/by/4.0/",
        accrualPeriodicity: "R/P1M",
      }),
      organizationId: orgIds.envAgencyId,
    },
    {
      name: "Municipal Open Data",
      description:
        "Template for city-level open data publications with standard municipal metadata.",
      fields: JSON.stringify({
        accessLevel: "public",
        language: "en",
        contactName: "Jane Mitchell",
        contactEmail: "opendata@springfield.gov",
        license: "https://creativecommons.org/publicdomain/zero/1.0/",
      }),
      organizationId: orgIds.springfieldId,
    },
  ];

  for (const t of templates) {
    const existing = await prisma.datasetTemplate.findFirst({
      where: { name: t.name },
    });
    if (!existing) {
      await prisma.datasetTemplate.create({ data: t });
    }
  }

  console.log(`Seed: ${templates.length} dataset templates created`);
}
