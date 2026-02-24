import { NextResponse } from "next/server";
import { getOpenApiSpec } from "@/lib/openapi";
import { siteConfig } from "@/lib/config";

export async function GET() {
  const spec = getOpenApiSpec(siteConfig.url);
  return NextResponse.json(spec);
}
