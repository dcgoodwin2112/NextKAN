import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runHarvest } from "@/lib/services/harvest";
import { handleApiError } from "@/lib/utils/api";

/** POST: trigger all enabled harvest sources that are due. Used as external cron alternative. */
export async function POST(request: NextRequest) {
  try {
    // Check for API key or admin session
    const apiKey = request.headers.get("x-api-key");
    if (apiKey !== process.env.HARVEST_API_KEY && process.env.HARVEST_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sources = await prisma.harvestSource.findMany({
      where: { enabled: true },
    });

    const results = [];
    for (const source of sources) {
      try {
        const result = await runHarvest(source.id);
        results.push({ sourceId: source.id, name: source.name, ...result });
      } catch (error) {
        results.push({
          sourceId: source.id,
          name: source.name,
          error: error instanceof Error ? error.message : "Failed",
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    return handleApiError(error);
  }
}
