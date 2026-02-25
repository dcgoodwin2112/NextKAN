"use server";

import { bulkImportCSV, bulkImportJSON } from "@/lib/services/bulk-import";

interface ImportResult {
  created: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

export async function importCSV(
  text: string,
  organizationId: string
): Promise<ImportResult> {
  return bulkImportCSV(text, organizationId);
}

export async function importJSON(
  catalogJson: string,
  organizationId: string
): Promise<ImportResult> {
  const catalog = JSON.parse(catalogJson);
  return bulkImportJSON(catalog, organizationId);
}
