import { prisma } from "@/lib/db";

async function main() {
  const id = process.argv[2];
  if (!id) { console.error("usage: _inspect-distribution.ts <distId>"); process.exit(1); }

  const d = await prisma.distribution.findUnique({
    where: { id },
    include: { dataDictionary: { include: { fields: true } } },
  });
  console.log(JSON.stringify({
    profileStatus: d?.profileStatus,
    profileError: d?.profileError,
    parquetPath: d?.parquetPath,
    rowCount: d?.rowCount,
    filePath: d?.filePath,
    fieldCount: d?.dataDictionary?.fields.length,
    fields: d?.dataDictionary?.fields.map((f) => ({
      name: f.name, type: f.type, duckdbType: f.duckdbType,
      filterable: f.filterable, aggregatable: f.aggregatable, isPii: f.isPii,
      distinctCount: f.distinctCount, enumValues: f.enumValues,
    })),
  }, null, 2));
  process.exit(0);
}

main();
