import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("renders the status text", () => {
    render(<StatusBadge status="published" />);
    expect(screen.getByText("published")).toBeInTheDocument();
  });

  it("renders custom label when provided", () => {
    render(<StatusBadge status="pending_review" label="Pending Review" />);
    expect(screen.getByText("Pending Review")).toBeInTheDocument();
  });

  it("applies success colors for published status", () => {
    render(<StatusBadge status="published" />);
    const badge = screen.getByText("published");
    expect(badge.className).toContain("bg-success-subtle");
    expect(badge.className).toContain("text-success-text");
  });

  it("applies warning colors for draft status", () => {
    render(<StatusBadge status="draft" />);
    const badge = screen.getByText("draft");
    expect(badge.className).toContain("bg-warning-subtle");
    expect(badge.className).toContain("text-warning-text");
  });

  it("applies danger colors for rejected status", () => {
    render(<StatusBadge status="rejected" />);
    const badge = screen.getByText("rejected");
    expect(badge.className).toContain("bg-danger-subtle");
    expect(badge.className).toContain("text-danger-text");
  });

  it("applies neutral colors for archived status", () => {
    render(<StatusBadge status="archived" />);
    const badge = screen.getByText("archived");
    expect(badge.className).toContain("bg-surface-alt");
    expect(badge.className).toContain("text-text-tertiary");
  });

  it("falls back to outline variant for unknown status", () => {
    render(<StatusBadge status="unknown" />);
    const badge = screen.getByText("unknown");
    expect(badge).toHaveAttribute("data-variant", "outline");
  });

  it("applies additional className", () => {
    render(<StatusBadge status="published" className="ml-2" />);
    const badge = screen.getByText("published");
    expect(badge.className).toContain("ml-2");
  });

  it.each(["active", "success", "approved"])("applies success colors for %s", (status) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(status).className).toContain("bg-success-subtle");
  });

  it.each(["pending", "partial", "pending_review"])("applies warning colors for %s", (status) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(status).className).toContain("bg-warning-subtle");
  });

  it.each(["failed", "error"])("applies danger colors for %s", (status) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(status).className).toContain("bg-danger-subtle");
  });

  it("applies neutral colors for disabled status", () => {
    render(<StatusBadge status="disabled" />);
    expect(screen.getByText("disabled").className).toContain("bg-surface-alt");
  });
});
