import { prisma } from "@/lib/db";
import { calculateQualityScore } from "@/lib/services/data-quality";
import type { DatasetWithRelations } from "@/lib/schemas/dcat-us";

async function main() {
  const id = process.argv[2];
  const d = await prisma.dataset.findUnique({
    where: { id },
    include: {
      publisher: { include: { parent: true } },
      distributions: { include: { dataDictionary: { include: { fields: true } } } },
      keywords: true,
      themes: { include: { theme: true } },
    },
  });
  const result = calculateQualityScore(d as unknown as DatasetWithRelations);
  console.log(`overall=${result.overall} max=${result.maxScore} (${Math.round(result.overall/result.maxScore*100)}%)`);
  for (const b of result.breakdown) {
    console.log(`  ${b.score}/${b.maxScore.toString().padStart(2)}  ${b.category.padEnd(30)} ${b.details}`);
  }
  process.exit(0);
}
main();
