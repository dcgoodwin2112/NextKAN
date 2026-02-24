import { NextRequest, NextResponse } from "next/server";
import { trackEvent } from "@/lib/services/analytics";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventType, entityType, entityId, metadata } = body;

    if (!eventType) {
      return NextResponse.json({ error: "eventType is required" }, { status: 400 });
    }

    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
    const ipHash = crypto
      .createHash("sha256")
      .update(ip)
      .digest("hex")
      .slice(0, 16);

    await trackEvent({
      eventType,
      entityType: entityType || undefined,
      entityId: entityId || undefined,
      metadata: metadata || undefined,
      ipHash,
    });

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
