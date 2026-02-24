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

    const { records, total } = queryDatastore(
      datastoreTable.tableName,
      columns,
      query
    );

    return NextResponse.json({
      columns: columns.map((c) => c.name),
      records,
      total,
      limit: query.limit,
      offset: query.offset,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
