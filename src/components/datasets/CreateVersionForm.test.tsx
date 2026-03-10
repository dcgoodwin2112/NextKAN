import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateVersionForm } from "./CreateVersionForm";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("CreateVersionForm", () => {
  let onSubmit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    onSubmit = vi.fn().mockResolvedValue(undefined);
  });

  it("renders form fields", () => {
    render(<CreateVersionForm onSubmit={onSubmit} />);
    expect(screen.getByLabelText("Revision Label")).toBeInTheDocument();
    expect(screen.getByLabelText("Changelog (optional)")).toBeInTheDocument();
  });

  it("shows validation error for empty version", async () => {
    const user = userEvent.setup();
    render(<CreateVersionForm onSubmit={onSubmit} />);
    await user.click(screen.getByRole("button", { name: "Create Version" }));
    expect(screen.getByText("Revision label is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits valid form", async () => {
    const user = userEvent.setup();
    render(<CreateVersionForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText("Revision Label"), "1.0.0");
    await user.click(screen.getByRole("button", { name: "Create Version" }));
    expect(onSubmit).toHaveBeenCalledWith("1.0.0", undefined);
  });

  it("shows error toast on submit failure", async () => {
    const { toast } = await import("sonner");
    onSubmit.mockRejectedValueOnce(new Error("Version exists"));
    const user = userEvent.setup();
    render(<CreateVersionForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText("Revision Label"), "1.0.0");
    await user.click(screen.getByRole("button", { name: "Create Version" }));
    expect(toast.error).toHaveBeenCalledWith("Version exists");
    expect(screen.getByText("Version exists")).toBeInTheDocument();
  });
});
