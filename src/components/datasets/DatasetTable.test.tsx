import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DatasetTable } from "./DatasetTable";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const datasets = [
  {
    id: "d1",
    title: "Test Dataset",
    status: "published",
    modified: new Date("2025-01-15"),
    publisher: { name: "Test Org" },
    distributions: [{ format: "CSV" }, { format: "JSON" }, { format: "CSV" }],
  },
  {
    id: "d2",
    title: "Draft Dataset",
    status: "draft",
    modified: new Date("2025-02-01"),
    publisher: { name: "Other Org" },
    distributions: [],
  },
];

describe("DatasetTable", () => {
  it("renders table headers", () => {
    render(<DatasetTable datasets={datasets} />);
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Organization")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Formats")).toBeInTheDocument();
    expect(screen.getByText("Modified")).toBeInTheDocument();
  });

  it("renders dataset rows with correct data", () => {
    render(<DatasetTable datasets={datasets} />);
    expect(screen.getByText("Test Dataset")).toBeInTheDocument();
    expect(screen.getByText("Test Org")).toBeInTheDocument();
    expect(screen.getByText("Draft Dataset")).toBeInTheDocument();
    expect(screen.getByText("Other Org")).toBeInTheDocument();
  });

  it("title links to admin edit page", () => {
    render(<DatasetTable datasets={datasets} />);
    const link = screen.getByText("Test Dataset").closest("a");
    expect(link).toHaveAttribute("href", "/admin/datasets/d1/edit");
  });

  it("shows status badges", () => {
    render(<DatasetTable datasets={datasets} />);
    expect(screen.getByText("published")).toBeInTheDocument();
    expect(screen.getByText("draft")).toBeInTheDocument();
  });

  it("shows unique format badges", () => {
    render(<DatasetTable datasets={datasets} />);
    // CSV should appear once (deduped), JSON once
    const csvBadges = screen.getAllByText("CSV");
    expect(csvBadges).toHaveLength(1);
    expect(screen.getByText("JSON")).toBeInTheDocument();
  });
});
