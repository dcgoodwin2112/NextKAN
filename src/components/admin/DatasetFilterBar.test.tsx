import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DatasetFilterBar } from "./DatasetFilterBar";

const mockPush = vi.fn();
const mockSearchParams = vi.hoisted(() => ({
  current: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams.current,
}));

const orgs = [
  { id: "org-1", name: "Org One" },
  { id: "org-2", name: "Org Two" },
];

beforeEach(() => {
  mockPush.mockClear();
  mockSearchParams.current = new URLSearchParams();
});

describe("DatasetFilterBar", () => {
  it("renders status, org, and sort dropdowns", () => {
    render(<DatasetFilterBar organizations={orgs} />);
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
    expect(screen.getByLabelText("Organization")).toBeInTheDocument();
    expect(screen.getByLabelText("Sort")).toBeInTheDocument();
  });

  it("reads initial values from URL params", () => {
    mockSearchParams.current = new URLSearchParams("status=draft&org=org-1&sort=title_asc");
    render(<DatasetFilterBar organizations={orgs} />);
    expect((screen.getByLabelText("Status") as HTMLSelectElement).value).toBe("draft");
    expect((screen.getByLabelText("Organization") as HTMLSelectElement).value).toBe("org-1");
    expect((screen.getByLabelText("Sort") as HTMLSelectElement).value).toBe("title_asc");
  });

  it("navigates with updated params on status change", async () => {
    const user = userEvent.setup();
    render(<DatasetFilterBar organizations={orgs} />);

    await user.selectOptions(screen.getByLabelText("Status"), "published");

    const pushedUrl = mockPush.mock.calls[0][0] as string;
    const params = new URLSearchParams(pushedUrl.split("?")[1]);
    expect(params.get("status")).toBe("published");
  });

  it("navigates with updated params on org change", async () => {
    const user = userEvent.setup();
    render(<DatasetFilterBar organizations={orgs} />);

    await user.selectOptions(screen.getByLabelText("Organization"), "org-2");

    const pushedUrl = mockPush.mock.calls[0][0] as string;
    const params = new URLSearchParams(pushedUrl.split("?")[1]);
    expect(params.get("org")).toBe("org-2");
  });

  it("navigates with updated params on sort change", async () => {
    const user = userEvent.setup();
    render(<DatasetFilterBar organizations={orgs} />);

    await user.selectOptions(screen.getByLabelText("Sort"), "title_desc");

    const pushedUrl = mockPush.mock.calls[0][0] as string;
    const params = new URLSearchParams(pushedUrl.split("?")[1]);
    expect(params.get("sort")).toBe("title_desc");
  });

  it("clears page param when filter changes", async () => {
    mockSearchParams.current = new URLSearchParams("page=3&search=test");
    const user = userEvent.setup();
    render(<DatasetFilterBar organizations={orgs} />);

    await user.selectOptions(screen.getByLabelText("Status"), "draft");

    const pushedUrl = mockPush.mock.calls[0][0] as string;
    const params = new URLSearchParams(pushedUrl.split("?")[1]);
    expect(params.has("page")).toBe(false);
    expect(params.get("search")).toBe("test");
    expect(params.get("status")).toBe("draft");
  });

  it("shows clear button when filters are active", () => {
    mockSearchParams.current = new URLSearchParams("status=draft");
    render(<DatasetFilterBar organizations={orgs} />);
    expect(screen.getByRole("button", { name: /clear filters/i })).toBeInTheDocument();
  });

  it("hides clear button when no filters active", () => {
    render(<DatasetFilterBar organizations={orgs} />);
    expect(screen.queryByRole("button", { name: /clear filters/i })).not.toBeInTheDocument();
  });

  it("clear button resets to /admin/datasets", async () => {
    mockSearchParams.current = new URLSearchParams("status=draft&search=test");
    const user = userEvent.setup();
    render(<DatasetFilterBar organizations={orgs} />);

    await user.click(screen.getByRole("button", { name: /clear filters/i }));

    expect(mockPush).toHaveBeenCalledWith("/admin/datasets");
  });
});
