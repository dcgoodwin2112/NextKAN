import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PublicDatasetCard } from "./PublicDatasetCard";

const mockDataset = {
  id: "a1b2c3d4-e5f6-1234-a567-123456789abc",
  title: "Census Population Data",
  slug: "census-population-data",
  description: "Annual census population data for all counties.",
  modified: new Date("2024-06-15T00:00:00Z"),
  publisher: { name: "Department of Commerce" },
  distributions: [
    { format: "CSV" },
    { format: "JSON" },
    { format: "CSV" },
    { format: "PDF" },
    { format: "XML" },
  ],
  keywords: [{ keyword: "census" }],
};

describe("PublicDatasetCard", () => {
  it("renders title and links to dataset page", () => {
    render(<PublicDatasetCard dataset={mockDataset} />);
    expect(screen.getByText("Census Population Data")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/datasets/census-population-data"
    );
  });

  it("renders truncated description for long text", () => {
    const longDesc = "A".repeat(200);
    render(
      <PublicDatasetCard
        dataset={{ ...mockDataset, description: longDesc }}
      />
    );
    expect(screen.getByText(/\.\.\.$/)).toBeInTheDocument();
  });

  it("renders publisher name", () => {
    render(<PublicDatasetCard dataset={mockDataset} />);
    expect(screen.getByText("Department of Commerce")).toBeInTheDocument();
  });

  it("renders up to 3 unique format badges", () => {
    render(<PublicDatasetCard dataset={mockDataset} />);
    expect(screen.getByText("CSV")).toBeInTheDocument();
    expect(screen.getByText("JSON")).toBeInTheDocument();
    expect(screen.getByText("PDF")).toBeInTheDocument();
    expect(screen.queryByText("XML")).not.toBeInTheDocument();
  });

  it("shows overflow count when more than 3 formats", () => {
    render(<PublicDatasetCard dataset={mockDataset} />);
    expect(screen.getByText("+1")).toBeInTheDocument();
  });

  it("renders formatted date", () => {
    render(<PublicDatasetCard dataset={mockDataset} />);
    expect(screen.getByText(/Jun 15, 2024/)).toBeInTheDocument();
  });
});
