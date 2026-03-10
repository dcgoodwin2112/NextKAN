import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { handleApiError } from "@/lib/utils/api";
import { exportFrictionless } from "@/lib/services/data-dictionary";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const format = request.nextUrl.searchParams.get("format");

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

    if (format === "csv") {
      const csvRows = results.flatMap((r) =>
        (r.schema?.fields || []).map((f) => ({
          distributionTitle: r.title,
          name: f.name,
          type: f.type,
          ...(f.title !== undefined && { title: f.title }),
          ...(f.description !== undefined && { description: f.description }),
          ...(f.format !== undefined && { format: f.format }),
          ...(f.constraints !== undefined && {
            constraints: JSON.stringify(f.constraints),
          }),
        }))
      );

      const csv = Papa.unparse(csvRows, {
        columns: [
          "distributionTitle",
          "name",
          "type",
          "title",
          "description",
          "format",
          "constraints",
        ],
      });

      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="dictionary-${id}.csv"`,
        },
      });
    }

    return NextResponse.json(results);
  } catch (error) {
    return handleApiError(error);
  }
}
