import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Breadcrumbs } from "./Breadcrumbs";

describe("Breadcrumbs", () => {
  it("renders all items", () => {
    render(
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Datasets", href: "/admin/datasets" },
          { label: "Edit Dataset" },
        ]}
      />
    );
    expect(screen.getByText("Admin")).toBeDefined();
    expect(screen.getByText("Datasets")).toBeDefined();
    expect(screen.getByText("Edit Dataset")).toBeDefined();
  });

  it("renders linked items as links", () => {
    render(
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Edit" },
        ]}
      />
    );
    const link = screen.getByRole("link", { name: "Admin" });
    expect(link).toBeDefined();
    expect(link.getAttribute("href")).toBe("/admin");
  });

  it("renders last item as plain text (not linked)", () => {
    render(
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Edit Dataset" },
        ]}
      />
    );
    expect(screen.queryByRole("link", { name: "Edit Dataset" })).toBeNull();
    expect(screen.getByText("Edit Dataset")).toBeDefined();
  });

  it("has correct aria-label for accessibility", () => {
    render(
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Page" }]} />
    );
    expect(screen.getByLabelText("Breadcrumb")).toBeDefined();
  });

  it("marks last item with aria-current=page", () => {
    render(
      <Breadcrumbs
        items={[{ label: "Admin", href: "/admin" }, { label: "Page" }]}
      />
    );
    const lastItem = screen.getByText("Page");
    expect(lastItem.getAttribute("aria-current")).toBe("page");
  });
});
