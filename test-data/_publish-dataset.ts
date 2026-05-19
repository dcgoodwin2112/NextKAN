import { prisma } from "@/lib/db";

async function main() {
  const id = process.argv[2];
  if (!id) { console.error("usage: _publish-dataset.ts <id>"); process.exit(1); }
  const updated = await prisma.dataset.update({
    where: { id },
    data: { status: "published" },
  });
  console.log("status:", updated.status, "title:", updated.title);
  process.exit(0);
}
main();
