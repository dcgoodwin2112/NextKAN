import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { CKANActionResponse } from "@/lib/schemas/ckan-compat";

export async function GET() {
  try {
    const organizations = await prisma.organization.findMany({
      select: { slug: true },
      orderBy: { name: "asc" },
    });

    const result: CKANActionResponse<string[]> = {
      success: true,
      result: organizations.map((o) => o.slug),
    };

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
