import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getDataset,
  updateDataset,
  deleteDataset,
} from "@/lib/actions/datasets";
import { handleApiError, unauthorized, notFound } from "@/lib/utils/api";

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
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorized();
    }

    const { id } = await params;
    const body = await request.json();
    const dataset = await updateDataset(id, body);
    return NextResponse.json(dataset);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorized();
    }

    const { id } = await params;
    await deleteDataset(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
