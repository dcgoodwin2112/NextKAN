import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiTokenSection } from "./ApiTokenSection";

// Mock sonner
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock clipboard
const mockWriteText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, "clipboard", {
  writable: true,
  configurable: true,
  value: { writeText: mockWriteText },
});

beforeEach(() => {
  vi.resetAllMocks();
});

const tokens = [
  {
    id: "t1",
    name: "CI Token",
    prefix: "nkan_abc1",
    createdAt: "2024-01-15T00:00:00.000Z",
    lastUsedAt: "2024-06-01T00:00:00.000Z",
    expiresAt: null,
  },
  {
    id: "t2",
    name: "Dev Token",
    prefix: "nkan_def2",
    createdAt: "2024-03-01T00:00:00.000Z",
    lastUsedAt: null,
    expiresAt: "2025-03-01T00:00:00.000Z",
  },
];

describe("ApiTokenSection", () => {
  it("renders token list", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(tokens),
    });

    render(<ApiTokenSection userId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText("CI Token")).toBeInTheDocument();
      expect(screen.getByText("Dev Token")).toBeInTheDocument();
    });

    expect(screen.getByText("nkan_abc1...")).toBeInTheDocument();
  });

  it("shows empty state", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<ApiTokenSection userId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText("No API tokens yet.")).toBeInTheDocument();
    });
  });

  it("create dialog shows plaintext token after creation", async () => {
    const user = userEvent.setup();

    // Initial fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<ApiTokenSection userId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText("No API tokens yet.")).toBeInTheDocument();
    });

    // Open create dialog
    await user.click(screen.getByText("Create Token"));
    await user.type(screen.getByLabelText("Name"), "My New Token");

    // Mock POST response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "t3",
          name: "My New Token",
          prefix: "nkan_xyz9",
          plaintext: "nkan_realplaintexttoken",
          createdAt: new Date().toISOString(),
          expiresAt: null,
        }),
    });

    // Mock refetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ id: "t3", name: "My New Token", prefix: "nkan_xyz9", createdAt: new Date().toISOString(), lastUsedAt: null, expiresAt: null }]),
    });

    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(
        screen.getByText("Copy this token now. You won't be able to see it again.")
      ).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue("nkan_realplaintexttoken")).toBeInTheDocument();
  });

  it("shows plaintext token input after creation", async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<ApiTokenSection userId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText("No API tokens yet.")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Create Token"));
    await user.type(screen.getByLabelText("Name"), "Copy Test");

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "t4",
          name: "Copy Test",
          prefix: "nkan_copy",
          plaintext: "nkan_copytoken",
          createdAt: new Date().toISOString(),
          expiresAt: null,
        }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(screen.getByDisplayValue("nkan_copytoken")).toBeInTheDocument();
    });

    // Plaintext input is read-only
    const input = screen.getByDisplayValue("nkan_copytoken");
    expect(input).toHaveAttribute("readOnly");
  });

  it("revoke shows confirmation dialog", async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(tokens),
    });

    render(<ApiTokenSection userId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText("CI Token")).toBeInTheDocument();
    });

    // Click the first revoke button (trash icon)
    const revokeButtons = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector("svg.lucide-trash-2")
    );
    await user.click(revokeButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Revoke Token")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Any applications using this token will lose access immediately/)
    ).toBeInTheDocument();
  });
});
