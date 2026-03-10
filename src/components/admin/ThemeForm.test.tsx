import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeForm } from "./ThemeForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("ThemeForm", () => {
  let onSubmit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    onSubmit = vi.fn().mockResolvedValue(undefined);
  });

  it("renders form fields", () => {
    render(<ThemeForm onSubmit={onSubmit} />);
    expect(screen.getByLabelText("Name *")).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
  });

  it("shows validation error for empty name", async () => {
    const user = userEvent.setup();
    render(<ThemeForm onSubmit={onSubmit} />);
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(screen.getByText("Name is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits valid form data", async () => {
    const user = userEvent.setup();
    render(<ThemeForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText("Name *"), "Transportation");
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Transportation" })
    );
  });

  it("shows error toast on submit failure", async () => {
    const { toast } = await import("sonner");
    onSubmit.mockRejectedValueOnce(new Error("Server error"));
    const user = userEvent.setup();
    render(<ThemeForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText("Name *"), "Transportation");
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(toast.error).toHaveBeenCalledWith("Server error");
    expect(screen.getByText("Server error")).toBeInTheDocument();
  });

  it("populates form when editing", () => {
    render(
      <ThemeForm
        initialData={{ id: "t-1", name: "Health", description: "Health data", color: "#ff0000" }}
        onSubmit={onSubmit}
      />
    );
    expect(screen.getByLabelText("Name *")).toHaveValue("Health");
    expect(screen.getByLabelText("Description")).toHaveValue("Health data");
  });
});
