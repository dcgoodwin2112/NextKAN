import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { datasetToCKAN, type CKANActionResponse, type CKANPackage } from "@/lib/schemas/ckan-compat";
import { buildSearchWhere } from "@/lib/utils/search";
import type { DatasetWithRelations } from "@/lib/schemas/dcat-us";

const datasetIncludes = {
  publisher: { include: { parent: true } },
  distributions: true,
  keywords: true,
  themes: { include: { theme: true } },
} as const;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const q = searchParams.get("q") || undefined;
    const rows = parseInt(searchParams.get("rows") || "10", 10) || 10;
    const start = parseInt(searchParams.get("start") || "0", 10) || 0;

    const searchWhere = q ? buildSearchWhere({ query: q }) : {};
    const where = { ...searchWhere, status: "published" as const };

    const [datasets, count] = await Promise.all([
      prisma.dataset.findMany({
        where,
        include: datasetIncludes,
        orderBy: { modified: "desc" },
        skip: start,
        take: rows,
      }),
      prisma.dataset.count({ where }),
    ]);

    const result: CKANActionResponse<{ count: number; results: CKANPackage[] }> = {
      success: true,
      result: {
        count,
        results: datasets.map((d) => datasetToCKAN(d as unknown as DatasetWithRelations)),
      },
    };

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
