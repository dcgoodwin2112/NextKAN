import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { QualityBadge } from "./QualityBadge";

describe("QualityBadge", () => {
  it("renders Gold badge for high scores", () => {
    render(<QualityBadge score={85} />);
    expect(screen.getByText("Gold")).toBeDefined();
    expect(screen.getByText("(85)")).toBeDefined();
  });

  it("renders Silver badge for medium scores", () => {
    render(<QualityBadge score={65} />);
    expect(screen.getByText("Silver")).toBeDefined();
  });

  it("renders Bronze badge for low-medium scores", () => {
    render(<QualityBadge score={45} />);
    expect(screen.getByText("Bronze")).toBeDefined();
  });

  it("renders Needs Improvement for low scores", () => {
    render(<QualityBadge score={20} />);
    expect(screen.getByText("Needs Improvement")).toBeDefined();
  });

  it("hides score when showScore is false", () => {
    render(<QualityBadge score={85} showScore={false} />);
    expect(screen.getByText("Gold")).toBeDefined();
    expect(screen.queryByText("(85)")).toBeNull();
  });

  it("shows title with score", () => {
    const { container } = render(<QualityBadge score={75} />);
    const badge = container.querySelector("span");
    expect(badge?.getAttribute("title")).toBe("Data quality: 75/100");
  });
});
