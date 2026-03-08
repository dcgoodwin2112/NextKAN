import { NextResponse } from "next/server";
import { registerUser } from "@/lib/actions/registration";
import { handleApiError } from "@/lib/utils/api";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await registerUser(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
