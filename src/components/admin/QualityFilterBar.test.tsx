import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QualityFilterBar } from "./QualityFilterBar";

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

describe("QualityFilterBar", () => {
  it("renders score, org, and sort dropdowns", () => {
    render(<QualityFilterBar organizations={orgs} />);
    expect(screen.getByLabelText("Score Range")).toBeInTheDocument();
    expect(screen.getByLabelText("Organization")).toBeInTheDocument();
    expect(screen.getByLabelText("Sort")).toBeInTheDocument();
  });

  it("reads initial values from URL params", () => {
    mockSearchParams.current = new URLSearchParams("score=good&org=org-1&sort=name_asc");
    render(<QualityFilterBar organizations={orgs} />);
    expect((screen.getByLabelText("Score Range") as HTMLSelectElement).value).toBe("good");
    expect((screen.getByLabelText("Organization") as HTMLSelectElement).value).toBe("org-1");
    expect((screen.getByLabelText("Sort") as HTMLSelectElement).value).toBe("name_asc");
  });

  it("navigates with updated params on score change", async () => {
    const user = userEvent.setup();
    render(<QualityFilterBar organizations={orgs} />);

    await user.selectOptions(screen.getByLabelText("Score Range"), "poor");

    const pushedUrl = mockPush.mock.calls[0][0] as string;
    const params = new URLSearchParams(pushedUrl.split("?")[1]);
    expect(params.get("score")).toBe("poor");
  });

  it("navigates with updated params on org change", async () => {
    const user = userEvent.setup();
    render(<QualityFilterBar organizations={orgs} />);

    await user.selectOptions(screen.getByLabelText("Organization"), "org-2");

    const pushedUrl = mockPush.mock.calls[0][0] as string;
    const params = new URLSearchParams(pushedUrl.split("?")[1]);
    expect(params.get("org")).toBe("org-2");
  });

  it("clears page param when filter changes", async () => {
    mockSearchParams.current = new URLSearchParams("page=3&search=test");
    const user = userEvent.setup();
    render(<QualityFilterBar organizations={orgs} />);

    await user.selectOptions(screen.getByLabelText("Sort"), "score_desc");

    const pushedUrl = mockPush.mock.calls[0][0] as string;
    const params = new URLSearchParams(pushedUrl.split("?")[1]);
    expect(params.has("page")).toBe(false);
    expect(params.get("search")).toBe("test");
    expect(params.get("sort")).toBe("score_desc");
  });

  it("shows clear button when filters are active", () => {
    mockSearchParams.current = new URLSearchParams("score=fair");
    render(<QualityFilterBar organizations={orgs} />);
    expect(screen.getByRole("button", { name: /clear filters/i })).toBeInTheDocument();
  });

  it("hides clear button when no filters active", () => {
    render(<QualityFilterBar organizations={orgs} />);
    expect(screen.queryByRole("button", { name: /clear filters/i })).not.toBeInTheDocument();
  });

  it("clear button resets to /admin/quality", async () => {
    mockSearchParams.current = new URLSearchParams("score=poor&search=test");
    const user = userEvent.setup();
    render(<QualityFilterBar organizations={orgs} />);

    await user.click(screen.getByRole("button", { name: /clear filters/i }));

    expect(mockPush).toHaveBeenCalledWith("/admin/quality");
  });
});
