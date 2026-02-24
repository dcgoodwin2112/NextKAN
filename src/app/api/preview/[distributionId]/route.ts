// @vitest-environment node
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readFile } from "fs/promises";
import Papa from "papaparse";

const MAX_ROWS = 100;
const MAX_JSON_SIZE = 512 * 1024; // 500KB

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
    const content = await readFile(distribution.filePath, "utf-8");
    const format = (distribution.format || "").toUpperCase();

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

    if (format === "JSON" || distribution.mediaType === "application/json") {
      const truncated = content.length > MAX_JSON_SIZE;
      const preview = truncated ? content.slice(0, MAX_JSON_SIZE) : content;

      return NextResponse.json({
        type: "json",
        content: preview,
        truncated,
      });
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
