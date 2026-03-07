import { NextRequest, NextResponse } from "next/server";
import { revokeToken } from "@/lib/actions/api-tokens";
import { handleApiError } from "@/lib/utils/api";
import { withTokenAuth } from "@/lib/utils/with-token-auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tokenId: string }> }
) {
  return withTokenAuth(request, async () => {
    try {
      const { tokenId } = await params;
      await revokeToken(tokenId);
      return new NextResponse(null, { status: 204 });
    } catch (error) {
      return handleApiError(error);
    }
  });
}
