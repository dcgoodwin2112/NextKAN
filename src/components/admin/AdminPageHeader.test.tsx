import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminPageHeader } from "./AdminPageHeader";

describe("AdminPageHeader", () => {
  it("renders the title", () => {
    render(<AdminPageHeader title="Datasets" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Datasets");
  });

  it("renders the description when provided", () => {
    render(<AdminPageHeader title="Datasets" description="Manage your datasets" />);
    expect(screen.getByText("Manage your datasets")).toBeDefined();
  });

  it("does not render description when omitted", () => {
    const { container } = render(<AdminPageHeader title="Datasets" />);
    expect(container.querySelectorAll("p")).toHaveLength(0);
  });

  it("renders children in the actions slot", () => {
    render(
      <AdminPageHeader title="Datasets">
        <button>New Dataset</button>
      </AdminPageHeader>
    );
    expect(screen.getByRole("button", { name: "New Dataset" })).toBeDefined();
  });
});
