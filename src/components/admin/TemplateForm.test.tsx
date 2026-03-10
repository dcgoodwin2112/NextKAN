import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TemplateForm } from "./TemplateForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockOrgs = [{ id: "org-1", name: "Test Org" }];

describe("TemplateForm", () => {
  let onSubmit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    onSubmit = vi.fn().mockResolvedValue(undefined);
  });

  it("renders form fields", () => {
    render(<TemplateForm organizations={mockOrgs} onSubmit={onSubmit} />);
    expect(screen.getByLabelText("Name *")).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
    expect(screen.getByLabelText("Scope")).toBeInTheDocument();
  });

  it("shows validation error for empty name", async () => {
    const user = userEvent.setup();
    render(<TemplateForm organizations={mockOrgs} onSubmit={onSubmit} />);
    await user.click(screen.getByRole("button", { name: "Create Template" }));
    expect(screen.getByText("Template name is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits valid form data", async () => {
    const user = userEvent.setup();
    render(<TemplateForm organizations={mockOrgs} onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText("Name *"), "My Template");
    await user.click(screen.getByRole("button", { name: "Create Template" }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: "My Template" })
    );
  });

  it("shows error toast on submit failure", async () => {
    const { toast } = await import("sonner");
    onSubmit.mockRejectedValueOnce(new Error("Server error"));
    const user = userEvent.setup();
    render(<TemplateForm organizations={mockOrgs} onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText("Name *"), "My Template");
    await user.click(screen.getByRole("button", { name: "Create Template" }));
    expect(toast.error).toHaveBeenCalledWith("Server error");
    expect(screen.getByText("Server error")).toBeInTheDocument();
  });
});
