import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listDatasets, createDataset } from "@/lib/actions/datasets";
import { handleApiError, unauthorized } from "@/lib/utils/api";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get("page") || "1", 10) || 1;
    const limit = parseInt(searchParams.get("limit") || "20", 10) || 20;
    const search = searchParams.get("search") || undefined;
    const organizationId = searchParams.get("organizationId") || undefined;
    const status = searchParams.get("status") || undefined;

    const result = await listDatasets({
      page,
      limit,
      search,
      organizationId,
      status,
    });

    return NextResponse.json({
      datasets: result.datasets,
      total: result.total,
      page,
      limit,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorized();
    }

    const body = await request.json();
    const dataset = await createDataset(body, session.user.id);
    return NextResponse.json(dataset, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
