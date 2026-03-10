import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MarkdownEditor } from "./MarkdownEditor";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("./ChartPickerDialog", () => ({
  ChartPickerDialog: () => null,
}));

describe("MarkdownEditor", () => {
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    onChange = vi.fn();
  });

  it("renders editor with mode buttons", () => {
    render(<MarkdownEditor value="" onChange={onChange} />);
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Split" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preview" })).toBeInTheDocument();
  });

  it("shows error toast on image upload failure", async () => {
    const { toast } = await import("sonner");
    global.fetch = vi.fn().mockRejectedValueOnce(new Error("Network error"));

    const user = userEvent.setup();
    render(<MarkdownEditor value="" onChange={onChange} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["test"], "test.png", { type: "image/png" });
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Image upload failed");
    });
  });
});
