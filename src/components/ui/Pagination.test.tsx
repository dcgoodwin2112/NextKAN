import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { getPageNumbers, Pagination } from "./Pagination";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("getPageNumbers", () => {
  it("returns all pages when totalPages <= 7", () => {
    expect(getPageNumbers(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(getPageNumbers(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("shows right ellipsis when current is near start", () => {
    expect(getPageNumbers(1, 20)).toEqual([1, 2, "ellipsis", 20]);
    expect(getPageNumbers(2, 20)).toEqual([1, 2, 3, "ellipsis", 20]);
  });

  it("shows both ellipses when current is in the middle", () => {
    expect(getPageNumbers(10, 20)).toEqual([
      1,
      "ellipsis",
      9,
      10,
      11,
      "ellipsis",
      20,
    ]);
    expect(getPageNumbers(4, 20)).toEqual([
      1,
      "ellipsis",
      3,
      4,
      5,
      "ellipsis",
      20,
    ]);
  });

  it("shows left ellipsis when current is near end", () => {
    expect(getPageNumbers(19, 20)).toEqual([1, "ellipsis", 18, 19, 20]);
    expect(getPageNumbers(20, 20)).toEqual([1, "ellipsis", 19, 20]);
  });

  it("handles edge case where neighbor touches anchor", () => {
    // current=3: neighbors are 2,3,4 — 2 is adjacent to anchor 1, no left ellipsis
    expect(getPageNumbers(3, 20)).toEqual([1, 2, 3, 4, "ellipsis", 20]);
    // current=18: neighbors are 17,18,19 — 19 is adjacent to anchor 20, no right ellipsis
    expect(getPageNumbers(18, 20)).toEqual([1, "ellipsis", 17, 18, 19, 20]);
  });
});

describe("Pagination component", () => {
  it("renders no ellipsis for small page counts", () => {
    render(<Pagination currentPage={1} totalPages={5} basePath="/test" />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.queryByText("…")).not.toBeInTheDocument();
  });

  it("renders ellipsis for many pages", () => {
    render(<Pagination currentPage={10} totalPages={20} basePath="/test" />);
    const ellipses = screen.getAllByText("…");
    expect(ellipses).toHaveLength(2);
    // Ellipses should not be buttons
    for (const el of ellipses) {
      expect(el.tagName).toBe("SPAN");
      expect(el).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("marks current page with aria-current", () => {
    render(<Pagination currentPage={10} totalPages={20} basePath="/test" />);
    expect(screen.getByText("10")).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("1")).not.toHaveAttribute("aria-current");
  });

  it("returns null when totalPages <= 1", () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={1} basePath="/test" />
    );
    expect(container.innerHTML).toBe("");
  });
});
