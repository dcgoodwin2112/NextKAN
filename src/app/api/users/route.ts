import { NextRequest, NextResponse } from "next/server";
import { createUser, listUsers } from "@/lib/actions/users";
import { handleApiError } from "@/lib/utils/api";

export async function GET() {
  try {
    const users = await listUsers();
    return NextResponse.json(users);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const user = await createUser(body);
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
