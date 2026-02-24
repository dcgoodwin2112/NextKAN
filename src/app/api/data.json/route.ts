import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildCatalog } from "@/lib/schemas/dcat-us";

export const dynamic = "force-dynamic";

export async function GET() {
  const datasets = await prisma.dataset.findMany({
    where: { status: "published" },
    include: {
      publisher: { include: { parent: true } },
      distributions: true,
      keywords: true,
      themes: { include: { theme: true } },
    },
  });

  const siteUrl = process.env.SITE_URL || "http://localhost:3000";
  const catalog = buildCatalog(datasets, siteUrl);

  return NextResponse.json(catalog, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, must-revalidate",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
