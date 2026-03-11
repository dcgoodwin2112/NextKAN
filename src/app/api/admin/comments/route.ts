import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/roles";
import { getPendingComments } from "@/lib/services/comments";

export async function GET() {
  const session = await auth();
  if (!session?.user || !hasPermission((session.user as any).role, "user:manage")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const comments = await getPendingComments();
  return NextResponse.json(comments);
}
