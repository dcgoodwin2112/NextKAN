import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminSidebar } from "./AdminSidebar";
import {
  AdminSidebarProvider,
  useAdminSidebar,
} from "@/lib/admin-sidebar-context";

const mockPathname = vi.fn().mockReturnValue("/admin");
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

/** Helper to open the sidebar from outside */
function OpenButton() {
  const { setOpen } = useAdminSidebar();
  return (
    <button data-testid="open-btn" onClick={() => setOpen(true)}>
      Open
    </button>
  );
}

function renderSidebar(props: { userRole?: string; defaultOpen?: boolean } = {}) {
  const { userRole = "admin", defaultOpen } = props;

  const result = render(
    <AdminSidebarProvider>
      <OpenButton />
      <AdminSidebar userRole={userRole} />
    </AdminSidebarProvider>
  );

  if (defaultOpen) {
    fireEvent.click(screen.getByTestId("open-btn"));
  }

  return result;
}

describe("AdminSidebar", () => {
  beforeEach(() => {
    mockPathname.mockReturnValue("/admin");
  });

  it("renders nav items for admin role", () => {
    renderSidebar({ userRole: "admin" });
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Datasets")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Custom Fields")).toBeInTheDocument();
  });

  it("hides role-restricted items for non-admin", () => {
    renderSidebar({ userRole: "editor" });
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Datasets")).toBeInTheDocument();
    expect(screen.queryByText("Users")).not.toBeInTheDocument();
    expect(screen.queryByText("Settings")).not.toBeInTheDocument();
    expect(screen.queryByText("Custom Fields")).not.toBeInTheDocument();
  });

  it("highlights active nav item", () => {
    mockPathname.mockReturnValue("/admin/datasets");
    renderSidebar();
    const datasetsLink = screen.getByText("Datasets").closest("a");
    expect(datasetsLink?.className).toContain("bg-sidebar-primary/10");
  });

  it("sidebar hidden by default on mobile", () => {
    renderSidebar();
    const aside = screen.getByRole("navigation", { name: "Admin" });
    expect(aside.className).toContain("-translate-x-full");
  });

  it("sidebar visible when context open", () => {
    renderSidebar({ defaultOpen: true });
    const aside = screen.getByRole("navigation", { name: "Admin" });
    expect(aside.className).toContain("translate-x-0");
    expect(aside.className).not.toContain("-translate-x-full");
  });

  it("renders backdrop when open", () => {
    renderSidebar({ defaultOpen: true });
    expect(screen.getByTestId("sidebar-backdrop")).toBeInTheDocument();
  });

  it("clicking backdrop closes sidebar", () => {
    renderSidebar({ defaultOpen: true });
    fireEvent.click(screen.getByTestId("sidebar-backdrop"));
    const aside = screen.getByRole("navigation", { name: "Admin" });
    expect(aside.className).toContain("-translate-x-full");
    expect(screen.queryByTestId("sidebar-backdrop")).not.toBeInTheDocument();
  });

  it("clicking nav link does not close sidebar on desktop", () => {
    renderSidebar({ defaultOpen: true });
    fireEvent.click(screen.getByText("Datasets"));
    const aside = screen.getByRole("navigation", { name: "Admin" });
    expect(aside.className).toContain("translate-x-0");
  });

  it("sidebar is inert when closed", () => {
    renderSidebar();
    const aside = screen.getByRole("navigation", { name: "Admin", hidden: true });
    expect(aside).toHaveAttribute("inert");
  });

  it("sidebar is not inert when open", () => {
    renderSidebar({ defaultOpen: true });
    const aside = screen.getByRole("navigation", { name: "Admin" });
    expect(aside).not.toHaveAttribute("inert");
  });
});
