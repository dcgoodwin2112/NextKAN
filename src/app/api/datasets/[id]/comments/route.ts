import { NextRequest, NextResponse } from "next/server";
import {
  isCommentsEnabled,
  getApprovedComments,
  submitComment,
} from "@/lib/services/comments";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isCommentsEnabled()) {
    return NextResponse.json(
      { error: "Comments are disabled" },
      { status: 404 }
    );
  }
  const comments = await getApprovedComments(id);
  return NextResponse.json(comments);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isCommentsEnabled()) {
    return NextResponse.json(
      { error: "Comments are disabled" },
      { status: 404 }
    );
  }
  const body = await request.json();

  if (!body.authorName || !body.authorEmail || !body.content) {
    return NextResponse.json(
      { error: "authorName, authorEmail, and content are required" },
      { status: 400 }
    );
  }

  const comment = await submitComment({
    datasetId: id,
    authorName: body.authorName,
    authorEmail: body.authorEmail,
    content: body.content,
    parentId: body.parentId,
  });

  return NextResponse.json(comment, { status: 201 });
}
