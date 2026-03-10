import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { WorkflowPanel } from "./WorkflowPanel";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("WorkflowPanel", () => {
  let mockOnTransition: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnTransition = vi.fn().mockResolvedValue(undefined);
  });

  it("renders current status and available transitions", () => {
    render(
      <WorkflowPanel
        datasetId="ds-1"
        currentStatus="draft"
        availableTransitions={["pending_review"]}
        transitions={[]}
        onTransition={mockOnTransition}
      />
    );

    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.getByText("Submit for Review")).toBeInTheDocument();
  });

  it("shows toast error when transition fails", async () => {
    const user = userEvent.setup();
    mockOnTransition.mockRejectedValue(new Error("Permission denied"));

    render(
      <WorkflowPanel
        datasetId="ds-1"
        currentStatus="draft"
        availableTransitions={["pending_review"]}
        transitions={[]}
        onTransition={mockOnTransition}
      />
    );

    await user.click(screen.getByText("Submit for Review"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Workflow transition failed");
    });
  });

  it("does not show toast on successful transition", async () => {
    const user = userEvent.setup();

    render(
      <WorkflowPanel
        datasetId="ds-1"
        currentStatus="draft"
        availableTransitions={["pending_review"]}
        transitions={[]}
        onTransition={mockOnTransition}
      />
    );

    await user.click(screen.getByText("Submit for Review"));

    await waitFor(() => {
      expect(mockOnTransition).toHaveBeenCalledWith("pending_review", undefined);
    });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("renders workflow history", () => {
    render(
      <WorkflowPanel
        datasetId="ds-1"
        currentStatus="pending_review"
        availableTransitions={["approved", "rejected"]}
        transitions={[
          {
            id: "t-1",
            fromStatus: "draft",
            toStatus: "pending_review",
            userName: "Alice",
            note: "Ready for review",
            createdAt: "2026-01-15T00:00:00Z",
          },
        ]}
        onTransition={mockOnTransition}
      />
    );

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText(/ready for review/i)).toBeInTheDocument();
  });
});
