import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { CKANActionResponse } from "@/lib/schemas/ckan-compat";

export async function GET() {
  try {
    const datasets = await prisma.dataset.findMany({
      where: { status: "published" },
      select: { slug: true },
      orderBy: { title: "asc" },
    });

    const result: CKANActionResponse<string[]> = {
      success: true,
      result: datasets.map((d) => d.slug),
    };

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
