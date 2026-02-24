import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

const DEFAULT_THEMES = [
  { name: "Agriculture", slug: "agriculture", color: "#4CAF50" },
  { name: "Business", slug: "business", color: "#2196F3" },
  { name: "Climate", slug: "climate", color: "#00BCD4" },
  { name: "Consumer", slug: "consumer", color: "#FF9800" },
  { name: "Ecosystems", slug: "ecosystems", color: "#8BC34A" },
  { name: "Education", slug: "education", color: "#9C27B0" },
  { name: "Energy", slug: "energy", color: "#FFC107" },
  { name: "Finance", slug: "finance", color: "#607D8B" },
  { name: "Health", slug: "health", color: "#F44336" },
  { name: "Local Government", slug: "local-government", color: "#3F51B5" },
  { name: "Manufacturing", slug: "manufacturing", color: "#795548" },
  { name: "Maritime", slug: "maritime", color: "#03A9F4" },
  { name: "Ocean", slug: "ocean", color: "#0097A7" },
  { name: "Public Safety", slug: "public-safety", color: "#E91E63" },
  { name: "Science & Research", slug: "science-research", color: "#673AB7" },
  { name: "Transportation", slug: "transportation", color: "#FF5722" },
];

async function main() {
  const hashedPassword = await bcrypt.hash(
    process.env.ADMIN_PASSWORD || "changeme",
    12
  );

  await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || "admin@example.com" },
    update: {},
    create: {
      email: process.env.ADMIN_EMAIL || "admin@example.com",
      password: hashedPassword,
      name: "Admin",
      role: "admin",
    },
  });

  for (const theme of DEFAULT_THEMES) {
    await prisma.theme.upsert({
      where: { slug: theme.slug },
      update: {},
      create: theme,
    });
  }

  console.log("Seed complete: admin user + 16 themes created");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
