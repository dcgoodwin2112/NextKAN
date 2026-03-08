import { PrismaClient } from "../../src/generated/prisma/client";

const DEFAULT_LICENSES = [
  {
    name: "Creative Commons Zero (CC0 1.0)",
    url: "https://creativecommons.org/publicdomain/zero/1.0/",
    description: "No rights reserved. Dedicates work to the public domain.",
    isDefault: true,
    sortOrder: 0,
  },
  {
    name: "Creative Commons Attribution (CC BY 4.0)",
    url: "https://creativecommons.org/licenses/by/4.0/",
    description: "Allows reuse with attribution to the creator.",
    isDefault: false,
    sortOrder: 1,
  },
  {
    name: "Open Data Commons Open Database License (ODbL)",
    url: "https://opendatacommons.org/licenses/odbl/1-0/",
    description: "Allows sharing, creating, and adapting databases with attribution and share-alike.",
    isDefault: false,
    sortOrder: 2,
  },
  {
    name: "Public Domain",
    url: null,
    description: "Work is in the public domain with no copyright restrictions.",
    isDefault: false,
    sortOrder: 3,
  },
  {
    name: "Creative Commons Attribution Share-Alike (CC BY-SA 4.0)",
    url: "https://creativecommons.org/licenses/by-sa/4.0/",
    description: "Allows reuse with attribution; derivatives must use the same license.",
    isDefault: false,
    sortOrder: 4,
  },
];

export async function seedLicenses(prisma: PrismaClient) {
  for (const license of DEFAULT_LICENSES) {
    await prisma.license.upsert({
      where: { name: license.name },
      update: {},
      create: license,
    });
  }

  console.log(`Seed: ${DEFAULT_LICENSES.length} licenses created`);
}
