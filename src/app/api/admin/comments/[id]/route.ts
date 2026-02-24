import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { moderateComment, deleteComment } from "@/lib/services/comments";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json();
  const comment = await moderateComment(id, body.approved);
  return NextResponse.json(comment);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await deleteComment(id);
  return NextResponse.json({ ok: true });
}
