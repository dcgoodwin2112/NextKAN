import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { datasetToCKAN, type CKANActionResponse, type CKANPackage } from "@/lib/schemas/ckan-compat";
import type { DatasetWithRelations } from "@/lib/schemas/dcat-us";

const datasetIncludes = {
  publisher: { include: { parent: true } },
  distributions: true,
  keywords: true,
  themes: { include: { theme: true } },
} as const;

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: id" },
        { status: 400 }
      );
    }

    const dataset = await prisma.dataset.findFirst({
      where: {
        OR: [{ slug: id }, { identifier: id }],
        status: "published",
        deletedAt: null,
      },
      include: datasetIncludes,
    });

    if (!dataset) {
      return NextResponse.json(
        { success: false, error: "Not found" },
        { status: 404 }
      );
    }

    const result: CKANActionResponse<CKANPackage> = {
      success: true,
      result: datasetToCKAN(dataset as unknown as DatasetWithRelations),
    };

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
