import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { unauthorized, handleApiError, notFound } from "@/lib/utils/api";
import { transitionWorkflow, getWorkflowHistory, isWorkflowEnabled } from "@/lib/services/workflow";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const history = await getWorkflowHistory(id);
    return NextResponse.json(history);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();

    if (!isWorkflowEnabled()) {
      return NextResponse.json(
        { error: "Editorial workflow is not enabled" },
        { status: 400 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();
    const { toStatus, note } = body;

    if (!toStatus) {
      return NextResponse.json(
        { error: "toStatus is required" },
        { status: 400 }
      );
    }

    const userRole = (session.user as any).role as string;
    const result = await transitionWorkflow(
      id,
      toStatus,
      session.user.id!,
      userRole,
      session.user.name || undefined,
      note
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && (error.message.includes("Cannot transition") || error.message.includes("Role"))) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Dataset not found") {
      return notFound("Dataset");
    }
    return handleApiError(error);
  }
}
