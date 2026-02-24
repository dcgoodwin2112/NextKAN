import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/utils/api";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const chart = await prisma.savedChart.findUnique({
      where: { id },
      include: {
        distribution: {
          include: { datastoreTable: true },
        },
      },
    });

    if (!chart) {
      return NextResponse.json({ error: "Chart not found" }, { status: 404 });
    }

    // If there's a datastore table, fetch data for the chart
    let data: Record<string, unknown>[] = [];
    if (chart.distribution.datastoreTable?.status === "ready") {
      const { queryDatastore } = await import("@/lib/services/datastore");
      const columns = JSON.parse(chart.distribution.datastoreTable.columns);
      const result = queryDatastore(
        chart.distribution.datastoreTable.tableName,
        columns,
        { limit: 1000, offset: 0, order: "asc" }
      );
      data = result.records;
    }

    return NextResponse.json({
      chart: {
        id: chart.id,
        title: chart.title,
        chartType: chart.chartType,
        config: JSON.parse(chart.config),
      },
      data,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
