import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  listOrganizations,
  createOrganization,
} from "@/lib/actions/organizations";
import { handleApiError, unauthorized } from "@/lib/utils/api";

export async function GET() {
  try {
    const organizations = await listOrganizations();
    return NextResponse.json(organizations);
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
    const organization = await createOrganization(body);
    return NextResponse.json(organization, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
