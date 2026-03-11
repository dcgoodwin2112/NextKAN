import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminHeader } from "./AdminHeader";
import { AdminSidebarProvider, useAdminSidebar } from "@/lib/admin-sidebar-context";

vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));

vi.mock("@/components/theme/ThemeToggle", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

vi.mock("@/components/admin/NotificationBell", () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));

const testUser = { name: "Test Admin", email: "admin@example.com" };

function renderHeader() {
  return render(
    <AdminSidebarProvider>
      <AdminHeader user={testUser} />
      <SidebarStateReader />
    </AdminSidebarProvider>
  );
}

/** Helper component to read sidebar open state */
function SidebarStateReader() {
  const { open } = useAdminSidebar();
  return <span data-testid="sidebar-open">{String(open)}</span>;
}

describe("AdminHeader", () => {
  it("renders user name", () => {
    renderHeader();
    expect(screen.getByText("Test Admin")).toBeInTheDocument();
  });

  it("renders hamburger button", () => {
    renderHeader();
    expect(screen.getByLabelText("Toggle sidebar menu")).toBeInTheDocument();
  });

  it("clicking hamburger opens sidebar", () => {
    renderHeader();
    expect(screen.getByTestId("sidebar-open").textContent).toBe("false");
    fireEvent.click(screen.getByLabelText("Toggle sidebar menu"));
    expect(screen.getByTestId("sidebar-open").textContent).toBe("true");
  });

  it("renders logo link to home", () => {
    renderHeader();
    const logo = screen.getByText("NextKAN");
    expect(logo.closest("a")).toHaveAttribute("href", "/");
  });

  it("renders skip nav link", () => {
    renderHeader();
    const skipLink = screen.getByText("Skip to main content");
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute("href", "#main-content");
  });
});
