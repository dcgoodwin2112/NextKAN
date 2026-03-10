import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { DistributionForm } from "./DistributionForm";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("DistributionForm", () => {
  let mockOnAdd: ReturnType<typeof vi.fn>;
  let mockOnCancel: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAdd = vi.fn();
    mockOnCancel = vi.fn();
    global.fetch = vi.fn();
  });

  it("shows toast on successful file upload", async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          publicUrl: "https://example.com/file.csv",
          mediaType: "text/csv",
          filePath: "/uploads/file.csv",
          fileName: "file.csv",
          fileSize: 1024,
        }),
    });

    render(<DistributionForm onAdd={mockOnAdd} onCancel={mockOnCancel} />);

    const file = new File(["data"], "file.csv", { type: "text/csv" });
    const input = screen.getByLabelText(/upload file/i);
    await user.upload(input, file);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("File uploaded");
    });
  });

  it("shows toast on upload server error", async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "File too large" }),
    });

    render(<DistributionForm onAdd={mockOnAdd} onCancel={mockOnCancel} />);

    const file = new File(["data"], "big.csv", { type: "text/csv" });
    const input = screen.getByLabelText(/upload file/i);
    await user.upload(input, file);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("File too large");
    });
  });

  it("shows toast on upload network error", async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));

    render(<DistributionForm onAdd={mockOnAdd} onCancel={mockOnCancel} />);

    const file = new File(["data"], "file.csv", { type: "text/csv" });
    const input = screen.getByLabelText(/upload file/i);
    await user.upload(input, file);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Upload failed");
    });
  });

  it("validates that download or access URL is required", async () => {
    const user = userEvent.setup();
    render(<DistributionForm onAdd={mockOnAdd} onCancel={mockOnCancel} />);

    await user.click(screen.getByText("Add Distribution"));

    expect(screen.getByText(/either download url or access url is required/i)).toBeInTheDocument();
    expect(mockOnAdd).not.toHaveBeenCalled();
  });
});
