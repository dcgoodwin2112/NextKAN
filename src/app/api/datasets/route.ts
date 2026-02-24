import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listDatasets, createDataset } from "@/lib/actions/datasets";
import { handleApiError, unauthorized } from "@/lib/utils/api";
import { parseSpatial, extractBbox, bboxIntersects } from "@/lib/schemas/spatial";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get("page") || "1", 10) || 1;
    const limit = parseInt(searchParams.get("limit") || "20", 10) || 20;
    const search = searchParams.get("search") || undefined;
    const organizationId = searchParams.get("organizationId") || undefined;
    const status = searchParams.get("status") || undefined;
    const bbox = searchParams.get("bbox") || undefined;

    const result = await listDatasets({
      page,
      limit,
      search,
      organizationId,
      status,
    });

    let datasets = result.datasets;

    // In-memory bbox filter
    if (bbox) {
      const parts = bbox.split(",").map(Number);
      if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
        const queryBbox = parts as [number, number, number, number];
        datasets = datasets.filter((d) => {
          if (!d.spatial) return false;
          const spatial = parseSpatial(d.spatial);
          const datasetBbox = extractBbox(spatial);
          if (!datasetBbox) return false;
          return bboxIntersects(queryBbox, datasetBbox);
        });
      }
    }

    return NextResponse.json({
      datasets,
      total: bbox ? datasets.length : result.total,
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
