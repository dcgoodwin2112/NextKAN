import Papa from "papaparse";
import { datasetCreateSchema } from "@/lib/schemas/dataset";
import { createDataset, addDistribution } from "@/lib/actions/datasets";
import {
  reverseDCATUSToDatasetInput,
  type DCATUSCatalog,
} from "@/lib/schemas/dcat-us";

export interface BulkImportResult {
  created: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

/** Import datasets from a CSV string. Required columns: title, description, keywords (semicolon-separated), accessLevel. */
export async function bulkImportCSV(
  csv: string,
  publisherId: string
): Promise<BulkImportResult> {
  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  });

  const result: BulkImportResult = { created: 0, skipped: 0, errors: [] };

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    const rowNum = i + 2; // 1-indexed + header row

    try {
      const keywords = (row.keywords || "")
        .split(";")
        .map((k) => k.trim())
        .filter(Boolean);

      const accessLevel = (
        ["public", "restricted public", "non-public"].includes(
          row.accessLevel
        )
          ? row.accessLevel
          : "public"
      ) as "public" | "restricted public" | "non-public";

      const input = {
        title: row.title || "",
        description: row.description || "",
        accessLevel,
        keywords: keywords.length > 0 ? keywords : ["untagged"],
        publisherId,
        status: "published" as const,
        contactName: row.contactName || undefined,
        contactEmail: row.contactEmail || undefined,
        license: row.license || undefined,
        spatial: row.spatial || undefined,
        temporal: row.temporal || undefined,
      };

      const validated = datasetCreateSchema.parse(input);
      await createDataset(validated);
      result.created++;
    } catch (error) {
      result.errors.push({
        row: rowNum,
        message: error instanceof Error ? error.message : "Validation error",
      });
    }
  }

  result.skipped = parsed.data.length - result.created - result.errors.length;
  return result;
}

/** Import datasets from a DCAT-US catalog JSON object. */
export async function bulkImportJSON(
  catalog: DCATUSCatalog,
  publisherId: string
): Promise<BulkImportResult> {
  const result: BulkImportResult = { created: 0, skipped: 0, errors: [] };
  const datasets = catalog.dataset || [];

  for (let i = 0; i < datasets.length; i++) {
    try {
      const mapped = reverseDCATUSToDatasetInput(datasets[i], publisherId);
      const { distributions, ...datasetInput } = mapped;

      // Ensure keywords has at least one entry
      if (!datasetInput.keywords || datasetInput.keywords.length === 0) {
        datasetInput.keywords = ["untagged"];
      }

      const dataset = await createDataset(datasetInput);

      if (distributions) {
        for (const dist of distributions) {
          if (dist.downloadURL || dist.accessURL) {
            await addDistribution(dataset.id, dist);
          }
        }
      }

      result.created++;
    } catch (error) {
      result.errors.push({
        row: i + 1,
        message: error instanceof Error ? error.message : "Import error",
      });
    }
  }

  result.skipped = datasets.length - result.created - result.errors.length;
  return result;
}
