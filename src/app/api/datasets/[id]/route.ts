import { NextRequest, NextResponse } from "next/server";
import {
  getDataset,
  updateDataset,
  deleteDataset,
} from "@/lib/actions/datasets";
import { requireDatasetPermission } from "@/lib/auth/check-permission";
import { handleApiError, notFound } from "@/lib/utils/api";
import { withTokenAuth } from "@/lib/utils/with-token-auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dataset = await getDataset(id);
    if (!dataset) {
      return notFound("Dataset");
    }
    return NextResponse.json(dataset);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withTokenAuth(request, async () => {
    try {
      const { id } = await params;
      await requireDatasetPermission("dataset:update", id);
      const body = await request.json();
      const dataset = await updateDataset(id, body);
      return NextResponse.json(dataset);
    } catch (error) {
      return handleApiError(error);
    }
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withTokenAuth(request, async () => {
    try {
      const { id } = await params;
      await requireDatasetPermission("dataset:update", id);
      await deleteDataset(id);
      return new NextResponse(null, { status: 204 });
    } catch (error) {
      return handleApiError(error);
    }
  });
}
