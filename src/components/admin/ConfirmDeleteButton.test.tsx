import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDeleteButton } from "./ConfirmDeleteButton";

describe("ConfirmDeleteButton", () => {
  it("renders a Delete button", () => {
    render(<ConfirmDeleteButton entityName="this dataset" onConfirm={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Delete" })).toBeDefined();
  });

  it("opens confirmation dialog on click", async () => {
    const user = userEvent.setup();
    render(<ConfirmDeleteButton entityName="this dataset" onConfirm={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByText("Are you sure?")).toBeDefined();
    expect(screen.getByText(/permanently delete this dataset/)).toBeDefined();
  });

  it("calls onConfirm when confirmed", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<ConfirmDeleteButton entityName="this item" onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "Delete" }));
    // Dialog has two "Delete" buttons — the trigger and the confirm action
    const buttons = screen.getAllByRole("button", { name: "Delete" });
    const confirmButton = buttons[buttons.length - 1];
    await user.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("does not call onConfirm when cancelled", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<ConfirmDeleteButton entityName="this item" onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("shows soft delete wording when softDelete is true", async () => {
    const user = userEvent.setup();
    render(
      <ConfirmDeleteButton entityName="this dataset" onConfirm={vi.fn()} softDelete />
    );

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByText(/move this dataset to the trash/)).toBeDefined();
    expect(screen.getByRole("button", { name: "Move to Trash" })).toBeDefined();
  });

  it("shows permanent delete wording by default", async () => {
    const user = userEvent.setup();
    render(
      <ConfirmDeleteButton entityName="this item" onConfirm={vi.fn()} />
    );

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByText(/permanently delete this item/)).toBeDefined();
  });
});
