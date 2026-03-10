import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SeriesForm } from "./SeriesForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("SeriesForm", () => {
  let onSubmit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    onSubmit = vi.fn().mockResolvedValue(undefined);
  });

  it("renders form fields", () => {
    render(<SeriesForm onSubmit={onSubmit} />);
    expect(screen.getByLabelText("Title *")).toBeInTheDocument();
    expect(screen.getByLabelText("Identifier *")).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
  });

  it("shows validation error for empty title", async () => {
    const user = userEvent.setup();
    render(<SeriesForm onSubmit={onSubmit} />);
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(screen.getByText("Title is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits valid form data", async () => {
    const user = userEvent.setup();
    render(<SeriesForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText("Title *"), "Climate Annual");
    await user.type(screen.getByLabelText("Identifier *"), "climate-annual");
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Climate Annual", identifier: "climate-annual" })
    );
  });

  it("shows error toast on submit failure", async () => {
    const { toast } = await import("sonner");
    onSubmit.mockRejectedValueOnce(new Error("Duplicate identifier"));
    const user = userEvent.setup();
    render(<SeriesForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText("Title *"), "Climate Annual");
    await user.type(screen.getByLabelText("Identifier *"), "climate-annual");
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(toast.error).toHaveBeenCalledWith("Duplicate identifier");
    expect(screen.getByText("Duplicate identifier")).toBeInTheDocument();
  });
});
