import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { datastoreQuerySchema } from "@/lib/schemas/datastore";
import { queryDatastore } from "@/lib/services/datastore";
import { handleApiError, notFound } from "@/lib/utils/api";
import type { DatastoreColumn } from "@/lib/schemas/datastore";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ distributionId: string }> }
) {
  try {
    const { distributionId } = await params;

    const datastoreTable = await prisma.datastoreTable.findUnique({
      where: { distributionId },
    });

    if (!datastoreTable || datastoreTable.status !== "ready") {
      return notFound("Datastore");
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const query = datastoreQuerySchema.parse(searchParams);
    const columns: DatastoreColumn[] = JSON.parse(datastoreTable.columns);

    // Skip querying the raw SQLite table when only columns are needed
    if (query.limit === 0 && query.offset === 0 && !query.filters) {
      return NextResponse.json({
        columns,
        records: [],
        total: datastoreTable.rowCount ?? 0,
        limit: 0,
        offset: 0,
      });
    }

    let records: Record<string, unknown>[];
    let total: number;
    try {
      const result = queryDatastore(
        datastoreTable.tableName,
        columns,
        query
      );
      records = result.records;
      total = result.total;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("no such table")) {
        // Dynamic table missing — mark datastore as stale
        await prisma.datastoreTable.update({
          where: { id: datastoreTable.id },
          data: { status: "error", errorMessage: "Table missing — re-import CSV to rebuild" },
        });
        return NextResponse.json(
          { error: "Datastore table missing. Re-import the CSV to rebuild it." },
          { status: 410 }
        );
      }
      throw err;
    }

    return NextResponse.json({
      columns,
      records,
      total,
      limit: query.limit,
      offset: query.offset,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
