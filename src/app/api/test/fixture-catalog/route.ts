import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

/** Test-only route that serves the fixture catalog. Gated to non-production. */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  try {
    const filePath = join(
      process.cwd(),
      "src/lib/test-utils/fixtures/test-catalog.json"
    );
    const content = await readFile(filePath, "utf-8");
    return new NextResponse(content, {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "Fixture not found" }, { status: 500 });
  }
}
