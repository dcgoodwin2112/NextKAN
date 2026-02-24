import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPendingComments } from "@/lib/services/comments";

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const comments = await getPendingComments();
  return NextResponse.json(comments);
}
