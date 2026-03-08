import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { OrganizationTable } from "./OrganizationTable";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const organizations = [
  {
    id: "org-1",
    name: "Department of Health",
    description: "Manages public health data",
    _count: { datasets: 12 },
  },
  {
    id: "org-2",
    name: "Transit Authority",
    description: null,
    _count: { datasets: 0 },
  },
];

describe("OrganizationTable", () => {
  it("renders table headers", () => {
    render(<OrganizationTable organizations={organizations} />);
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("Datasets")).toBeInTheDocument();
  });

  it("renders organization rows with correct data", () => {
    render(<OrganizationTable organizations={organizations} />);
    expect(screen.getByText("Department of Health")).toBeInTheDocument();
    expect(screen.getByText("Manages public health data")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Transit Authority")).toBeInTheDocument();
  });

  it("name links to admin org dashboard", () => {
    render(<OrganizationTable organizations={organizations} />);
    const link = screen.getByText("Department of Health").closest("a");
    expect(link).toHaveAttribute("href", "/admin/organizations/org-1");
  });

  it("shows dash for missing description and parent", () => {
    render(<OrganizationTable organizations={organizations} />);
    const dashes = screen.getAllByText("—");
    // Both orgs have no parent (2 dashes) + org-2 has null description (1 dash)
    expect(dashes.length).toBe(3);
  });

  it("renders Parent column header", () => {
    render(<OrganizationTable organizations={organizations} />);
    expect(screen.getByText("Parent")).toBeInTheDocument();
  });

  it("truncates long descriptions", () => {
    const longDesc = "A".repeat(150);
    const orgs = [{ id: "org-3", name: "Long Org", description: longDesc, _count: { datasets: 1 } }];
    render(<OrganizationTable organizations={orgs} />);
    expect(screen.getByText("A".repeat(100) + "...")).toBeInTheDocument();
  });
});
