import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildCatalog } from "@/lib/schemas/dcat-us";
import { hooks } from "@/lib/plugins/hooks";
import { isPluginsEnabled } from "@/lib/plugins/loader";

export const dynamic = "force-dynamic";

export async function GET() {
  const datasets = await prisma.dataset.findMany({
    where: { status: "published", deletedAt: null },
    include: {
      publisher: { include: { parent: true } },
      distributions: true,
      keywords: true,
      themes: { include: { theme: true } },
      series: true,
    },
  });

  const siteUrl = process.env.SITE_URL || "http://localhost:3000";
  let catalog = buildCatalog(datasets, siteUrl);

  if (isPluginsEnabled()) {
    try {
      const results = await hooks.run("catalog:beforeRender", catalog);
      const replacement = results.filter(Boolean).pop();
      if (replacement) catalog = replacement;
    } catch {
      // Ignore plugin errors — serve original catalog
    }
  }

  return NextResponse.json(catalog, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, must-revalidate",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
