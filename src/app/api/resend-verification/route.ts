import { NextResponse } from "next/server";
import { resendVerificationAction } from "@/lib/actions/registration";
import { handleApiError } from "@/lib/utils/api";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await resendVerificationAction(body.email);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
