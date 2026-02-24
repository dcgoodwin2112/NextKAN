import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { savedChartCreateSchema } from "@/lib/schemas/chart";
import { handleApiError, unauthorized } from "@/lib/utils/api";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const distributionId = searchParams.get("distributionId");

    const where = distributionId ? { distributionId } : {};
    const charts = await prisma.savedChart.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(charts);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorized();
    }

    const body = await request.json();
    const data = savedChartCreateSchema.parse(body);

    const chart = await prisma.savedChart.create({
      data: {
        distributionId: data.distributionId,
        title: data.title || null,
        chartType: data.chartType,
        config: JSON.stringify(data.config),
        createdById: session.user.id,
      },
    });

    return NextResponse.json(chart, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
