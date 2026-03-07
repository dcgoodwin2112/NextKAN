import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TrashActions } from "./TrashActions";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/lib/actions/datasets", () => ({
  restoreDataset: vi.fn().mockResolvedValue(undefined),
  purgeDataset: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("TrashActions", () => {
  it("renders Restore and Purge buttons", () => {
    render(<TrashActions datasetId="ds-1" datasetTitle="Test" />);
    expect(screen.getByRole("button", { name: "Restore" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Purge" })).toBeDefined();
  });

  it("shows confirmation dialog when Purge is clicked", async () => {
    const user = userEvent.setup();
    render(<TrashActions datasetId="ds-1" datasetTitle="Test" />);

    await user.click(screen.getByRole("button", { name: "Purge" }));
    expect(screen.getByText("Permanently delete?")).toBeDefined();
    expect(screen.getByText(/permanently delete/)).toBeDefined();
  });

  it("calls restoreDataset on Restore click", async () => {
    const { restoreDataset } = await import("@/lib/actions/datasets");
    const user = userEvent.setup();
    render(<TrashActions datasetId="ds-1" datasetTitle="Test" />);

    await user.click(screen.getByRole("button", { name: "Restore" }));
    expect(restoreDataset).toHaveBeenCalledWith("ds-1");
  });
});
