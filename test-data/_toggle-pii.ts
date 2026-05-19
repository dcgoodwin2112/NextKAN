import { prisma } from "@/lib/db";

async function main() {
  const fieldName = process.argv[2];
  const newValue = process.argv[3] === "true";
  const distId = process.argv[4] ?? "94d2d59e-2f1c-4ec4-9171-8314675c5407";
  const dict = await prisma.dataDictionary.findUnique({
    where: { distributionId: distId },
  });
  await prisma.dataDictionaryField.update({
    where: { dictionaryId_name: { dictionaryId: dict!.id, name: fieldName } },
    data: { isPii: newValue },
  });
  const f = await prisma.dataDictionaryField.findFirst({
    where: { dictionaryId: dict!.id, name: fieldName },
  });
  console.log(`${fieldName}.isPii = ${f?.isPii}`);
  process.exit(0);
}
main();
