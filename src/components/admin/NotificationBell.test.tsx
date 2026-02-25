import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotificationBell } from "./NotificationBell";

const mockItems = [
  {
    id: "review:ds1",
    type: "review",
    title: "Test Dataset",
    description: "Pending review",
    href: "/admin/datasets/ds1/edit",
    timestamp: new Date().toISOString(),
  },
  {
    id: "harvest:s1",
    type: "harvest",
    title: "Source A",
    description: "Harvest failed",
    href: "/admin/harvest",
    timestamp: new Date().toISOString(),
  },
];

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ items: mockItems, totalCount: 2 }),
  });
});

describe("NotificationBell", () => {
  it("renders bell icon", () => {
    render(<NotificationBell />);
    expect(screen.getByLabelText("Notifications")).toBeDefined();
  });

  it("shows badge with notification count after fetch", async () => {
    render(<NotificationBell />);
    await waitFor(() => {
      expect(screen.getByText("2")).toBeDefined();
    });
  });

  it("shows no badge when no notifications", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [], totalCount: 0 }),
    });
    render(<NotificationBell />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
    expect(screen.queryByText("0")).toBeNull();
  });

  it("opens dropdown with items on click", async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);
    await waitFor(() => {
      expect(screen.getByText("2")).toBeDefined();
    });
    await user.click(screen.getByLabelText("Notifications"));
    expect(screen.getByText("Test Dataset")).toBeDefined();
    expect(screen.getByText("Source A")).toBeDefined();
  });

  it("shows empty state when no items", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [], totalCount: 0 }),
    });
    const user = userEvent.setup();
    render(<NotificationBell />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
    await user.click(screen.getByLabelText("Notifications"));
    expect(screen.getByText("No notifications")).toBeDefined();
  });

  it("dismiss all hides badge count", async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);
    await waitFor(() => {
      expect(screen.getByText("2")).toBeDefined();
    });
    await user.click(screen.getByLabelText("Notifications"));
    await user.click(screen.getByText("Dismiss all"));
    expect(screen.queryByText("2")).toBeNull();
  });

  it("persists dismissed state to localStorage", async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);
    await waitFor(() => {
      expect(screen.getByText("2")).toBeDefined();
    });
    await user.click(screen.getByLabelText("Notifications"));
    await user.click(screen.getByText("Dismiss all"));
    const stored = JSON.parse(
      localStorage.getItem("nextkan-dismissed-notifications")!
    );
    expect(stored).toContain("review:ds1");
    expect(stored).toContain("harvest:s1");
  });

  it("caps badge at 9+", async () => {
    const manyItems = Array.from({ length: 12 }, (_, i) => ({
      id: `review:ds${i}`,
      type: "review",
      title: `Dataset ${i}`,
      description: "Pending review",
      href: `/admin/datasets/ds${i}/edit`,
      timestamp: new Date().toISOString(),
    }));
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: manyItems, totalCount: 12 }),
    });
    render(<NotificationBell />);
    await waitFor(() => {
      expect(screen.getByText("9+")).toBeDefined();
    });
  });
});
