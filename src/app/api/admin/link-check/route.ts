import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/check-permission";
import { checkDistributionLinks } from "@/lib/services/link-checker";
import { handleApiError } from "@/lib/utils/api";

export async function POST() {
  try {
    await requirePermission("admin:access");
    const results = await checkDistributionLinks();
    return NextResponse.json(results);
  } catch (error) {
    return handleApiError(error);
  }
}
