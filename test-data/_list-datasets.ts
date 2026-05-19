import { prisma } from "@/lib/db";

async function main() {
  const ds = await prisma.dataset.findMany({
    where: { deletedAt: null },
    select: { id: true, slug: true, title: true, status: true, accessLevel: true },
  });
  console.log(JSON.stringify(ds, null, 2));
  process.exit(0);
}
main();
