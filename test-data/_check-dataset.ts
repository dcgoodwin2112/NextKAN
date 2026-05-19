import { prisma } from "@/lib/db";

async function main() {
  const id = process.argv[2];
  const d = await prisma.dataset.findUnique({
    where: { id },
    include: { keywords: true },
  });
  console.log(JSON.stringify({
    title: d?.title,
    descriptionStart: d?.description?.slice(0, 200),
    keywords: d?.keywords.map((k) => k.keyword),
  }, null, 2));
  process.exit(0);
}
main();
