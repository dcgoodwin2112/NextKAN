import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BulkActionBar, type BulkAction } from "./BulkActionBar";

describe("BulkActionBar", () => {
  const defaultActions: BulkAction[] = [
    { label: "Publish", onClick: vi.fn() },
    {
      label: "Delete",
      onClick: vi.fn(),
      variant: "destructive",
      requiresConfirmation: true,
      confirmTitle: "Delete items?",
      confirmDescription: "This cannot be undone.",
    },
  ];
  const onClear = vi.fn();

  it("does not render when selectedCount is 0", () => {
    const { container } = render(
      <BulkActionBar selectedCount={0} onClear={onClear} actions={defaultActions} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders count and action buttons", () => {
    render(
      <BulkActionBar
        selectedCount={3}
        onClear={onClear}
        actions={defaultActions}
        entityName="dataset"
      />
    );
    expect(screen.getByText("3 datasets selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publish" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear selection" })).toBeInTheDocument();
  });

  it("singular entity name for count of 1", () => {
    render(
      <BulkActionBar
        selectedCount={1}
        onClear={onClear}
        actions={defaultActions}
        entityName="dataset"
      />
    );
    expect(screen.getByText("1 dataset selected")).toBeInTheDocument();
  });

  it("calls onClick directly for non-confirmation actions", async () => {
    const user = userEvent.setup();
    render(
      <BulkActionBar selectedCount={2} onClear={onClear} actions={defaultActions} />
    );
    await user.click(screen.getByRole("button", { name: "Publish" }));
    expect(defaultActions[0].onClick).toHaveBeenCalled();
  });

  it("shows AlertDialog for destructive actions", async () => {
    const user = userEvent.setup();
    render(
      <BulkActionBar selectedCount={2} onClear={onClear} actions={defaultActions} />
    );
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByText("Delete items?")).toBeInTheDocument();
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
  });

  it("calls clear on clear button click", async () => {
    const user = userEvent.setup();
    render(
      <BulkActionBar selectedCount={2} onClear={onClear} actions={defaultActions} />
    );
    await user.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(onClear).toHaveBeenCalled();
  });
});
