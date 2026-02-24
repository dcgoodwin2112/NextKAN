import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError, unauthorized } from "@/lib/utils/api";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;

    if (!session?.user || !["admin", "orgAdmin"].includes(role)) {
      return unauthorized();
    }

    const { searchParams } = request.nextUrl;
    const entityType = searchParams.get("entityType") || undefined;
    const entityId = searchParams.get("entityId") || undefined;
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 100);
    const offset = Number(searchParams.get("offset")) || 0;

    const where: Record<string, unknown> = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;

    const [activities, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.activityLog.count({ where }),
    ]);

    return NextResponse.json({ activities, total });
  } catch (error) {
    return handleApiError(error);
  }
}
