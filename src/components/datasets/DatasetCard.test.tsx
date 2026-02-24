import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DatasetCard } from "./DatasetCard";

const mockDataset = {
  id: "a1b2c3d4-e5f6-1234-a567-123456789abc",
  title: "Census Population Data",
  slug: "census-population-data",
  description:
    "Annual census population data for all counties in the United States, including demographic breakdowns.",
  status: "published",
  modified: new Date("2024-06-15"),
  publisher: { name: "Department of Commerce" },
  keywords: [
    { keyword: "census" },
    { keyword: "population" },
    { keyword: "demographics" },
  ],
  distributions: [
    { format: "CSV" },
    { format: "JSON" },
    { format: "CSV" },
  ],
};

describe("DatasetCard", () => {
  it("renders title as link to /datasets/{slug}", () => {
    render(<DatasetCard dataset={mockDataset} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/datasets/census-population-data");
    expect(screen.getByText("Census Population Data")).toBeInTheDocument();
  });

  it("displays publisher name", () => {
    render(<DatasetCard dataset={mockDataset} />);
    expect(screen.getByText("Department of Commerce")).toBeInTheDocument();
  });

  it("renders keyword badges", () => {
    render(<DatasetCard dataset={mockDataset} />);
    expect(screen.getByText("census")).toBeInTheDocument();
    expect(screen.getByText("population")).toBeInTheDocument();
    expect(screen.getByText("demographics")).toBeInTheDocument();
  });

  it("renders unique format badges from distributions", () => {
    render(<DatasetCard dataset={mockDataset} />);
    const csvBadges = screen.getAllByText("CSV");
    expect(csvBadges).toHaveLength(1); // deduped
    expect(screen.getByText("JSON")).toBeInTheDocument();
  });

  it("truncates long descriptions", () => {
    const longDesc =
      "A".repeat(200);
    render(
      <DatasetCard
        dataset={{ ...mockDataset, description: longDesc }}
      />
    );

    expect(screen.getByText(/\.\.\.$/)).toBeInTheDocument();
  });

  it("shows status badge in admin view", () => {
    render(<DatasetCard dataset={mockDataset} adminView />);
    expect(screen.getByText("published")).toBeInTheDocument();
  });

  it("does not show status badge in public view", () => {
    render(<DatasetCard dataset={mockDataset} />);
    expect(screen.queryByText("published")).not.toBeInTheDocument();
  });

  it("links to admin edit page in admin view", () => {
    render(<DatasetCard dataset={mockDataset} adminView />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute(
      "href",
      `/admin/datasets/${mockDataset.id}/edit`
    );
  });
});
