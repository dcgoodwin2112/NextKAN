import { NextRequest, NextResponse } from "next/server";
import { listTokens, createToken } from "@/lib/actions/api-tokens";
import { handleApiError } from "@/lib/utils/api";
import { withTokenAuth } from "@/lib/utils/with-token-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withTokenAuth(request, async () => {
    try {
      const { id } = await params;
      const tokens = await listTokens(id);
      return NextResponse.json(tokens);
    } catch (error) {
      return handleApiError(error);
    }
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withTokenAuth(request, async () => {
    try {
      const { id } = await params;
      const body = await request.json();
      const token = await createToken(id, body);
      return NextResponse.json(token, { status: 201 });
    } catch (error) {
      return handleApiError(error);
    }
  });
}
