import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/utils/api";
import { exportFrictionless } from "@/lib/services/data-dictionary";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Find distributions for this dataset
    const distributions = await prisma.distribution.findMany({
      where: { datasetId: id },
      include: { dataDictionary: true },
    });

    const results = await Promise.all(
      distributions
        .filter((d) => d.dataDictionary)
        .map(async (d) => {
          const schema = await exportFrictionless(d.id);
          return {
            distributionId: d.id,
            title: d.title || d.fileName || d.format,
            schema,
          };
        })
    );

    return NextResponse.json(results);
  } catch (error) {
    return handleApiError(error);
  }
}
