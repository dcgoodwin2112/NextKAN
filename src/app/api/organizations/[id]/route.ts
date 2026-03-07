import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getOrganization,
  updateOrganization,
  deleteOrganization,
} from "@/lib/actions/organizations";
import { handleApiError, unauthorized, notFound } from "@/lib/utils/api";
import { withTokenAuth } from "@/lib/utils/with-token-auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const organization = await getOrganization(id);
    if (!organization) {
      return notFound("Organization");
    }
    return NextResponse.json(organization);
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
      const session = await auth();
      if (!session?.user) {
        return unauthorized();
      }

      const { id } = await params;
      const body = await request.json();
      const organization = await updateOrganization(id, body);
      return NextResponse.json(organization);
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
      const session = await auth();
      if (!session?.user) {
        return unauthorized();
      }

      const { id } = await params;
      await deleteOrganization(id);
      return new NextResponse(null, { status: 204 });
    } catch (error) {
      return handleApiError(error);
    }
  });
}
