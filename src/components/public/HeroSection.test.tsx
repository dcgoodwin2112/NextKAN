import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { HeroSection } from "./HeroSection";

vi.mock("@/components/ui/SearchBar", () => ({
  SearchBar: ({ placeholder }: { placeholder: string }) => (
    <input placeholder={placeholder} />
  ),
}));

describe("HeroSection", () => {
  it("renders h1 with title", () => {
    render(
      <HeroSection title="Open Data" subtitle="Find data" datasetCount={42} />
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Open Data" })
    ).toBeInTheDocument();
  });

  it("renders subtitle text", () => {
    render(
      <HeroSection title="Open Data" subtitle="Find data" datasetCount={42} />
    );
    expect(screen.getByText("Find data")).toBeInTheDocument();
  });

  it("renders dataset count", () => {
    render(
      <HeroSection title="Open Data" subtitle="Find data" datasetCount={42} />
    );
    expect(screen.getByText("42 datasets available")).toBeInTheDocument();
  });

  it("renders search bar", () => {
    render(
      <HeroSection title="Open Data" subtitle="Find data" datasetCount={0} />
    );
    expect(
      screen.getByPlaceholderText("Search datasets...")
    ).toBeInTheDocument();
  });

  it("pluralizes correctly for 1 dataset", () => {
    render(
      <HeroSection title="Open Data" subtitle="Find data" datasetCount={1} />
    );
    expect(screen.getByText("1 dataset available")).toBeInTheDocument();
  });
});
