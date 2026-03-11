import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActiveFilters } from "./ActiveFilters";

const mockPush = vi.fn();
let currentParams = "org=abc&theme=health";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(currentParams),
}));

const facets = [
  {
    key: "org",
    name: "Organization",
    values: [{ value: "abc", label: "Dept A", count: 5 }],
  },
  {
    key: "theme",
    name: "Theme",
    values: [{ value: "health", label: "Health", count: 3 }],
  },
];

describe("ActiveFilters", () => {
  beforeEach(() => {
    mockPush.mockClear();
    currentParams = "org=abc&theme=health";
  });

  it("renders badges for active filters", () => {
    render(<ActiveFilters facets={facets} />);
    expect(screen.getByText("Dept A")).toBeInTheDocument();
    expect(screen.getByText("Health")).toBeInTheDocument();
  });

  it("renders remove buttons with aria-labels", () => {
    render(<ActiveFilters facets={facets} />);
    expect(
      screen.getByRole("button", { name: "Remove filter: Dept A" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove filter: Health" })
    ).toBeInTheDocument();
  });

  it("removes filter on click", async () => {
    const user = userEvent.setup();
    render(<ActiveFilters facets={facets} />);

    await user.click(
      screen.getByRole("button", { name: "Remove filter: Dept A" })
    );
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("theme=health")
    );
  });

  it("removes filter on keyboard activation (Enter)", async () => {
    const user = userEvent.setup();
    render(<ActiveFilters facets={facets} />);

    const btn = screen.getByRole("button", { name: "Remove filter: Health" });
    btn.focus();
    await user.keyboard("{Enter}");
    expect(mockPush).toHaveBeenCalled();
  });

  it("clears all filters on Clear all button", async () => {
    const user = userEvent.setup();
    render(<ActiveFilters facets={facets} />);

    await user.click(screen.getByText("Clear all"));
    expect(mockPush).toHaveBeenCalledWith("/datasets");
  });

  it("returns null when no active filters", () => {
    currentParams = "";
    const { container } = render(<ActiveFilters facets={facets} />);
    expect(container.firstChild).toBeNull();
  });
});
