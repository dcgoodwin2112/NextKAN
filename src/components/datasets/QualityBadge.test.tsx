import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { QualityBadge } from "./QualityBadge";

describe("QualityBadge", () => {
  it("renders A badge for scores >= 90", () => {
    render(<QualityBadge score={95} />);
    expect(screen.getByText("A")).toBeDefined();
    expect(screen.getByText("(95%)")).toBeDefined();
  });

  it("renders B badge for scores 80-89", () => {
    render(<QualityBadge score={85} />);
    expect(screen.getByText("B")).toBeDefined();
  });

  it("renders C badge for scores 70-79", () => {
    render(<QualityBadge score={75} />);
    expect(screen.getByText("C")).toBeDefined();
  });

  it("renders D badge for scores 60-69", () => {
    render(<QualityBadge score={65} />);
    expect(screen.getByText("D")).toBeDefined();
  });

  it("renders F badge for scores < 60", () => {
    render(<QualityBadge score={20} />);
    expect(screen.getByText("F")).toBeDefined();
  });

  it("hides score when showScore is false", () => {
    render(<QualityBadge score={85} showScore={false} />);
    expect(screen.getByText("B")).toBeDefined();
    expect(screen.queryByText("(85%)")).toBeNull();
  });

  it("shows title with score and grade", () => {
    const { container } = render(<QualityBadge score={75} />);
    const badge = container.querySelector("span");
    expect(badge?.getAttribute("title")).toBe("Data quality: 75/100 (C)");
  });
});
