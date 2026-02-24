import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { organizationToCKAN, type CKANActionResponse, type CKANOrganization } from "@/lib/schemas/ckan-compat";

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: id" },
        { status: 400 }
      );
    }

    const org = await prisma.organization.findFirst({
      where: { OR: [{ slug: id }, { id }] },
      include: { _count: { select: { datasets: { where: { status: "published" } } } } },
    });

    if (!org) {
      return NextResponse.json(
        { success: false, error: "Not found" },
        { status: 404 }
      );
    }

    const result: CKANActionResponse<CKANOrganization> = {
      success: true,
      result: organizationToCKAN(org, org._count.datasets),
    };

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
