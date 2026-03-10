import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PageReorderButtons } from "./PageReorderButtons";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/actions/pages", () => ({
  reorderPages: vi.fn(),
}));

describe("PageReorderButtons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders up and down buttons", () => {
    render(<PageReorderButtons pageId="p-1" isFirst={false} isLast={false} />);
    expect(screen.getByRole("button", { name: "Move up" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Move down" })).toBeInTheDocument();
  });

  it("disables up button when first", () => {
    render(<PageReorderButtons pageId="p-1" isFirst={true} isLast={false} />);
    expect(screen.getByRole("button", { name: "Move up" })).toBeDisabled();
  });

  it("disables down button when last", () => {
    render(<PageReorderButtons pageId="p-1" isFirst={false} isLast={true} />);
    expect(screen.getByRole("button", { name: "Move down" })).toBeDisabled();
  });

  it("shows error toast on reorder failure", async () => {
    const { toast } = await import("sonner");
    const { reorderPages } = await import("@/lib/actions/pages");
    (reorderPages as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("DB error"));

    const user = userEvent.setup();
    render(<PageReorderButtons pageId="p-1" isFirst={false} isLast={false} />);
    await user.click(screen.getByRole("button", { name: "Move up" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to reorder pages");
    });
  });
});
