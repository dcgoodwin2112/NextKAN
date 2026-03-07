import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/utils/api";
import { buildCatalog } from "@/lib/schemas/dcat-us";
import { listDatasets } from "@/lib/actions/datasets";
import { listCustomFieldDefinitions } from "@/lib/actions/custom-fields";
import { siteConfig } from "@/lib/config";
import { prisma } from "@/lib/db";
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

    // Load all custom field values for exported datasets
    const datasetIds = datasets.map((d) => d.id);
    const allCustomValues = datasetIds.length > 0
      ? await prisma.datasetCustomFieldValue.findMany({
          where: { datasetId: { in: datasetIds } },
          include: { definition: true },
        })
      : [];

    // Group by dataset
    const cfByDataset = new Map<string, Record<string, string>>();
    for (const cv of allCustomValues) {
      if (!cfByDataset.has(cv.datasetId)) cfByDataset.set(cv.datasetId, {});
      cfByDataset.get(cv.datasetId)![cv.definition.name] = cv.value;
    }

    if (format === "json") {
      const catalog = buildCatalog(datasets as any, siteConfig.url);
      // Add _extras to each dataset entry
      if (catalog.dataset) {
        for (let i = 0; i < catalog.dataset.length; i++) {
          const extras = cfByDataset.get(datasets[i].id);
          if (extras && Object.keys(extras).length > 0) {
            (catalog.dataset[i] as any)._extras = extras;
          }
        }
      }
      return new NextResponse(JSON.stringify(catalog, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": 'attachment; filename="catalog.json"',
        },
      });
    }

    // CSV format — flatten datasets
    const customFieldDefs = await listCustomFieldDefinitions();
    const rows = datasets.map((d) => {
      const base: Record<string, string> = {
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
      };
      const extras = cfByDataset.get(d.id) || {};
      for (const def of customFieldDefs) {
        base[`cf_${def.name}`] = extras[def.name] || "";
      }
      return base;
    });

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
