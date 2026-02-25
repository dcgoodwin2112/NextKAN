import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/roles";
import { getNotificationItems } from "@/lib/services/notifications";
import { handleApiError } from "@/lib/utils/api";

export async function GET() {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;

    if (!session?.user || !hasPermission(role, "admin:access")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await getNotificationItems();
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}
