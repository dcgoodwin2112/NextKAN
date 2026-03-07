import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OrgFilterBar } from "./OrgFilterBar";

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

describe("OrgFilterBar", () => {
  it("renders sort dropdown", () => {
    render(<OrgFilterBar />);
    expect(screen.getByLabelText("Sort")).toBeInTheDocument();
  });

  it("reads initial values from URL params", () => {
    mockSearchParams.current = new URLSearchParams("sort=name_desc");
    render(<OrgFilterBar />);
    expect((screen.getByLabelText("Sort") as HTMLSelectElement).value).toBe("name_desc");
  });

  it("navigates with updated params on sort change", async () => {
    const user = userEvent.setup();
    render(<OrgFilterBar />);

    await user.selectOptions(screen.getByLabelText("Sort"), "created_desc");

    const pushedUrl = mockPush.mock.calls[0][0] as string;
    const params = new URLSearchParams(pushedUrl.split("?")[1]);
    expect(params.get("sort")).toBe("created_desc");
  });

  it("clears page param when sort changes", async () => {
    mockSearchParams.current = new URLSearchParams("page=3&search=test");
    const user = userEvent.setup();
    render(<OrgFilterBar />);

    await user.selectOptions(screen.getByLabelText("Sort"), "datasets_desc");

    const pushedUrl = mockPush.mock.calls[0][0] as string;
    const params = new URLSearchParams(pushedUrl.split("?")[1]);
    expect(params.has("page")).toBe(false);
    expect(params.get("search")).toBe("test");
    expect(params.get("sort")).toBe("datasets_desc");
  });

  it("shows clear button when filters are active", () => {
    mockSearchParams.current = new URLSearchParams("sort=name_desc");
    render(<OrgFilterBar />);
    expect(screen.getByRole("button", { name: /clear filters/i })).toBeInTheDocument();
  });

  it("hides clear button when no filters active", () => {
    render(<OrgFilterBar />);
    expect(screen.queryByRole("button", { name: /clear filters/i })).not.toBeInTheDocument();
  });

  it("clear button resets to /admin/organizations", async () => {
    mockSearchParams.current = new URLSearchParams("sort=name_desc&search=test");
    const user = userEvent.setup();
    render(<OrgFilterBar />);

    await user.click(screen.getByRole("button", { name: /clear filters/i }));

    expect(mockPush).toHaveBeenCalledWith("/admin/organizations");
  });
});
