import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/utils/api";
import { buildCatalog } from "@/lib/schemas/dcat-us";
import { listDatasets } from "@/lib/actions/datasets";
import { siteConfig } from "@/lib/config";
import Papa from "papaparse";

export async function GET(request: NextRequest) {
  try {
    const format = request.nextUrl.searchParams.get("format");

    if (!format || !["csv", "json"].includes(format)) {
      return NextResponse.json(
        { error: "format parameter required (csv or json)" },
        { status: 400 }
      );
    }

    // Fetch all published datasets
    const { datasets } = await listDatasets({
      status: "published",
      limit: 10000,
    });

    if (format === "json") {
      const catalog = buildCatalog(datasets as any, siteConfig.url);
      return new NextResponse(JSON.stringify(catalog, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": 'attachment; filename="catalog.json"',
        },
      });
    }

    // CSV format — flatten datasets
    const rows = datasets.map((d) => ({
      title: d.title,
      description: d.description,
      identifier: d.identifier,
      accessLevel: d.accessLevel,
      keywords: d.keywords.map((k) => k.keyword).join(";"),
      publisher: d.publisher.name,
      contactName: d.contactName || "",
      contactEmail: d.contactEmail || "",
      license: d.license || "",
      spatial: d.spatial || "",
      temporal: d.temporal || "",
      modified: d.modified.toISOString().split("T")[0],
      status: d.status,
    }));

    const csv = Papa.unparse(rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="datasets.csv"',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
