import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { CKANActionResponse } from "@/lib/schemas/ckan-compat";

export async function GET() {
  try {
    const keywords = await prisma.datasetKeyword.findMany({
      select: { keyword: true },
      distinct: ["keyword"],
      orderBy: { keyword: "asc" },
    });

    const result: CKANActionResponse<string[]> = {
      success: true,
      result: keywords.map((k) => k.keyword),
    };

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
