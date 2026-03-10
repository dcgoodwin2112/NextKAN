import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LicenseForm } from "./LicenseForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("LicenseForm", () => {
  let onSubmit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    onSubmit = vi.fn().mockResolvedValue(undefined);
  });

  it("renders form fields", () => {
    render(<LicenseForm onSubmit={onSubmit} />);
    expect(screen.getByLabelText("Name *")).toBeInTheDocument();
    expect(screen.getByLabelText("URL")).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
  });

  it("shows validation error for empty name", async () => {
    const user = userEvent.setup();
    render(<LicenseForm onSubmit={onSubmit} />);
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(screen.getByText("Name is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits valid form data", async () => {
    const user = userEvent.setup();
    render(<LicenseForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText("Name *"), "CC0 1.0");
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: "CC0 1.0" })
    );
  });

  it("shows error toast on submit failure", async () => {
    const { toast } = await import("sonner");
    onSubmit.mockRejectedValueOnce(new Error("Duplicate name"));
    const user = userEvent.setup();
    render(<LicenseForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText("Name *"), "CC0 1.0");
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(toast.error).toHaveBeenCalledWith("Duplicate name");
    expect(screen.getByText("Duplicate name")).toBeInTheDocument();
  });
});
