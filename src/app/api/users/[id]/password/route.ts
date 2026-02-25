import { NextRequest, NextResponse } from "next/server";
import { resetPassword } from "@/lib/actions/users";
import { handleApiError } from "@/lib/utils/api";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    await resetPassword(id, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
