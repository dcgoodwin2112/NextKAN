import { PrismaClient } from "../../src/generated/prisma/client";

export async function seedCustomFields(prisma: PrismaClient) {
  // Create definitions
  const steward = await prisma.customFieldDefinition.upsert({
    where: { name: "data_steward" },
    update: {},
    create: {
      name: "data_steward",
      label: "Data Steward",
      type: "text",
      required: false,
      sortOrder: 0,
    },
  });

  const freqNotes = await prisma.customFieldDefinition.upsert({
    where: { name: "update_frequency_notes" },
    update: {},
    create: {
      name: "update_frequency_notes",
      label: "Update Frequency Notes",
      type: "text",
      required: false,
      sortOrder: 1,
    },
  });

  const compliance = await prisma.customFieldDefinition.upsert({
    where: { name: "compliance_level" },
    update: {},
    create: {
      name: "compliance_level",
      label: "Compliance Level",
      type: "select",
      required: false,
      options: JSON.stringify(["Level 1", "Level 2", "Level 3"]),
      sortOrder: 2,
    },
  });

  // Set values on published datasets
  const datasets = await prisma.dataset.findMany({
    where: { status: "published", deletedAt: null },
    take: 6,
    orderBy: { createdAt: "asc" },
  });

  const stewardNames = [
    "Jane Mitchell",
    "Carlos Rivera",
    "Priya Sharma",
    "David Chen",
    "Priya Sharma",
    "Jane Mitchell",
  ];
  const freqNotesValues = [
    "Updated after annual budget approval in June",
    "Monthly from police report submissions",
    "Daily automated readings from monitoring stations",
    "Annual release aligned with school year",
    "Annual release with 6-month lag",
    "",
  ];
  const complianceLevels = [
    "Level 3",
    "Level 2",
    "Level 3",
    "Level 1",
    "Level 2",
    "Level 1",
  ];

  let valuesCreated = 0;
  for (let i = 0; i < Math.min(datasets.length, 6); i++) {
    const ds = datasets[i];

    // Data Steward (always set)
    await prisma.datasetCustomFieldValue.upsert({
      where: {
        datasetId_definitionId: {
          datasetId: ds.id,
          definitionId: steward.id,
        },
      },
      update: {},
      create: {
        datasetId: ds.id,
        definitionId: steward.id,
        value: stewardNames[i],
      },
    });
    valuesCreated++;

    // Update Frequency Notes (skip empty)
    if (freqNotesValues[i]) {
      await prisma.datasetCustomFieldValue.upsert({
        where: {
          datasetId_definitionId: {
            datasetId: ds.id,
            definitionId: freqNotes.id,
          },
        },
        update: {},
        create: {
          datasetId: ds.id,
          definitionId: freqNotes.id,
          value: freqNotesValues[i],
        },
      });
      valuesCreated++;
    }

    // Compliance Level
    await prisma.datasetCustomFieldValue.upsert({
      where: {
        datasetId_definitionId: {
          datasetId: ds.id,
          definitionId: compliance.id,
        },
      },
      update: {},
      create: {
        datasetId: ds.id,
        definitionId: compliance.id,
        value: complianceLevels[i],
      },
    });
    valuesCreated++;
  }

  console.log(
    `Seed: 3 custom field definitions + ${valuesCreated} values created`
  );
}
