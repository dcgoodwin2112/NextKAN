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
    const userId = searchParams.get("userId") || undefined;
    const action = searchParams.get("action") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const format = searchParams.get("format") || undefined;
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 100);
    const offset = Number(searchParams.get("offset")) || 0;

    const where: Record<string, unknown> = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (userId) where.userId = userId;
    if (action) where.action = { contains: action };

    if (startDate || endDate) {
      const createdAt: Record<string, Date> = {};
      if (startDate) createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        createdAt.lte = end;
      }
      where.createdAt = createdAt;
    }

    if (format === "csv") {
      const activities = await prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      const header = "Time,User,Action,Entity Type,Entity Name,Details";
      const rows = activities.map((a) => {
        const time = new Date(a.createdAt).toISOString();
        const user = csvEscape(a.userName || "System");
        const act = csvEscape(a.action);
        const type = csvEscape(a.entityType);
        const name = csvEscape(a.entityName || "");
        const details = csvEscape(a.details || "");
        return `${time},${user},${act},${type},${name},${details}`;
      });

      const csv = [header, ...rows].join("\n");
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": 'attachment; filename="activity-log.csv"',
        },
      });
    }

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

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
