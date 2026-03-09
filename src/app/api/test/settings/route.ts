import { NextRequest, NextResponse } from "next/server";
import { setSetting } from "@/lib/services/settings";
import { SETTING_KEYS } from "@/lib/services/settings";

/**
 * Test-only route to update settings from external scripts. Gated to non-production.
 * Sets both DB and process.env so all module instances see the change immediately
 * (Turbopack isolates in-memory caches per route module).
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 404 }
    );
  }

  const body = await request.json();
  const { key, value } = body as { key: string; value: string };

  if (!key || value === undefined) {
    return NextResponse.json(
      { error: "key and value are required" },
      { status: 400 }
    );
  }

  // Restrict to known setting keys
  if (!SETTING_KEYS.includes(key)) {
    return NextResponse.json(
      { error: `Unknown setting key: ${key}` },
      { status: 400 }
    );
  }

  await setSetting(key, value);
  // Also set process.env so getSetting() fallback works across isolated module instances
  process.env[key] = value;
  return NextResponse.json({ ok: true, key, value });
}
