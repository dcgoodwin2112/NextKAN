import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommentFilterBar } from "./CommentFilterBar";

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

describe("CommentFilterBar", () => {
  it("renders status and sort dropdowns", () => {
    render(<CommentFilterBar />);
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
    expect(screen.getByLabelText("Sort")).toBeInTheDocument();
  });

  it("reads initial values from URL params", () => {
    mockSearchParams.current = new URLSearchParams("status=approved&sort=created_asc");
    render(<CommentFilterBar />);
    expect((screen.getByLabelText("Status") as HTMLSelectElement).value).toBe("approved");
    expect((screen.getByLabelText("Sort") as HTMLSelectElement).value).toBe("created_asc");
  });

  it("navigates with updated params on status change", async () => {
    const user = userEvent.setup();
    render(<CommentFilterBar />);

    await user.selectOptions(screen.getByLabelText("Status"), "all");

    const pushedUrl = mockPush.mock.calls[0][0] as string;
    const params = new URLSearchParams(pushedUrl.split("?")[1]);
    expect(params.get("status")).toBe("all");
  });

  it("clears page param when filter changes", async () => {
    mockSearchParams.current = new URLSearchParams("page=3&search=test");
    const user = userEvent.setup();
    render(<CommentFilterBar />);

    await user.selectOptions(screen.getByLabelText("Sort"), "created_asc");

    const pushedUrl = mockPush.mock.calls[0][0] as string;
    const params = new URLSearchParams(pushedUrl.split("?")[1]);
    expect(params.has("page")).toBe(false);
    expect(params.get("search")).toBe("test");
    expect(params.get("sort")).toBe("created_asc");
  });

  it("shows clear button when filters are active", () => {
    mockSearchParams.current = new URLSearchParams("status=approved");
    render(<CommentFilterBar />);
    expect(screen.getByRole("button", { name: /clear filters/i })).toBeInTheDocument();
  });

  it("hides clear button when no filters active", () => {
    render(<CommentFilterBar />);
    expect(screen.queryByRole("button", { name: /clear filters/i })).not.toBeInTheDocument();
  });

  it("clear button resets to /admin/comments", async () => {
    mockSearchParams.current = new URLSearchParams("status=all&search=test");
    const user = userEvent.setup();
    render(<CommentFilterBar />);

    await user.click(screen.getByRole("button", { name: /clear filters/i }));

    expect(mockPush).toHaveBeenCalledWith("/admin/comments");
  });
});
