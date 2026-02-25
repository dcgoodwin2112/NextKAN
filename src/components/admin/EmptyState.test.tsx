import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders the title", () => {
    render(<EmptyState title="No datasets yet" />);
    expect(screen.getByText("No datasets yet")).toBeDefined();
  });

  it("renders the description when provided", () => {
    render(
      <EmptyState title="No datasets" description="Create your first dataset." />
    );
    expect(screen.getByText("Create your first dataset.")).toBeDefined();
  });

  it("does not render description when omitted", () => {
    const { container } = render(<EmptyState title="No datasets" />);
    expect(container.querySelectorAll("p")).toHaveLength(0);
  });

  it("renders action link when actionLabel and actionHref are provided", () => {
    render(
      <EmptyState
        title="No datasets"
        actionLabel="New Dataset"
        actionHref="/admin/datasets/new"
      />
    );
    const link = screen.getByRole("link", { name: "New Dataset" });
    expect(link).toBeDefined();
    expect(link.getAttribute("href")).toBe("/admin/datasets/new");
  });

  it("does not render action link when only actionLabel is provided", () => {
    render(<EmptyState title="No datasets" actionLabel="New Dataset" />);
    expect(screen.queryByRole("link", { name: "New Dataset" })).toBeNull();
  });
});
