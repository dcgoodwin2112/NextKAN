import { NextRequest, NextResponse } from "next/server";
import { datastoreSqlSchema } from "@/lib/schemas/datastore";
import { executeSql } from "@/lib/services/datastore";
import { handleApiError } from "@/lib/utils/api";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sql } = datastoreSqlSchema.parse(body);
    const result = executeSql(sql);

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
