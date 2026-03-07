import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserFilterBar } from "./UserFilterBar";

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

describe("UserFilterBar", () => {
  it("renders role, org, and sort dropdowns", () => {
    render(<UserFilterBar organizations={orgs} />);
    expect(screen.getByLabelText("Role")).toBeInTheDocument();
    expect(screen.getByLabelText("Organization")).toBeInTheDocument();
    expect(screen.getByLabelText("Sort")).toBeInTheDocument();
  });

  it("reads initial values from URL params", () => {
    mockSearchParams.current = new URLSearchParams("role=admin&org=org-1&sort=name_asc");
    render(<UserFilterBar organizations={orgs} />);
    expect((screen.getByLabelText("Role") as HTMLSelectElement).value).toBe("admin");
    expect((screen.getByLabelText("Organization") as HTMLSelectElement).value).toBe("org-1");
    expect((screen.getByLabelText("Sort") as HTMLSelectElement).value).toBe("name_asc");
  });

  it("navigates with updated params on role change", async () => {
    const user = userEvent.setup();
    render(<UserFilterBar organizations={orgs} />);

    await user.selectOptions(screen.getByLabelText("Role"), "editor");

    const pushedUrl = mockPush.mock.calls[0][0] as string;
    const params = new URLSearchParams(pushedUrl.split("?")[1]);
    expect(params.get("role")).toBe("editor");
  });

  it("navigates with updated params on org change", async () => {
    const user = userEvent.setup();
    render(<UserFilterBar organizations={orgs} />);

    await user.selectOptions(screen.getByLabelText("Organization"), "org-2");

    const pushedUrl = mockPush.mock.calls[0][0] as string;
    const params = new URLSearchParams(pushedUrl.split("?")[1]);
    expect(params.get("org")).toBe("org-2");
  });

  it("clears page param when filter changes", async () => {
    mockSearchParams.current = new URLSearchParams("page=3&search=test");
    const user = userEvent.setup();
    render(<UserFilterBar organizations={orgs} />);

    await user.selectOptions(screen.getByLabelText("Role"), "admin");

    const pushedUrl = mockPush.mock.calls[0][0] as string;
    const params = new URLSearchParams(pushedUrl.split("?")[1]);
    expect(params.has("page")).toBe(false);
    expect(params.get("search")).toBe("test");
    expect(params.get("role")).toBe("admin");
  });

  it("shows clear button when filters are active", () => {
    mockSearchParams.current = new URLSearchParams("role=admin");
    render(<UserFilterBar organizations={orgs} />);
    expect(screen.getByRole("button", { name: /clear filters/i })).toBeInTheDocument();
  });

  it("hides clear button when no filters active", () => {
    render(<UserFilterBar organizations={orgs} />);
    expect(screen.queryByRole("button", { name: /clear filters/i })).not.toBeInTheDocument();
  });

  it("clear button resets to /admin/users", async () => {
    mockSearchParams.current = new URLSearchParams("role=admin&search=test");
    const user = userEvent.setup();
    render(<UserFilterBar organizations={orgs} />);

    await user.click(screen.getByRole("button", { name: /clear filters/i }));

    expect(mockPush).toHaveBeenCalledWith("/admin/users");
  });
});
