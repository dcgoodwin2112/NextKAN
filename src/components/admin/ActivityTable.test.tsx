import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/admin/activity",
  useSearchParams: () => new URLSearchParams(),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.history.replaceState
const replaceStateSpy = vi.fn();
Object.defineProperty(window, "history", {
  writable: true,
  value: { replaceState: replaceStateSpy },
});

import { ActivityTable } from "./ActivityTable";

const mockActivities = [
  {
    id: "act-1",
    action: "dataset:created",
    entityType: "dataset",
    entityId: "ds-1",
    entityName: "Test Dataset",
    userId: "user-1",
    userName: "Admin User",
    details: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: "act-2",
    action: "organization:updated",
    entityType: "organization",
    entityId: "org-1",
    entityName: "Test Org",
    userId: "user-2",
    userName: "Editor",
    details: JSON.stringify({ changes: { name: true, description: true } }),
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

function mockFetchResponse(data: unknown, ok = true) {
  mockFetch.mockResolvedValueOnce({
    ok,
    json: () => Promise.resolve(data),
    blob: () => Promise.resolve(new Blob(["csv-data"], { type: "text/csv" })),
  });
}

describe("ActivityTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset URL
    Object.defineProperty(window, "location", {
      writable: true,
      value: { pathname: "/admin/activity", search: "" },
    });
  });

  it("renders table with activity data", async () => {
    mockFetchResponse({ activities: mockActivities, total: 2 });

    render(<ActivityTable />);

    await waitFor(() => {
      expect(screen.getByText("Admin User")).toBeInTheDocument();
    });

    expect(screen.getByText("Test Dataset")).toBeInTheDocument();
    expect(screen.getByText("Test Org")).toBeInTheDocument();
    expect(screen.getByText("Editor")).toBeInTheDocument();
  });

  it("shows empty state when no activities match", async () => {
    mockFetchResponse({ activities: [], total: 0 });

    render(<ActivityTable />);

    await waitFor(() => {
      expect(screen.getByText("No activity found")).toBeInTheDocument();
    });
  });

  it("changes entity type filter and refetches", async () => {
    mockFetchResponse({ activities: mockActivities, total: 2 });

    render(<ActivityTable />);

    await waitFor(() => {
      expect(screen.getByText("Admin User")).toBeInTheDocument();
    });

    mockFetchResponse({ activities: [mockActivities[0]], total: 1 });

    const user = userEvent.setup();
    const select = screen.getByLabelText("Filter by entity type");
    await user.selectOptions(select, "dataset");

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("entityType=dataset")
      );
    });
  });

  it("changes action filter and refetches", async () => {
    mockFetchResponse({ activities: mockActivities, total: 2 });

    render(<ActivityTable />);

    await waitFor(() => {
      expect(screen.getByText("Admin User")).toBeInTheDocument();
    });

    mockFetchResponse({ activities: [], total: 0 });

    const user = userEvent.setup();
    const select = screen.getByLabelText("Filter by action");
    await user.selectOptions(select, "created");

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("action=created")
      );
    });
  });

  it("renders pagination controls and navigates", async () => {
    mockFetchResponse({ activities: mockActivities, total: 50 });

    render(<ActivityTable />);

    await waitFor(() => {
      expect(screen.getByText(/Showing 1/)).toBeInTheDocument();
    });

    expect(screen.getByText("Previous")).toBeDisabled();
    expect(screen.getByText("Next")).not.toBeDisabled();

    mockFetchResponse({ activities: [], total: 50 });

    const user = userEvent.setup();
    await user.click(screen.getByText("Next"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("offset=20")
      );
    });
  });

  it("triggers CSV export download", async () => {
    mockFetchResponse({ activities: mockActivities, total: 2 });

    render(<ActivityTable />);

    await waitFor(() => {
      expect(screen.getByText("Admin User")).toBeInTheDocument();
    });

    // Mock CSV response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(new Blob(["csv-data"], { type: "text/csv" })),
    });

    const createObjectURL = vi.fn(() => "blob:test");
    const revokeObjectURL = vi.fn();
    global.URL.createObjectURL = createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURL;

    const user = userEvent.setup();
    await user.click(screen.getByText("Export CSV"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("format=csv")
      );
    });
  });

  it("reads userId from URL params on mount", async () => {
    Object.defineProperty(window, "location", {
      writable: true,
      value: { pathname: "/admin/activity", search: "?userId=user-42" },
    });

    // First call: fetch userName for pre-fill
    mockFetchResponse({
      activities: [{ ...mockActivities[0], userName: "Jane Doe" }],
      total: 1,
    });
    // Second call: main fetch with userId filter
    mockFetchResponse({
      activities: [mockActivities[0]],
      total: 1,
    });

    render(<ActivityTable />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("userId=user-42")
      );
    });
  });

  it("renders entity links pointing to admin edit pages", async () => {
    mockFetchResponse({ activities: mockActivities, total: 2 });

    render(<ActivityTable />);

    await waitFor(() => {
      expect(screen.getByText("Test Dataset")).toBeInTheDocument();
    });

    const datasetLink = screen.getByText("Test Dataset").closest("a");
    expect(datasetLink).toHaveAttribute("href", "/admin/datasets/ds-1/edit");

    const orgLink = screen.getByText("Test Org").closest("a");
    expect(orgLink).toHaveAttribute("href", "/admin/organizations/org-1/edit");
  });

  it("parses details JSON and shows changed field names", async () => {
    mockFetchResponse({ activities: mockActivities, total: 2 });

    render(<ActivityTable />);

    await waitFor(() => {
      expect(screen.getByText("name, description")).toBeInTheDocument();
    });
  });
});
