import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ViewToggle } from "./ViewToggle";

const mockPush = vi.fn();
const mockSearchParams = vi.hoisted(() => ({
  current: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams.current,
}));

beforeEach(() => {
  mockPush.mockClear();
  mockSearchParams.current = new URLSearchParams();
});

describe("ViewToggle", () => {
  it("renders grid and list buttons", () => {
    render(<ViewToggle basePath="/admin/datasets" />);
    expect(screen.getByLabelText("Grid view")).toBeInTheDocument();
    expect(screen.getByLabelText("List view")).toBeInTheDocument();
  });

  it("grid is active by default (no view param)", () => {
    render(<ViewToggle basePath="/admin/datasets" />);
    expect(screen.getByLabelText("Grid view")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("List view")).toHaveAttribute("aria-pressed", "false");
  });

  it("list is active when view=list in URL", () => {
    mockSearchParams.current = new URLSearchParams("view=list");
    render(<ViewToggle basePath="/admin/datasets" />);
    expect(screen.getByLabelText("List view")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Grid view")).toHaveAttribute("aria-pressed", "false");
  });

  it("clicking list navigates with view=list", async () => {
    const user = userEvent.setup();
    render(<ViewToggle basePath="/admin/datasets" />);

    await user.click(screen.getByLabelText("List view"));

    const pushedUrl = mockPush.mock.calls[0][0] as string;
    const params = new URLSearchParams(pushedUrl.split("?")[1]);
    expect(params.get("view")).toBe("list");
  });

  it("clicking grid removes view param", async () => {
    mockSearchParams.current = new URLSearchParams("view=list");
    const user = userEvent.setup();
    render(<ViewToggle basePath="/admin/datasets" />);

    await user.click(screen.getByLabelText("Grid view"));

    expect(mockPush).toHaveBeenCalledWith("/admin/datasets");
  });

  it("preserves existing params when toggling", async () => {
    mockSearchParams.current = new URLSearchParams("search=test&status=draft&page=2");
    const user = userEvent.setup();
    render(<ViewToggle basePath="/admin/datasets" />);

    await user.click(screen.getByLabelText("List view"));

    const pushedUrl = mockPush.mock.calls[0][0] as string;
    const params = new URLSearchParams(pushedUrl.split("?")[1]);
    expect(params.get("view")).toBe("list");
    expect(params.get("search")).toBe("test");
    expect(params.get("status")).toBe("draft");
    expect(params.get("page")).toBe("2");
  });
});
