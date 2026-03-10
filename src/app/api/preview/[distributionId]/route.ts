// @vitest-environment node
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readFile } from "fs/promises";
import Papa from "papaparse";
import { extractJsonArray, flattenObject, stringifyValues } from "@/lib/services/datastore";

const MAX_ROWS = 100;
const MAX_JSON_SIZE = 512 * 1024; // 500KB

function isGeoJson(format: string, mediaType: string | null): boolean {
  return format === "GEOJSON" || mediaType === "application/geo+json";
}

function isExcel(format: string, mediaType: string | null): boolean {
  return (
    format === "XLSX" ||
    format === "XLS" ||
    mediaType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mediaType === "application/vnd.ms-excel"
  );
}

function parseGeoJsonFeatures(data: unknown): Record<string, unknown>[] {
  if (
    data &&
    typeof data === "object" &&
    "type" in (data as Record<string, unknown>) &&
    (data as any).type === "FeatureCollection" &&
    Array.isArray((data as any).features)
  ) {
    return (data as any).features;
  }
  if (Array.isArray(data)) {
    return data;
  }
  throw new Error("Invalid GeoJSON structure");
}

function featuresToTabular(features: Record<string, unknown>[]) {
  const rows = features.slice(0, MAX_ROWS).map((f: any) => {
    const props = f.properties ? flattenObject(f.properties) : {};
    return stringifyValues({
      ...props,
      geometry: f.geometry ? JSON.stringify(f.geometry) : "",
    });
  });
  const columnSet = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) columnSet.add(key);
  }
  return { columns: Array.from(columnSet), rows };
}

function jsonToTabular(content: string) {
  const parsed = JSON.parse(content);
  const arr = extractJsonArray(parsed);
  const totalRows = arr.length;
  const rows = arr.slice(0, MAX_ROWS).map((r) => stringifyValues(flattenObject(r)));
  const columnSet = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) columnSet.add(key);
  }
  return { columns: Array.from(columnSet), rows, totalRows };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ distributionId: string }> }
) {
  const { distributionId } = await params;

  const distribution = await prisma.distribution.findUnique({
    where: { id: distributionId },
  });

  if (!distribution) {
    return NextResponse.json({ error: "Distribution not found" }, { status: 404 });
  }

  if (!distribution.filePath) {
    return NextResponse.json({ error: "No file available for preview" }, { status: 404 });
  }

  try {
    const format = (distribution.format || "").toUpperCase();

    // Excel: read as binary buffer
    if (isExcel(format, distribution.mediaType)) {
      const XLSX = await import("xlsx");
      const buffer = await readFile(distribution.filePath);
      const workbook = XLSX.read(buffer);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
      const totalRows = jsonData.length;
      const rows = jsonData.slice(0, MAX_ROWS).map((r) => stringifyValues(r));
      const columnSet = new Set<string>();
      for (const row of rows) {
        for (const key of Object.keys(row)) columnSet.add(key);
      }
      return NextResponse.json({
        type: "csv",
        columns: Array.from(columnSet),
        rows,
        totalRows,
        truncated: totalRows > MAX_ROWS,
      });
    }

    const content = await readFile(distribution.filePath, "utf-8");

    if (format === "CSV" || distribution.mediaType === "text/csv") {
      const result = Papa.parse(content, { header: true, skipEmptyLines: true });
      const columns = result.meta.fields || [];
      const totalRows = result.data.length;
      const rows = result.data.slice(0, MAX_ROWS) as Record<string, string>[];

      return NextResponse.json({
        type: "csv",
        columns,
        rows,
        totalRows,
        truncated: totalRows > MAX_ROWS,
      });
    }

    if (isGeoJson(format, distribution.mediaType)) {
      const parsed = JSON.parse(content);
      const features = parseGeoJsonFeatures(parsed);
      const totalRows = features.length;
      const { columns, rows } = featuresToTabular(features);
      return NextResponse.json({
        type: "geojson",
        columns,
        rows,
        totalRows,
        truncated: totalRows > MAX_ROWS,
        geojson: parsed,
      });
    }

    if (format === "JSON" || distribution.mediaType === "application/json") {
      // Try tabular parse first
      try {
        const { columns, rows, totalRows } = jsonToTabular(content);
        return NextResponse.json({
          type: "json-table",
          columns,
          rows,
          totalRows,
          truncated: totalRows > MAX_ROWS,
        });
      } catch {
        // Fall back to raw JSON
        const truncated = content.length > MAX_JSON_SIZE;
        const preview = truncated ? content.slice(0, MAX_JSON_SIZE) : content;
        return NextResponse.json({
          type: "json",
          content: preview,
          truncated,
        });
      }
    }

    return NextResponse.json({
      type: "unsupported",
      format: distribution.format,
      message: "Preview not available for this format",
    });
  } catch {
    return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
  }
}
