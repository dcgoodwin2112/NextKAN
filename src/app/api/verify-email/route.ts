import { NextResponse } from "next/server";
import { verifyEmailAction } from "@/lib/actions/registration";
import { handleApiError } from "@/lib/utils/api";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await verifyEmailAction(body.token);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
